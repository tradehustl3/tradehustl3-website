import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../app/home-storefront.module.css", import.meta.url), "utf8");
const assetDir = new URL("../public/optimized/atmosphere/", import.meta.url);

test("homepage backgrounds reuse the book page artwork and local trade photography", () => {
  const bookCss = readFileSync(new URL("../app/page-shell.css", import.meta.url), "utf8");
  const bookArt = bookCss.match(/url\("(\/optimized\/book-hero-[^"]+)"\)/)?.[1];
  assert.ok(bookArt && css.includes(`url("${bookArt}")`), "the homepage should use the book page backdrop");
  const urls = new Set([...css.matchAll(/url\("\/optimized\/atmosphere\/([^"]+)"\)/g)].map((match) => match[1]));
  for (const name of ["worker-digital-hvac.webp", "worker-pex-valve.webp", "worker-painter-260-v2.webp", "masonry-760.webp", "concrete-mixer-500.webp", "power-lines-1080.webp"]) {
    assert.ok(urls.has(name), `${name} is unused`);
  }
  for (const name of urls) assert.ok(existsSync(new URL(name, assetDir)), `${name} is missing`);
  assert.doesNotMatch(css, /book-paint|book-spray-specks|concrete-foundation|female-mechanic|power-line-poles|crane-blueprint/);
});

test("homepage backgrounds stay lightweight", () => {
  const bytes = readdirSync(assetDir).reduce((sum, name) => sum + statSync(new URL(name, assetDir)).size, 0);
  assert.ok(bytes < 150_000, `atmosphere assets are ${bytes} bytes`);
});
