import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../app/home-storefront.module.css", import.meta.url), "utf8");
const block = css.slice(css.indexOf("Book-inspired atmosphere"), css.indexOf("Mobile-first trade atmosphere refresh"));
const publicFile = (path) => new URL(`../public${path}`, import.meta.url);

/** Splits the atmosphere block into top-level rules with their media query (if any). */
function rules() {
  const out = [];
  const re = /@media\s*\(([^)]*)\)\s*\{([\s\S]*?)\n\}/g;
  let rest = block;
  for (const match of block.matchAll(re)) {
    out.push({ media: match[1], body: match[2] });
    rest = rest.replace(match[0], "");
  }
  out.push({ media: null, body: rest });
  return out;
}

test("homepage atmosphere uses only existing art derived from the book hero", () => {
  const urls = [...block.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
  assert.ok(urls.length > 0);
  for (const url of urls) {
    assert.match(url, /^\/optimized\/(book-hero-trades-v1\.webp|atmosphere\/)/, `${url} is not book-hero art`);
    assert.ok(existsSync(publicFile(url)), `${url} is missing`);
  }
});

test("worker figures appear only where desktop gutters leave room for them", () => {
  for (const { media, body } of rules()) {
    if (!/worker-|painter-color/.test(body)) continue;
    const min = Number(media?.match(/min-width:\s*(\d+)px/)?.[1] ?? 0);
    assert.ok(min >= 1200, `figure used outside a wide-screen query (${media ?? "no media query"})`);
  }
  const mobile = rules().find((rule) => rule.media?.includes("max-width: 720px"));
  assert.ok(mobile, "narrow screens get their own hero crop");
  assert.match(mobile.body, /hero-mobile-828\.webp/);
});

test("atmosphere assets stay lightweight", () => {
  const dir = new URL("../public/optimized/atmosphere/", import.meta.url);
  const bytes = readdirSync(dir).reduce((sum, name) => sum + statSync(new URL(name, dir)).size, 0);
  assert.ok(bytes < 150_000, `atmosphere assets are ${bytes} bytes`);
});

const refresh = css.slice(css.indexOf("Mobile-first trade atmosphere refresh"));
test("new skilled-trades silhouettes have local decorative assets", () => {
  for (const name of ["concrete-foundation.svg", "crane-blueprint.svg", "female-mechanic.svg", "power-line-poles.svg"]) {
    assert.ok(existsSync(new URL(`../public/optimized/atmosphere/${name}`, import.meta.url)), `${name} missing`);
    assert.match(refresh, new RegExp(name.replace(".", "\\.")), `${name} not used`);
  }
});
test("atmosphere refresh includes phone-specific compositions and restrained imagery", () => {
  assert.match(refresh, /@media \(max-width: 720px\)/);
  assert.match(refresh, /@media \(max-width: 380px\)/);
  assert.match(refresh, /\.storefront::before/);
  assert.match(refresh, /\.lane::before/);
  assert.match(refresh, /\.guide::before/);
  assert.match(refresh, /pointer-events: none/);
});

test("book-inspired spray remains lightweight and is included across sections", () => {
  const spray = new URL("../public/optimized/atmosphere/book-spray-specks.svg", import.meta.url);
  assert.ok(existsSync(spray), "spray asset missing");
  assert.ok(statSync(spray).size < 8_000, "spray should be a small static SVG");
  const refresh = css.slice(css.indexOf("Mobile-first trade atmosphere refresh"));
  for (const section of ["storefront", "resume", "lane", "guide", "newsletter"]) {
    assert.match(refresh, new RegExp(`\\.${section} \\{[\\s\\S]*?book-spray-specks\\.svg`), `${section} missing spray accents`);
  }
});
