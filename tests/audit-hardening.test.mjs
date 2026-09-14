import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the $9.99 package is described consistently", () => {
  const terms = read("app/terms/page.tsx");
  const refund = read("app/resume-builder/refund-policy/page.tsx");
  const payment = read("app/resume-builder/payment-confirmed/payment-status.tsx");
  const tradeLanding = read("app/resume-builder/trade-landing.tsx");

  for (const source of [terms, refund]) {
    assert.match(source, /one matching cover letter/i);
    assert.match(source, /shared across the resume and cover letter/i);
    assert.match(source, /PDF and editable DOCX/i);
  }
  assert.match(payment, /generate your included matching cover letter/i);
  assert.match(payment, /from=payment#included-cover-letter/);
  assert.match(tradeLanding, /Matching cover letter included at no extra cost/);
});

test("post-payment review makes the included cover letter a visible final step", () => {
  const panel = read("app/resume-builder/review/cover-letter-panel.tsx");
  assert.match(panel, /id="included-cover-letter"/);
  assert.match(panel, /FINAL INCLUDED STEP — NO EXTRA CHARGE/);
  assert.match(panel, /first build does not use one of your three shared corrections/i);
});

test("optional tracking is excluded from private resume pages and honors user choice", () => {
  const layout = read("app/layout.tsx");
  const pixels = read("app/marketing-pixels.tsx");
  const analytics = read("app/google-analytics.tsx");
  const privacy = read("app/privacy/page.tsx");

  assert.match(layout, /<MarketingPixels \/>/);
  assert.doesNotMatch(layout, /connect\.facebook\.net\/en_US\/fbevents\.js/);
  assert.match(pixels, /globalPrivacyControl/);
  assert.doesNotMatch(pixels, /"\/resume-builder\/review"/);
  assert.match(analytics, /\/resume-builder\/review/);
  assert.match(analytics, /globalPrivacyControl/);
  assert.match(privacy, /Meta\/Facebook Pixel/);
  assert.match(privacy, /<TrackingPreferenceControls \/>/);
});

test("lead delivery failures are recoverable and production health is observable", () => {
  const worker = read("worker/index.ts");
  const migration = read("drizzle/0005_lead_delivery_queue.sql");

  assert.match(worker, /queueLeadDelivery/);
  assert.match(worker, /runLeadDeliveryRetries/);
  assert.match(worker, /dead_letter/);
  assert.match(worker, /emailDelivered/);
  assert.match(worker, /\/api\/health/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS lead_delivery_jobs/);
});

test("thin guided intake is blocked in the browser before generation", () => {
  const wizard = read("app/resume-builder/intake/wizard.tsx");
  assert.match(wizard, /finalSubstanceErrors/);
  assert.match(wizard, /Add at least two real tools, systems, technical or safety skills/);
  assert.match(wizard, /Add at least one specific duty, task, or accomplishment/);
});

test("unsupported social proof and stale self-mutating workflow are removed", () => {
  assert.doesNotMatch(read("app/page.tsx"), /500\+ TRADESPEOPLE HELPED/);
  assert.equal(existsSync(new URL("../.github/workflows/fix-upload-first-ux.yml", import.meta.url)), false);
  assert.equal(existsSync(new URL("../scripts/fix-upload-first-ux.py", import.meta.url)), false);
});
