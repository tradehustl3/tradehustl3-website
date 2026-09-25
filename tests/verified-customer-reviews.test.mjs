import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("verified reviews are tied to paid Resume Builder orders and never auto-publish", () => {
  const migration = read("drizzle/0006_verified_customer_reviews.sql");
  const worker = read("worker/resume-builder-base.ts");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS review_requests/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS customer_reviews/);
  assert.match(migration, /status TEXT NOT NULL DEFAULT 'pending'/);
  assert.match(migration, /consent_publish INTEGER NOT NULL DEFAULT 0/);
  assert.match(migration, /FROM resume_orders[\s\S]*WHERE status = 'paid'/);

  assert.match(worker, /await queuePaidReviewRequest\(env/);
  assert.match(worker, /JOIN resume_orders ro ON ro\.order_id = rr\.order_id/);
  assert.match(worker, /AND ro\.status = 'paid'/);
  assert.match(worker, /VALUES \([\s\S]*'pending'\)/);
  assert.doesNotMatch(worker, /VALUES \([\s\S]*'approved'\)/);
});

test("review invitation asks for honest feedback without an incentive", () => {
  const worker = read("worker/resume-builder-base.ts");
  assert.match(worker, /REVIEW_REQUEST_DELAY_SECONDS = 3 \* 24 \* 60 \* 60/);
  assert.match(worker, /positive, negative, or somewhere in between/i);
  assert.match(worker, /There is no reward, discount, or other incentive/i);
  assert.match(worker, /review link expires 30 days/i);
});

test("public reviews require approval, publication consent, and an active paid order", () => {
  const worker = read("worker/resume-builder-base.ts");
  assert.match(worker, /cr\.status = 'approved'/);
  assert.match(worker, /cr\.consent_publish = 1/);
  assert.match(worker, /ro\.status = 'paid'/);
  assert.match(worker, /verifiedCustomer: true/);
});

test("customer review form separates publishing consent from resume-example consent", () => {
  const form = read("app/reviews/review-form.tsx");
  assert.match(form, /Positive, negative, and mixed feedback are all welcome/i);
  assert.match(form, /consentPublish/);
  assert.match(form, /consentResumeExample/);
  assert.match(form, /This does not automatically publish my resume/i);
  assert.match(form, /No discount, payment, reward, or other incentive/i);
});

test("homepage customer proof stays hidden until approved reviews exist", () => {
  const page = read("app/page.tsx");
  const reviews = read("app/customer-reviews.tsx");
  assert.match(page, /<CustomerReviews \/>/);
  assert.match(reviews, /if \(!reviews\.length\) return null/);
  assert.match(reviews, /Verified customer/);
  assert.match(reviews, /Customer-reported result/);
  assert.match(reviews, /Individual job-search outcomes vary/);
});

test("review moderation is restricted to authenticated TRADE HUSTL3 review admins", () => {
  const worker = read("worker/resume-builder-base.ts");
  assert.match(worker, /founder@tradehustl3\.com/);
  assert.match(worker, /support@tradehustl3\.com/);
  assert.match(worker, /if \(!user\) return json\(\{ ok: false, message: "Sign in to continue\." \}, 401\)/);
  assert.match(worker, /if \(!isReviewAdmin\(user, env\)\) return json\(\{ ok: false, message: "Not authorized\." \}, 403\)/);
  assert.match(worker, /This customer did not give permission to publish the review/);
});
