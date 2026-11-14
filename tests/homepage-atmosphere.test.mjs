import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../app/home-storefront.module.css", import.meta.url), "utf8");
const assetDir = new URL("../public/optimized/atmosphere/", import.meta.url);

test("homepage backgrounds reuse the book page artwork and local trade photography", () => {
  const bookCss = readFileSync(new URL("../app/page-shell.css", import.meta.url), "utf8");
  const bookArt = bookCss.match(/url\("(\/optimized\/book-hero-[^"]+)"\)/)?.[1];
  assert.ok(bookArt && css.includes(`url("${bookArt}")`), "the homepage should use the book page backdrop");
  const formats = readFileSync(new URL("../app/home-book-formats.tsx", import.meta.url), "utf8");
  const urls = new Set([...(css + formats).matchAll(/"\/optimized\/atmosphere\/([^"]+)"/g)].map((match) => match[1]));
  for (const name of ["worker-kneeling-hvac.webp", "book-plumber-standing.webp", "book-tradeswoman.webp", "footer-trades-road-scene.svg", "concrete-mixer-500.webp", "power-lines-1080.webp"]) {
    assert.ok(urls.has(name), `${name} is unused`);
  }
  for (const name of urls) assert.ok(existsSync(new URL(name, assetDir)), `${name} is missing`);
  assert.doesNotMatch(css, /book-paint|book-spray-specks|concrete-foundation|female-mechanic|power-line-poles|crane-blueprint/);
});

test("homepage backgrounds stay lightweight", () => {
  const bytes = readdirSync(assetDir).reduce((sum, name) => sum + statSync(new URL(name, assetDir)).size, 0);
  assert.ok(bytes < 150_000, `atmosphere assets are ${bytes} bytes`);
});

test("warm industrial footer mural has separate desktop and phone transfer budgets", () => {
  const muralDir = new URL("../public/optimized/footer-mural/", import.meta.url);
  const desktop = new URL("painter-sunset-desktop.webp", muralDir);
  const mobile = new URL("painter-sunset-mobile.webp", muralDir);
  assert.ok(existsSync(desktop) && existsSync(mobile), "both mural sizes must exist");
  assert.ok(statSync(desktop).size < 115_000, "desktop mural should stay under 115 KB");
  assert.ok(statSync(mobile).size < 55_000, "phone mural should stay under 55 KB");
  assert.match(css, /footer-mural\/painter-sunset-desktop\.webp/);
  assert.match(css, /footer-mural\/painter-sunset-mobile\.webp/);
});
