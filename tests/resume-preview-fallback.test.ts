import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const pagePath = new URL("../app/resume-builder/review/page.tsx", import.meta.url);
const fallbackPath = new URL("../app/resume-builder/review/preview-fallback.tsx", import.meta.url);

test("review page exposes a protected full-screen preview fallback", async () => {
  const [page, fallback] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(fallbackPath, "utf8"),
  ]);

  assert.match(page, /<ResumePreviewFallback\s*\/>/);
  assert.match(fallback, /files\/preview\?view=1/);
  assert.match(fallback, /Open protected preview full screen/);
  assert.match(fallback, /does not use another AI run/);
  assert.match(fallback, /target="_blank"/);
  assert.match(fallback, /rel="noopener noreferrer"/);
});
