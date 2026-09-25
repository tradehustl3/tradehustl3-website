import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const TESTIMONIAL_NAMES = [
  "Jessica M.",
  "David R.",
  "Taylor S.",
  "Michael T.",
  "Marcus K.",
  "Chris L.",
];

function publicReviewsHandler(worker) {
  const start = worker.indexOf("async function getPublicCustomerReviews");
  assert.ok(start >= 0, "public review handler exists");
  return worker.slice(start, worker.indexOf("\n}\n", start));
}

test("homepage has no hardcoded testimonials", () => {
  const reviews = read("app/customer-reviews.tsx");
  assert.doesNotMatch(reviews, /consentedTestimonials/);
  assert.doesNotMatch(reviews, /CustomerTestimonial/);
  assert.doesNotMatch(reviews, /\/testimonials\//);
  assert.doesNotMatch(reviews, /next\/image/);
  for (const name of TESTIMONIAL_NAMES) {
    assert.doesNotMatch(reviews, new RegExp(name.replace(".", "\\.")));
  }
  for (const photo of ["jessica-m", "david-r", "taylor-s", "michael-t", "marcus-k", "chris-l"]) {
    assert.equal(existsSync(new URL(`../public/testimonials/${photo}.webp`, import.meta.url)), false);
  }
});

test("homepage testimonial section relies on the verified review API and hides when empty", () => {
  const page = read("app/page.tsx");
  const reviews = read("app/customer-reviews.tsx");
  assert.equal(page.match(/<CustomerReviews \/>/g)?.length, 1);
  assert.match(reviews, /\/api\/resume-builder\/reviews\/public/);
  assert.match(reviews, /reviews\.length === 0/);
  assert.match(reviews, /Verified TRADE HUSTL3 customer/);
  assert.match(reviews, /Customer-reported result/);
  assert.match(reviews, /job-search outcomes are self-reported/i);
  assert.match(reviews, /TRADE HUSTL3\s+does not guarantee interviews or employment/i);
});

test("unsupported social proof is gone from the site copy", () => {
  for (const path of ["app/page.tsx", "app/customer-reviews.tsx", "app/layout.tsx"]) {
    const source = read(path);
    assert.doesNotMatch(source, /500\+/);
    assert.doesNotMatch(source, /tradespeople helped/i);
    assert.doesNotMatch(source, /Real People\. Real Results\./i);
    for (const name of TESTIMONIAL_NAMES) assert.doesNotMatch(source, new RegExp(name.replace(".", "\\.")));
  }
});

test("public review API requires approval, publication consent, and a paid order", () => {
  const handler = publicReviewsHandler(read("worker/resume-builder-base.ts"));
  assert.match(handler, /cr\.status = 'approved'/);
  assert.match(handler, /cr\.consent_publish = 1/);
  assert.match(handler, /JOIN resume_orders ro ON ro\.order_id = cr\.order_id/);
  assert.match(handler, /ro\.status = 'paid'/);
  assert.match(handler, /verifiedCustomer: true/);
});

test("public review mapping exposes no private fields", () => {
  const handler = publicReviewsHandler(read("worker/resume-builder-base.ts"));
  const mapping = handler.slice(handler.indexOf("reviews: (rows.results"));
  for (const field of ["email", "user_id", "resume_id", "order_id", "token_hash", "stripe", "payment_intent"]) {
    assert.doesNotMatch(mapping, new RegExp(field, "i"));
  }
  const select = handler.slice(handler.indexOf("SELECT"), handler.indexOf("FROM customer_reviews"));
  for (const field of ["email", "user_id", "resume_id", "order_id", "token_hash"]) {
    assert.doesNotMatch(select, new RegExp(field));
  }
});

test("submissions are stored as pending and never inserted as approved", () => {
  const worker = read("worker/resume-builder-base.ts");
  assert.match(worker, /INSERT INTO customer_reviews[\s\S]*?VALUES \([^)]*'pending'\)/);
  assert.doesNotMatch(worker, /INSERT INTO customer_reviews[\s\S]*?VALUES \([^)]*'approved'\)/);
  assert.match(worker, /REVIEW_MIN_TEXT_LENGTH = 20/);
  assert.match(worker, /REVIEW_MAX_TEXT_LENGTH = 1200/);
  assert.match(worker, /REVIEW_MAX_RESULT_LENGTH = 500/);
  assert.match(worker, /REVIEW_MAX_NAME_LENGTH = 120/);
  assert.match(worker, /isSameOriginReviewRequest\(request\)/);
});

