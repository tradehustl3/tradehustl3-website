import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// The full TRADE HUSTL3 logo PNG is ~2.6 MB. It once served as the favicon,
// the structured-data logo, and a 56–68px header logo (images are unoptimized),
// so every visitor downloaded it. These checks keep the small icons small.

const publicDir = new URL("../public/", import.meta.url);
const appDir = fileURLToPath(new URL("../app/", import.meta.url));

const ICONS = {
  "favicon.ico": { maxBytes: 16 * 1024, sizes: [16, 32, 48] },
  "favicon-32x32.png": { maxBytes: 8 * 1024, size: 32 },
  "apple-touch-icon.png": { maxBytes: 40 * 1024, size: 180 },
  "icon-192.png": { maxBytes: 16 * 1024, size: 192 },
  "icon-512.png": { maxBytes: 64 * 1024, size: 512 },
  "icon-maskable-512.png": { maxBytes: 64 * 1024, size: 512 },
  "optimized/trade-hustl3-logo-512.webp": { maxBytes: 160 * 1024, size: 512 },
  "optimized/trade-hustl3-logo.webp": { maxBytes: 16 * 1024, size: 96 },
  "optimized/resume-builder-logo-512.webp": { maxBytes: 64 * 1024, size: 512 },
  "optimized/th3-logo-header.webp": { maxBytes: 40 * 1024 },
  "favicon.svg": { maxBytes: 4 * 1024 },
};

function pngSize(buf) {
  assert.equal(buf.toString("ascii", 1, 4), "PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function webpSize(buf) {
  assert.equal(buf.toString("ascii", 8, 12), "WEBP");
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  if (chunk === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  throw new Error(`Unknown WebP chunk ${chunk}`);
}

function icoSizes(buf) {
  assert.equal(buf.readUInt16LE(2), 1, "ICO type");
  const sizes = [];
  for (let i = 0; i < buf.readUInt16LE(4); i++) sizes.push(buf[6 + i * 16] || 256);
  return sizes.sort((a, b) => a - b);
}

test("brand icons exist at their intended pixel sizes and stay within byte budgets", async () => {
  for (const [path, spec] of Object.entries(ICONS)) {
    const url = new URL(path, publicDir);
    const { size } = await stat(url);
    assert.ok(size <= spec.maxBytes, `${path} is ${size} bytes; budget ${spec.maxBytes}`);
    const buf = await readFile(url);
    if (path.endsWith(".ico")) assert.deepEqual(icoSizes(buf), spec.sizes, `${path} sizes`);
    if (spec.size) {
      const dims = path.endsWith(".png") ? pngSize(buf) : path.endsWith(".webp") ? webpSize(buf) : null;
      if (dims) assert.deepEqual(dims, { width: spec.size, height: spec.size }, `${path} dimensions`);
    }
  }
});

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries.filter((entry) => entry.isFile() && /\.(tsx?|css)$/.test(entry.name)).map((entry) => join(entry.parentPath, entry.name));
}

test("app source never ships the multi-megabyte logo PNGs", async () => {
  const heavy = /\/(trade-hustl3-logo|trade-hustl3-logo-llc|trade-hustl3-resume-builder-logo|trade-hustl3-resume-builder-logo-llc)\.png/;
  for (const file of await sourceFiles(appDir)) {
    const text = await readFile(file, "utf8");
    assert.doesNotMatch(text, heavy, `${file} references a full-size logo PNG`);
  }
});

async function renderPath(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const worker = (await import(workerUrl.href)).default;
  const response = await worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  return response.text();
}

test("rendered head links the small browser and Apple icons", async () => {
  const html = await renderPath("/");
  const links = html.match(/<link[^>]+rel="(?:shortcut )?icon"[^>]*>|<link[^>]+rel="apple-touch-icon"[^>]*>/g) ?? [];
  const hrefs = links.map((tag) => tag.match(/href="([^"]+)"/)[1]);
  assert.ok(hrefs.includes("/favicon.ico"), `favicon.ico linked: ${hrefs}`);
  assert.ok(hrefs.includes("/favicon-32x32.png"), `32px PNG linked: ${hrefs}`);
  assert.ok(hrefs.includes("/apple-touch-icon.png"), `apple-touch-icon linked: ${hrefs}`);
  assert.match(html, /<link[^>]+rel="apple-touch-icon"[^>]+sizes="180x180"/);
  assert.match(html, /<link[^>]+rel="mask-icon"[^>]+href="\/favicon\.svg"/);
  for (const href of hrefs) assert.ok(href in ICONS || href.slice(1) in ICONS, `${href} has a size budget`);
  assert.match(html, /<link[^>]+rel="manifest"[^>]+href="\/site\.webmanifest"/);
});

test("web manifest lists home-screen icons that exist at their declared sizes", async () => {
  const manifest = JSON.parse(await readFile(new URL("site.webmanifest", publicDir), "utf8"));
  assert.equal(manifest.name, "TRADE HUSTL3");
  assert.deepEqual(manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose}`),
    ["192x192 any", "512x512 any", "512x512 maskable"]);
  // A maskable icon is cropped by the launcher, so it must be full-bleed (no transparent corners)
  // and kept separate from the "any" icons, which keep their rounded corners.
  const maskable = await readFile(new URL("icon-maskable-512.png", publicDir));
  assert.equal(maskable[25] & 4, 0, "maskable icon has no alpha channel");
  assert.equal(maskable.indexOf("tRNS"), -1, "maskable icon has no transparent palette entries");
  for (const icon of manifest.icons) {
    const path = icon.src.slice(1);
    assert.ok(path in ICONS, `${icon.src} has a size budget`);
    const size = Number(icon.sizes.split("x")[0]);
    assert.deepEqual(pngSize(await readFile(new URL(path, publicDir))), { width: size, height: size });
  }
});

test("favicon assets carry no outdated tagline or misspelled brand text", async () => {
  // The small icons are a TH3 monogram, not text; only the SVG has a readable title.
  const svg = await readFile(new URL("favicon.svg", publicDir), "utf8");
  assert.doesNotMatch(svg, /<text\b/, "favicon.svg draws its letters as paths, independent of installed fonts");
  assert.match(svg, /<title>TRADE HUSTL3<\/title>/);
  assert.doesNotMatch(svg, /HUSTLE|TRADES/i);
});

test("structured-data logo points at the 512px WebP with matching dimensions", async () => {
  const html = await renderPath("/");
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  const graph = JSON.parse(json)["@graph"];
  const org = graph.find((node) => node["@type"] === "Organization");
  assert.deepEqual(org.logo, {
    "@type": "ImageObject",
    url: "https://tradehustl3.com/optimized/resume-builder-logo-512.webp",
    width: 512,
    height: 512,
  });
});

test("every branded page header carries the TH3 logo and ENTER • EARN • ELEVATE", async () => {
  for (const pathname of ["/", "/book", "/book/sample", "/top-10-trades", "/resume-examples", "/resources", "/resources/certifications", "/privacy", "/terms"]) {
    const html = await renderPath(pathname);
    const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
    assert.match(header, /optimized\/th3-logo-header\.webp/, `${pathname} TH3 logo`);
    assert.match(header, /ENTER • EARN • ELEVATE/, `${pathname} brand message`);
    assert.doesNotMatch(html, /trade-hustl3-logo\.png/, `${pathname} full-size logo PNG`);
  }
});
