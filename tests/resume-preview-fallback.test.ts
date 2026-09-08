import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const pagePath = new URL("../app/resume-builder/review/page.tsx", import.meta.url);
const fallbackPath = new URL("../app/resume-builder/review/preview-fallback.tsx", import.meta.url);

test("review page exposes a mobile-safe protected preview viewer", async () => {
  const [page, fallback] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(fallbackPath, "utf8"),
  ]);

  assert.match(page, /<ResumePreviewFallback\s*\/>/);
  assert.match(fallback, /createPortal/);
  assert.match(fallback, /\.rb-preview-panel/);
  assert.match(fallback, /MOBILE_PREVIEW_BREAKPOINT = 820/);
  assert.match(fallback, /iframe\.style\.display/);
  assert.match(fallback, /files\/preview\?view=1/);
  assert.match(fallback, /View my watermarked resume/);
  assert.match(fallback, /no additional AI run/i);
  assert.match(fallback, /use Back to return here/);
});