test("approval requires publication consent", () => {
  const worker = read("worker/resume-builder-base.ts");
  assert.match(worker, /This customer did not give permission to publish the review\.["'`]\s*\}, 409\)/);
  assert.match(worker, /AND \(\? <> 'approved' OR consent_publish = 1\)/);
});

test("review moderation is restricted to authenticated TRADE HUSTL3 review admins", () => {
  const worker = read("worker/resume-builder-base.ts");
  assert.match(worker, /founder@tradehustl3\.com/);
  assert.match(worker, /support@tradehustl3\.com/);
  assert.match(worker, /REVIEW_ADMIN_EMAILS/);
  assert.match(worker, /if \(!user\) return json\(\{ ok: false, message: "Sign in to continue\." \}, 401\)/);
  assert.match(worker, /if \(!isReviewAdmin\(user, env\)\) return json\(\{ ok: false, message: "Not authorized\." \}, 403\)/);
});

test("review invitation asks for honest feedback without an incentive, three days after payment", () => {
  const worker = read("worker/resume-builder-base.ts");
  assert.match(worker, /REVIEW_REQUEST_DELAY_SECONDS = 3 \* 24 \* 60 \* 60/);
  assert.match(worker, /REVIEW_TOKEN_TTL_SECONDS = 30 \* 24 \* 60 \* 60/);
  assert.match(worker, /honest feedback/i);
  assert.match(worker, /Positive, negative, and mixed feedback are all welcome/);
  assert.match(worker, /No discount, payment, reward, or other incentive is provided for leaving a review/);
  assert.doesNotMatch(worker, /5-star review|five-star review/i);
  assert.match(worker, /\/reviews\?token=/);
});

test("review queueing can never break payment fulfillment", () => {
  const worker = read("worker/resume-builder-base.ts");
  assert.match(worker, /try \{\s*await queuePaidReviewRequest\(env, orderId\);\s*\} catch/);
  assert.match(worker, /ON CONFLICT\(order_id\) DO NOTHING/);
});

test("schema bootstrap never seeds invitations", () => {
  const worker = read("worker/resume-builder-base.ts");
  const bootstrap = worker.slice(worker.indexOf("const REVIEW_SCHEMA_STATEMENTS"), worker.indexOf("async function queuePaidReviewRequest"));
  assert.doesNotMatch(bootstrap, /INSERT/i);
});

test("customer review form asks for honest feedback and separates the two consents", () => {
  const form = read("app/reviews/review-form.tsx");
  assert.match(form, /Positive, negative, and mixed feedback are all welcome/i);
  assert.match(form, /consentPublish/);
  assert.match(form, /consentResumeExample/);
  assert.match(form, /This does not automatically publish my resume/i);
  assert.match(form, /No discount, payment, reward, or other incentive/i);
  assert.match(form, /useState\(0\)/, "no star rating is preselected");
});

test("only /admin/reviews exists as the moderation UI", () => {
  assert.equal(existsSync(new URL("../app/reviews/admin/page.tsx", import.meta.url)), false);
  assert.equal(existsSync(new URL("../app/reviews/admin/review-list.tsx", import.meta.url)), false);
  assert.equal(existsSync(new URL("../app/admin/reviews/page.tsx", import.meta.url)), true);
  assert.equal(existsSync(new URL("../app/admin/reviews/review-admin.tsx", import.meta.url)), true);
  assert.match(read("app/admin/reviews/page.tsx"), /robots: \{ index: false, follow: false, noarchive: true \}/);
  assert.doesNotMatch(read("README.md"), /\/reviews\/admin/);
});

test("migration defines the required constraints", () => {
  const migration = read("drizzle/0006_verified_customer_reviews.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS review_requests/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS customer_reviews/);
  assert.match(migration, /order_id TEXT NOT NULL UNIQUE/);
  assert.match(migration, /request_id TEXT NOT NULL UNIQUE/);
  assert.match(migration, /CHECK \(rating BETWEEN 1 AND 5\)/);
  assert.match(migration, /consent_publish INTEGER NOT NULL DEFAULT 0 CHECK \(consent_publish IN \(0, 1\)\)/);
  assert.match(migration, /consent_resume_example INTEGER NOT NULL DEFAULT 0 CHECK \(consent_resume_example IN \(0, 1\)\)/);
  assert.match(migration, /status TEXT NOT NULL DEFAULT 'pending' CHECK \(status IN \('pending', 'approved', 'rejected'\)\)/);
  assert.match(migration, /FROM resume_orders[\s\S]*WHERE status = 'paid'/);
});

test("privacy policy discloses review data without promising publication", () => {
  const privacy = read("app/privacy/page.tsx");
  for (const phrase of [/star rating/, /review text/, /optional job-search result/, /recommendation choice/, /publishing the review/, /before\/after resume example/, /verified paid customers/, /not automatically public/]) {
    assert.match(privacy, phrase);
  }
});

test("production smoke checks the verified-review surfaces", () => {
  const smoke = read(".github/workflows/production-smoke.yml");
  assert.match(smoke, /"\$CUSTOM_ORIGIN\/reviews"/);
  assert.match(smoke, /"\$CUSTOM_ORIGIN\/api\/resume-builder\/reviews\/public"/);
  for (const field of ["email", "user_id", "order_id", "token_hash"]) assert.match(smoke, new RegExp(`\\\\"${field}\\\\"`));
  assert.match(smoke, /"\$CUSTOM_ORIGIN\/admin\/reviews"/);
  assert.match(smoke, /for directive in noindex nofollow noarchive/);
  assert.match(smoke, /reviews\/admin"\)" \|\| status="000"/);
});

test("only a verified paid checkout can create review invitations; homepage reads cannot", () => {
  const worker = read("worker/resume-builder-base.ts");
  assert.equal(worker.match(/INTO review_requests/g)?.length, 1, "one insert path in the Worker");
  assert.equal(worker.match(/await queuePaidReviewRequest\(/g)?.length, 1, "queued only from the Stripe webhook");
  const webhook = worker.slice(worker.indexOf("async function handleResumeStripeWebhook"), worker.indexOf("async function queuePaidReviewRequest"));
  assert.match(webhook, /queuePaidReviewRequest\(env, orderId\)/);
  assert.match(worker, /nowSeconds\(\) \+ REVIEW_REQUEST_DELAY_SECONDS/);

  const bootstrap = worker.slice(worker.indexOf("const REVIEW_SCHEMA_STATEMENTS"), worker.indexOf("async function queuePaidReviewRequest"));
  assert.doesNotMatch(bootstrap, /INSERT|FROM resume_orders|nowSeconds/);
  assert.match(worker, /reviews\/public"\) return getPublicCustomerReviews/);
  assert.doesNotMatch(publicReviewsHandler(worker), /INSERT|UPDATE|queuePaidReviewRequest/);

  // The homepage component only performs a GET of the public feed.
  const component = read("app/customer-reviews.tsx");
  assert.doesNotMatch(component, /method:/);
  assert.equal(component.match(/fetch\(/g)?.length, 1);
});

test("migration seed never schedules sooner than paid_at + 3 days", () => {
  const migration = read("drizzle/0006_verified_customer_reviews.sql");
  assert.match(migration, /strftime\('%s', paid_at\) AS INTEGER\) \+ 259200/);
  assert.match(migration, /ON CONFLICT\(order_id\) DO NOTHING/);
});
