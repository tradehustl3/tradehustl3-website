import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../app/home-storefront.module.css", import.meta.url), "utf8");
const assetDir = new URL("../public/optimized/atmosphere/", import.meta.url);

test("homepage backgrounds use local book workers, masonry, and jobsite photography", () => {
  const urls = new Set([...css.matchAll(/url\("\/optimized\/atmosphere\/([^"]+)"\)/g)].map((match) => match[1]));
  for (const name of ["worker-hvac-300-v2.webp", "worker-wrench-300-v2.webp", "worker-painter-260-v2.webp", "masonry-760.webp", "concrete-mixer-500.webp", "power-lines-1080.webp"]) {
    assert.ok(urls.has(name), `${name} is unused`);
  }
  for (const name of urls) assert.ok(existsSync(new URL(name, assetDir)), `${name} is missing`);
  assert.doesNotMatch(css, /book-spray-specks|concrete-foundation|female-mechanic|power-line-poles|crane-blueprint/);
});

test("homepage backgrounds stay lightweight", () => {
  const bytes = readdirSync(assetDir).reduce((sum, name) => sum + statSync(new URL(name, assetDir)).size, 0);
  assert.ok(bytes < 150_000, `atmosphere assets are ${bytes} bytes`);
});
