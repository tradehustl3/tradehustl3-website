import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { allowsSameOriginFraming, frameHeaders, withFrameAncestors } from "../worker/frame-policy";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("only the customer's own preview file routes may be framed, and only by this site", () => {
  for (const path of [
    "/api/resume-builder/resumes/abc-123/files/preview",
    "/api/resume-builder/resumes/abc-123/files/pdf",
    "/api/resume-builder/resumes/abc-123/cover-letter/files/pdf",
  ]) {
    assert.equal(allowsSameOriginFraming(path), true, path);
  }
  for (const path of [
    "/",
    "/resume-builder/review",
    "/api/resume-builder/resumes/abc-123",
    "/api/resume-builder/resumes/abc-123/files/docx",
    "/api/resume-builder/resumes/abc-123/cover-letter/files/docx",
    "/api/resume-builder/resumes/abc-123/checkout",
    "/api/resume-builder/resumes/abc-123/files/preview/extra",
    "/api/book-sample",
  ]) {
    assert.equal(allowsSameOriginFraming(path), false, path);
  }
  const policy = "default-src 'self'; frame-ancestors 'none'; object-src 'none'";
  assert.equal(withFrameAncestors(policy, true), "default-src 'self'; frame-ancestors 'self'; object-src 'none'");
  assert.equal(withFrameAncestors(policy, false), policy);
  assert.equal(frameHeaders(true).xFrameOptions, "SAMEORIGIN");
  assert.equal(frameHeaders(false).xFrameOptions, "DENY");
});

test("the worker applies the frame policy and keeps DENY as the default", () => {
  const source = read("worker/index.ts");
  assert.match(source, /import \{ allowsSameOriginFraming, frameHeaders, withFrameAncestors \} from "\.\/frame-policy"/);
  assert.match(source, /"frame-ancestors 'none'"/);
  assert.match(source, /headers\.set\("X-Frame-Options", frameHeaders\(frameable\)\.xFrameOptions\)/);
  assert.match(source, /withFrameAncestors\(CONTENT_SECURITY_POLICY, frameable\)/);
});

test("style cards switch the look directly; the rewrite choice is a visible panel only when a paid rewrite is possible", () => {
  const review = read("app/resume-builder/review/resume-review.tsx");
  assert.match(review, /onClick=\{\(\) => void chooseStyle\(option\.value\)\}/);
  assert.doesNotMatch(review, /onClick=\{\(\) => resume\.status === "ready" && option\.value !== resume\.generationTrack \? setPendingTrack/);
  assert.match(review, /differsFromWriting && resume\.paid && resume\.correctionsRemaining > 0/);
  assert.match(review, /className="rb-track-choice"/);
  assert.match(review, /Keep my wording/);
  assert.match(review, /After you unlock the package, you can rewrite it for/);
  assert.doesNotMatch(review, /role="dialog" aria-label="Choose career track wording"/);
  const css = read("app/resume-builder/resume-builder.css");
  assert.match(css, /\.rb-track-choice \{/);
  assert.match(css, /\.rb-track-choice-actions \.rb-button \{[^}]*min-height: 44px/);
});

test("quality score and bullet workshop sit in a row below the preview, not at the bottom of the sidebar", () => {
  const review = read("app/resume-builder/review/resume-review.tsx");
  const asideEnd = review.indexOf("</aside>");
  assert.ok(asideEnd > 0);
  assert.ok(review.indexOf('className="rb-quality-card"') > asideEnd);
  assert.ok(review.indexOf('className="rb-bullet-editor"') > asideEnd);
  assert.match(review, /rb-review-details/);
  const css = read("app/resume-builder/resume-builder.css");
  assert.match(css, /\.rb-review-details \{ display: grid; grid-template-columns: minmax\(260px, \.8fr\) minmax\(0, 1\.6fr\)/);
  assert.match(css, /@media \(min-width: 1041px\) \{ \.rb-preview-panel \{ position: sticky; top: 16px; \} \}/);
});
