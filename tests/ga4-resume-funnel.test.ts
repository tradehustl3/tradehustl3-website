import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const analytics = fs.readFileSync("app/resume-builder/funnel-analytics.tsx", "utf8");
const builderPage = fs.readFileSync("app/resume-builder/page.tsx", "utf8");
const intakePage = fs.readFileSync("app/resume-builder/intake/page.tsx", "utf8");
const reviewPage = fs.readFileSync("app/resume-builder/review/page.tsx", "utf8");
const confirm = fs.readFileSync("app/resume-builder/confirm/confirm-magic-link.tsx", "utf8");
const payment = fs.readFileSync("app/resume-builder/payment-confirmed/payment-status.tsx", "utf8");

test("Resume Builder funnel exposes the core GA4 milestones", () => {
  for (const eventName of [
    "resume_builder_start",
    "sign_up",
    "resume_intake_complete",
    "resume_preview_generated",
    "begin_checkout",
    "purchase",
  ]) {
    const corpus = [analytics, builderPage, intakePage, reviewPage, confirm, payment].join("\n");
    assert.match(corpus, new RegExp(eventName));
  }
});

test("checkout and purchase carry the $9.99 ecommerce value in USD", () => {
  assert.match(analytics, /currency:\s*"USD"/);
  assert.match(analytics, /value:\s*9\.99/);
  assert.match(analytics, /item_id:\s*"trade_hustl3_resume_builder"/);
  assert.match(analytics, /transaction_id:\s*transactionId/);
});

test("purchase tracking is deduplicated by resume transaction id", () => {
  assert.match(analytics, /tradehustl3_ga4_purchase:\$\{transactionId\}/);
  assert.match(analytics, /localStorage\.getItem\(key\)/);
  assert.match(analytics, /localStorage\.setItem\(key, "1"\)/);
});

test("funnel observers are mounted on the actual Resume Builder stages", () => {
  assert.match(builderPage, /<ResumeBuilderStartAnalytics\s*\/>/);
  assert.match(intakePage, /<ResumeIntakeAnalytics\s*\/>/);
  assert.match(reviewPage, /<ResumeReviewAnalytics\s*\/>/);
  assert.match(confirm, /trackResumeFunnelEvent\("sign_up"/);
  assert.match(payment, /trackResumePurchase\(resumeId\.current\)/);
});
