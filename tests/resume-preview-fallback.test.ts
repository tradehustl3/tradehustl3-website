import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const pagePath = new URL("../app/resume-builder/review/page.tsx", import.meta.url);
const reviewPath = new URL("../app/resume-builder/review/resume-review.tsx", import.meta.url);

test("mobile review keeps the protected PDF inside the resume workspace", async () => {
  const [page, review] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(reviewPath, "utf8"),
  ]);

  // The old mobile fallback hid the iframe and sent customers to the raw PDF.
  // Mobile must remain in the full review UI, with the PDF drawn in the panel.
  assert.doesNotMatch(page, /ResumePreviewFallback/);
  assert.match(review, /className="rb-review-grid"/);
  assert.match(review, /<ProtectedPdfPreview /);
  assert.match(review, /renderThemePicker\(\)/);
  assert.match(review, /Field Pro/);
  assert.match(review, /Modern Trade/);
  assert.match(review, /Lead \/ Supervisor/);
});
