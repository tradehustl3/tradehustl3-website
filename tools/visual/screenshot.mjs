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
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
];
const PORT = 9300 + Math.floor(Math.random() * 500);

const chrome = spawn(process.env.CHROME_BIN || "google-chrome", [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, "--user-data-dir=/tmp/visual-snapshot-chrome", "about:blank",
], { stdio: "ignore" });

async function target() {
  for (let i = 0; i < 50; i += 1) {
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
      await sleep(800);
      const { cssContentSize } = await send("Page.getLayoutMetrics");
      const height = Math.min(Math.ceil(cssContentSize.height), 16000);
      const { data } = await send("Page.captureScreenshot", {
        format: "png", captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: viewport.width, height, scale: 1 },
      });
      const file = join(outDir, `${page.replace(/\.html$/, "")}-${viewport.name}.png`);
      await writeFile(file, Buffer.from(data, "base64"));
      console.log(`${file} (${viewport.width}x${height})`);
    }
  }
} finally {
  socket.close();
  chrome.kill();
}
