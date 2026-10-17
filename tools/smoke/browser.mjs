/**
 * Minimal headless Chrome driver for the production smoke runner.
 *
 * Speaks the Chrome DevTools Protocol over --remote-debugging-pipe, so there is
 * no npm dependency, no open debugging port, and nothing to download: it uses a
 * Chrome or Chromium already on the machine (GitHub's ubuntu runners ship
 * Google Chrome). Set SMOKE_CHROME_PATH to pick a specific binary.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

export class BrowserUnavailable extends Error {}

const BINARY_NAMES = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"];

export function findChrome(env = process.env) {
  if (env.SMOKE_CHROME_PATH) {
    if (!existsSync(env.SMOKE_CHROME_PATH)) throw new BrowserUnavailable(`SMOKE_CHROME_PATH does not exist: ${env.SMOKE_CHROME_PATH}`);
    return env.SMOKE_CHROME_PATH;
  }
  for (const dir of (env.PATH || "").split(delimiter).filter(Boolean)) {
    for (const name of BINARY_NAMES) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
  }
  // Playwright-managed Chromium (this repo's cloud dev containers).
  const managed = env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  if (existsSync(managed)) {
    for (const entry of readdirSync(managed).filter((name) => /^chromium-\d+$/.test(name)).sort().reverse()) {
      const candidate = join(managed, entry, "chrome-linux", "chrome");
      if (existsSync(candidate)) return candidate;
    }
  }
  const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(mac)) return mac;
  return null;
}

/** Launches headless Chrome and returns a CDP client bound to it. */
export async function launchChrome({ chromePath = findChrome(), timeoutMs = 20_000 } = {}) {
  if (!chromePath) throw new BrowserUnavailable("no Chrome or Chromium binary found (set SMOKE_CHROME_PATH)");
  const profile = mkdtempSync(join(tmpdir(), "th3-smoke-chrome-"));
  const args = [
    "--headless=new",
    "--remote-debugging-pipe",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--disable-gpu",
    "--mute-audio",
    "--hide-scrollbars",
    "--password-store=basic",
    // Chrome refuses to start its sandbox as root (containers). Runners are not root.
    ...(process.getuid?.() === 0 ? ["--no-sandbox"] : []),
    "about:blank",
  ];
  const child = spawn(chromePath, args, { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr = (stderr + chunk).slice(-2000); });

  const pending = new Map();
  const listeners = new Set();
  let nextId = 1;
  let buffer = "";
  let exited = false;
  const writer = child.stdio[3];
  const reader = child.stdio[4];

  reader.setEncoding("utf8");
  reader.on("data", (chunk) => {
    buffer += chunk;
    let end;
    while ((end = buffer.indexOf("\0")) !== -1) {
      const message = JSON.parse(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
        else resolve(message.result);
      } else if (message.method) {
        for (const listener of listeners) listener(message);
      }
    }
  });

  const exitedPromise = new Promise((resolve) => {
    child.on("exit", () => {
      exited = true;
      for (const { reject } of pending.values()) reject(new BrowserUnavailable("Chrome exited"));
      pending.clear();
      resolve();
    });
    child.on("error", (error) => {
      exited = true;
      for (const { reject } of pending.values()) reject(new BrowserUnavailable(`Chrome failed to start: ${error.message}`));
      pending.clear();
      resolve();
    });
  });

  function send(method, params = {}, sessionId) {
    if (exited) return Promise.reject(new BrowserUnavailable("Chrome is not running"));
    const id = nextId++;
    const message = { id, method, params, ...(sessionId ? { sessionId } : {}) };
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      writer.write(`${JSON.stringify(message)}\0`);
    });
  }

  async function close() {
    if (!exited) {
      await Promise.race([send("Browser.close").catch(() => {}), new Promise((resolve) => setTimeout(resolve, 3000))]);
      if (!exited) child.kill("SIGKILL");
      await exitedPromise;
    }
    // Chrome's helper processes can still be flushing the profile; best effort.
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); } catch { /* temp dir */ }
  }

  try {
    await Promise.race([
      send("Browser.getVersion"),
      new Promise((_, reject) => setTimeout(() => reject(new BrowserUnavailable(`Chrome did not respond within ${timeoutMs} ms`)), timeoutMs)),
    ]);
  } catch (error) {
    await close();
    if (error instanceof BrowserUnavailable) {
      throw new BrowserUnavailable(`${error.message}${stderr ? ` — ${stderr.trim().split("\n").pop()}` : ""}`);
    }
    throw new BrowserUnavailable(`Chrome did not start: ${error.message}`);
  }

  return {
    send,
    close,
    on(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    /** Opens a new tab and returns a session-scoped `send`. */
    async newPage() {
      const { targetId } = await send("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
      return {
        sessionId,
        send: (method, params) => send(method, params, sessionId),
        on: (method, handler) => {
          const listener = (message) => { if (message.sessionId === sessionId && message.method === method) handler(message.params); };
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        close: () => send("Target.closeTarget", { targetId }).catch(() => {}),
      };
    },
  };
}
