import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Images are served unoptimized (next.config `images.unoptimized`), so the file
// a page references is exactly what a phone downloads. The Oct 22, 2026 audit
// found the lead-magnet and book pages shipping a 1.95 MB PNG, a 1.08 MB cover
// and a 395 KB portrait. Pages reference these compressed variants instead;
// the originals stay in /public for share cards, emails and existing links.

const publicDir = new URL("../public/", import.meta.url);
const appDir = new URL("../app/", import.meta.url);

const OPTIMIZED = {
  "optimized/top-trades-2026-2027-card.webp": { maxBytes: 140 * 1024, width: 960, height: 1200 },
  "optimized/trade-hustl3-book-cover.webp": { maxBytes: 260 * 1024, width: 720, height: 1080 },
  "optimized/trade-hustl3-book-cover-1024.webp": { maxBytes: 450 * 1024, width: 1024, height: 1536 },
  "optimized/zachary-ellis-author.webp": { maxBytes: 140 * 1024, width: 1020, height: 1275 },
  "optimized/hustl3-bot-official-720.webp": { maxBytes: 140 * 1024, width: 720, height: 900, alpha: true },
};

function webpInfo(buf) {
  assert.equal(buf.toString("ascii", 0, 4), "RIFF");
  assert.equal(buf.toString("ascii", 8, 12), "WEBP");
  assert.equal(buf.readUInt32LE(4) + 8, buf.length, "WebP payload must not be truncated");
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1, alpha: Boolean(buf[20] & 0x10) };
  }
  if (chunk === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, alpha: Boolean((bits >> 28) & 1) };
  }
  if (chunk === "VP8 ") {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff, alpha: false };
  }
  throw new Error(`Unknown WebP chunk ${chunk}`);
}

test("optimized page images are complete WebP files within their byte budgets", async () => {
  for (const [path, spec] of Object.entries(OPTIMIZED)) {
    const buf = await readFile(new URL(path, publicDir));
    assert.ok(buf.length <= spec.maxBytes, `${path} is ${buf.length} bytes; budget ${spec.maxBytes}`);
    const info = webpInfo(buf);
    assert.equal(info.width, spec.width, `${path} width`);
    assert.equal(info.height, spec.height, `${path} height`);
    if (spec.alpha) assert.ok(info.alpha, `${path} must keep its transparent background`);
  }
});

test("lead-magnet, book and builder pages render the compressed images, not the originals", async () => {
  const pages = {
    "top-10-trades/page.tsx": ["/optimized/top-trades-2026-2027-card.webp"],
    "book/page.tsx": ["/optimized/trade-hustl3-book-cover.webp", "/optimized/zachary-ellis-author.webp"],
    "book/sample/page.tsx": ["/optimized/trade-hustl3-book-cover.webp"],
    "book/sample/read/page.tsx": ["/optimized/trade-hustl3-book-cover-1024.webp"],
    "page.tsx": ["/optimized/hustl3-bot-official-720.webp"],
    "resume-builder/trade-landing.tsx": ["/optimized/hustl3-bot-official-720.webp"],
    "resume-builder/hustl3-bot.tsx": ["/optimized/hustl3-bot-official-720.webp"],
  };
  const heavyOriginals = [
    /src=["']\/top-trades-2026-2027-card\.png/,
    /src=["']\/trade-hustl3-book-cover\.jpg/,
    /src=["']\/zachary-ellis-author\.jpg/,
    /src=["']\/hustl3-bot-official\.webp/,
  ];
  for (const [file, expected] of Object.entries(pages)) {
    const source = await readFile(new URL(file, appDir), "utf8");
    for (const src of expected) assert.ok(source.includes(`src="${src}"`), `${file} must render ${src}`);
    for (const pattern of heavyOriginals) assert.doesNotMatch(source, pattern, `${file} renders a heavy original`);
  }
});
