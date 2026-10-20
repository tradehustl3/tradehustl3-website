import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const analytics = fs.readFileSync("app/resume-builder/funnel-analytics.tsx", "utf8");
const homePage = fs.readFileSync("app/page.tsx", "utf8");
const builderPage = fs.readFileSync("app/resume-builder/page.tsx", "utf8");
const intakePage = fs.readFileSync("app/resume-builder/intake/page.tsx", "utf8");
const reviewPage = fs.readFileSync("app/resume-builder/review/page.tsx", "utf8");
const confirm = fs.readFileSync("app/resume-builder/confirm/confirm-magic-link.tsx", "utf8");
const payment = fs.readFileSync("app/resume-builder/payment-confirmed/payment-status.tsx", "utf8");

test("Resume Builder funnel exposes the core GA4 milestones", () => {
  for (const eventName of [
    "resume_builder_start",
    "sign_up",
    "resume_intake_started",
    "resume_intake_complete",
    "resume_preview_generated",
    "begin_checkout",
    "purchase",
  ]) {
    const corpus = [analytics, homePage, builderPage, intakePage, reviewPage, confirm, payment].join("\n");
    assert.match(corpus, new RegExp(eventName));
  }
});

test("begin_checkout and purchase carry the $9.99 ecommerce value in USD server-side", () => {
  const ga4 = fs.readFileSync("worker/ga4-measurement-protocol.ts", "utf8");
  assert.match(ga4, /currency\s*=\s*"USD"|currency:\s*"USD"/);
  assert.match(ga4, /price:\s*9\.99/);
  assert.match(ga4, /item_id:\s*"trade_hustl3_resume_builder"/);
  assert.match(ga4, /transaction_id:\s*transactionId/);
});

test("GA4 purchase is sent only from the verified Stripe webhook, never from the browser", () => {
  assert.doesNotMatch(analytics, /"purchase"/);
  assert.doesNotMatch(payment, /trackResumePurchase/);
  const base = fs.readFileSync("worker/resume-builder-base.ts", "utf8");
  assert.match(base, /ga4PurchaseEvent\(orderId/);
  assert.match(base, /if \(!order\.paid_at && order\.status !== "refunded"/);
});

test("browser funnel tracking never calls gtag directly (prevents drops and double counting)", () => {
  assert.doesNotMatch(analytics, /gtag\(/);
  assert.match(analytics, /analyticsConsent:\s*optionalTrackingAllowed\(\)/);
});

test("funnel observers are mounted on the actual Resume Builder stages", () => {
  assert.match(homePage, /<ResumeBuilderStartAnalytics\s*\/>/);
  assert.match(intakePage, /<ResumeIntakeAnalytics\s*\/>/);
  assert.match(reviewPage, /<ResumeReviewAnalytics\s*\/>/);
  assert.match(confirm, /trackResumeFunnelEvent\("sign_up"/);
});

test("first-party funnel tracking deduplicates independently of GA4", () => {
  assert.match(analytics, /tradehustl3_first_party_funnel/);
  assert.match(analytics, /sessionStorage\.getItem\(dedupeKey\)/);
  assert.match(analytics, /response\.ok/);
  assert.match(analytics, /sessionStorage\.setItem\(dedupeKey, "1"\)/);
});

test("purchase is never sent to first-party funnel telemetry", () => {
  const base = fs.readFileSync("worker/resume-builder-base.ts", "utf8");
  const allowlist = base.slice(base.indexOf("const FUNNEL_EVENT_NAMES"), base.indexOf("const FUNNEL_METADATA_KEYS"));
  assert.doesNotMatch(allowlist, /"purchase"/);
});

test("begin_checkout carries the resume ID so paid orders can be joined to campaign attribution", () => {
  assert.match(analytics, /trackResumeFunnelEvent\("begin_checkout", resumeId \? \{ resume_id: resumeId \} : \{\}\)/);
  assert.match(analytics, /trackResumeCheckout\(resumeId === "unknown" \? undefined : resumeId\)/);
});
