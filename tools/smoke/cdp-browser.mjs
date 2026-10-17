/**
 * Minimal headless Chrome driver over the DevTools protocol for the smoke runner.
 *
 * Uses Node's built-in WebSocket and a locally installed Chrome/Chromium, so the
 * production smoke job needs no browser dependency (it installs production
 * dependencies only). GitHub's ubuntu runners ship Google Chrome.
 *
 * Env: SMOKE_CHROME_PATH overrides browser discovery.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export class BrowserUnavailable extends Error {}

export function findChrome() {
  const fromEnv = process.env.SMOKE_CHROME_PATH;
  if (fromEnv) return existsSync(fromEnv) ? fromEnv : null;
  const candidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  // Playwright's browser cache, when present (local development containers).
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (cache && existsSync(cache)) {
    for (const entry of readdirSync(cache).filter((name) => /^chromium-\d+$/.test(name)).sort().reverse()) {
      candidates.push(join(cache, entry, "chrome-linux", "chrome"));
    }
  }
  return candidates.find((path) => existsSync(path)) ?? null;
}

/** Launches a throwaway headless profile and returns a protocol client. */
export async function launchBrowser(executable, { timeoutMs = 20_000 } = {}) {
  if (typeof WebSocket !== "function") throw new BrowserUnavailable("this Node.js has no built-in WebSocket (Node 22+ required)");
  const profile = mkdtempSync(join(tmpdir(), "th3-smoke-chrome-"));
  const args = [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-sync",
    "--disable-background-networking", "--disable-component-update", "--window-size=1280,1600",
  ];
  // Chrome refuses its sandbox as root (containers); CI runners are not root.
  if (process.getuid?.() === 0) args.push("--no-sandbox");
  const child = spawn(executable, [...args, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const exited = new Promise((resolve) => child.once("exit", resolve));
  const cleanup = async () => {
    if (child.exitCode === null && child.signalCode === null) {
      // Give Chrome a moment to exit on its own after Browser.close, then force it.
      const timer = setTimeout(() => child.kill("SIGKILL"), 3_000);
      await exited;
      clearTimeout(timer);
    }
    // Best effort: a leftover temp profile must never fail the smoke run.
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch { /* ignore */ }
  };

  let endpoint;
  try {
    endpoint = await new Promise((resolve, reject) => {
      let output = "";
      const timer = setTimeout(() => reject(new BrowserUnavailable("browser did not start in time")), timeoutMs);
      child.stderr.on("data", (chunk) => {
        output += chunk;
        const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      child.once("error", () => { clearTimeout(timer); reject(new BrowserUnavailable("browser could not be launched")); });
      child.once("exit", (code) => { clearTimeout(timer); reject(new BrowserUnavailable(`browser exited during startup (code ${code})`)); });
    });
  } catch (error) {
    child.kill("SIGKILL");
    await cleanup();
    throw error;
  }

  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new BrowserUnavailable("could not connect to the browser")), { once: true });
  }).catch(async (error) => { child.kill("SIGKILL"); await cleanup(); throw error; });

  let nextId = 0;
  const pending = new Map();
  const listeners = new Set();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id !== undefined) {
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) waiter?.reject(new Error(`${waiter.method}: ${message.error.message}`));
      else waiter?.resolve(message.result);
      return;
    }
    for (const listener of listeners) listener(message.method, message.params, message.sessionId);
  });
  socket.addEventListener("close", () => {
    for (const waiter of pending.values()) waiter.reject(new Error(`${waiter.method}: browser connection closed`));
    pending.clear();
  });

  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject, method });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

  return {
    send,
    /** Subscribes to protocol events; returns an unsubscribe function. */
    on(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async close() {
      await send("Browser.close").catch(() => {});
      socket.close();
      await cleanup();
    },
  };
}

/** Opens a page target and returns helpers bound to its session. */
export async function openPage(browser) {
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await browser.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params) => browser.send(method, params, sessionId);
  const on = (listener) => browser.on((method, params, eventSession) => { if (eventSession === sessionId) listener(method, params); });

  /** Evaluates a function in the page; arguments must be JSON-serializable. */
  async function evaluate(fn, ...args) {
    const { result, exceptionDetails } = await send("Runtime.evaluate", {
      expression: `(${fn})(...${JSON.stringify(args)})`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails) throw new Error(`page script failed: ${exceptionDetails.exception?.description?.split("\n")[0] ?? exceptionDetails.text}`);
    return result.value;
  }

  /** Polls `fn` in the page until it returns a truthy value. */
  async function waitFor(fn, { timeoutMs = 30_000, intervalMs = 250, args = [] } = {}) {
    const deadline = Date.now() + timeoutMs;
    let last;
    while (Date.now() < deadline) {
      last = await evaluate(fn, ...args).catch(() => undefined);
      if (last) return last;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return null;
  }

  /**
   * Real mouse click at the center of the element `selector`. Returns false when the
   * element is missing or covered, so a click never silently lands on something else.
   */
  async function click(selector) {
    const point = await evaluate(async (css) => {
      const element = document.querySelector(css);
      if (!element) return null;
      // "instant" overrides the site's smooth scrolling so the box is final.
      element.scrollIntoView({ block: "center", behavior: "instant" });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const box = element.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      return element.contains(document.elementFromPoint(x, y)) ? { x, y } : null;
    }, selector);
    if (!point) return false;
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
      await send("Input.dispatchMouseEvent", { type, x: point.x, y: point.y, button: "left", clickCount: type === "mouseMoved" ? 0 : 1 });
    }
    return true;
  }

  return { send, on, evaluate, waitFor, click };
}
