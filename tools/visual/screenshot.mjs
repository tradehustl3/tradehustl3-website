// Full-page screenshots through Chrome's DevTools protocol, with no npm
// dependencies (uses the Chrome already on CI runners).
// Usage: node tools/visual/screenshot.mjs <baseUrl> <outDir> <page.html>...
// Env: CHROME_BIN (default google-chrome).
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const [baseUrl, outDir, ...pages] = process.argv.slice(2);
if (!baseUrl || !outDir || pages.length === 0) {
  console.error("usage: screenshot.mjs <baseUrl> <outDir> <page.html>...");
  process.exit(2);
}

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
  { name: "tablet", width: 768, height: 1024, deviceScaleFactor: 1, mobile: false },
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
];
const PORT = 9300 + Math.floor(Math.random() * 500);

const chrome = spawn(process.env.CHROME_BIN || "google-chrome", [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, "--user-data-dir=/tmp/visual-snapshot-chrome", "about:blank",
], { stdio: ["ignore", "ignore", "inherit"] });
let chromeExit = null;
chrome.on("exit", (code) => { chromeExit = code; });

async function target() {
  for (let i = 0; i < 150; i += 1) {
    if (chromeExit !== null) throw new Error(`Chrome exited with code ${chromeExit}`);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* Chrome still starting */ }
    await sleep(200);
  }
  throw new Error("Chrome did not start");
}

const socket = new WebSocket(await target());
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const pending = new Map();
const listeners = new Set();
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
  } else if (message.method) {
    for (const listener of listeners) listener(message);
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const once = (method) => new Promise((resolve) => {
  const listener = (message) => { if (message.method === method) { listeners.delete(listener); resolve(message); } };
  listeners.add(listener);
});

await send("Page.enable");
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await mkdir(outDir, { recursive: true });
try {
  for (const page of pages) {
    for (const viewport of VIEWPORTS) {
      await send("Emulation.setDeviceMetricsOverride", viewport);
      const loaded = once("Page.loadEventFired");
      await send("Page.navigate", { url: new URL(page, baseUrl).href });
      await loaded;
      await send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
      // Full-page captures never scroll, so lazy images would stay blank.
      await send("Runtime.evaluate", {
        expression: `Promise.all([...document.images].map((img) => { img.loading = "eager";
          return img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; setTimeout(r, 5000); }); }))`,
        awaitPromise: true,
      });
      // Scroll through once so off-screen images are decoded and painted.
      await send("Runtime.evaluate", {
        expression: `(async () => { for (let y = 0; y < document.body.scrollHeight; y += innerHeight) {
          scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); })()`,
        awaitPromise: true,
      });
      await sleep(800);
      // Preserve inspectable evidence at each requested width, even when the
      // reviewer cannot connect an interactive browser to the build.
      const diagnostics = await send("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          const skip = document.querySelector('a[href="#main-content"]');
          if (skip) { skip.focus(); skip.click(); }
          const skipReachedContent = skip ? document.activeElement?.id === 'main-content' : null;
          document.activeElement?.blur(); scrollTo(0, 0);
          const footer = document.querySelector('footer[data-site-footer]');
          return {
            viewport: { width: innerWidth, height: innerHeight },
            documentWidth: document.documentElement.scrollWidth,
            horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
            skipReachedContent,
            footerFont: footer ? getComputedStyle(footer).fontFamily : null,
            loadedFonts: [...document.fonts].filter(font => font.status === 'loaded').map(font => font.family),
          };
        })()`,
      });
      await writeFile(join(outDir, `${page.replace(/\.html$/, "")}-${viewport.name}.json`),
        JSON.stringify(diagnostics.result.value, null, 2) + "\n");
      const { cssContentSize } = await send("Page.getLayoutMetrics");
      const height = Math.min(Math.ceil(cssContentSize.height), 16000);
      const { data } = await send("Page.captureScreenshot", {
        format: "png", captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: viewport.width, height, scale: 1 },
      });
      const file = join(outDir, `${page.replace(/\.html$/, "")}-${viewport.name}.png`);
      await writeFile(file, Buffer.from(data, "base64"));
      // A smaller review copy remains easy to inspect through GitHub's file API.
      const preview = await send("Page.captureScreenshot", {
        format: "jpeg", quality: 72, captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: viewport.width, height, scale: 1 },
      });
      await writeFile(file.replace(/\.png$/, ".jpg"), Buffer.from(preview.data, "base64"));
      console.log(`${file} (${viewport.width}x${height})`);
    }
  }
} finally {
  socket.close();
  chrome.kill();
}

