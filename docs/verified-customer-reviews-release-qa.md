# Verified Customer Reviews — Release QA

## Branch
feat/verified-customer-reviews

## PR
#169

## Commit
Application code QA'd at `ddc7476dbcd78fd9250ce2b52c9b240da5337167`. The commit that adds this report changes only tests and docs; no Worker, app, or migration code changed during QA.

QA date: 2026-09-25 (UTC).

### Environments used

| Environment | Used for | Notes |
| --- | --- | --- |
| Local D1: `wrangler d1 execute --local` (Wrangler 4.129.0, workerd SQLite) | A–D | Throwaway database under the session scratchpad, id `00000000-…`. Migrations 0000–0005 were applied first. |
| Built Worker served locally: `wrangler dev --local` on `dist/server`, with its own throwaway local D1 | Early-email HTTP proof, I–P, homepage/admin checks, supporting evidence for F | The config copy replaced the production D1 id with a dummy id. No `BREVO_API_KEY` and no Stripe keys were present, so no email or payment could leave the machine. |
| `npm test`: in-memory SQLite with all repo migrations, real Worker handlers | Unit and integration regression suite | Brevo and Stripe transport are stubbed in tests. Those results count as automated coverage, not as manual integration passes. |
| Cloud staging D1 `tradehustl3-website-staging` | Not used | The tables were listed read-only. It is several migrations behind (no 0004/0005 tables) and is not bound to any Worker. Reading its order data was blocked by the session permission policy, so no fixtures or migrations were written to it. |

No production resource was read or written. No email was sent.

## Early-email bootstrap bug
PASS (FIXED)

Evidence:
- **ensureReviewSchema contains no invitation seed.** `REVIEW_SCHEMA_STATEMENTS` contains only `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`. `grep` over the bootstrap block for `INSERT`, `FROM resume_orders` and `nowSeconds` finds nothing. The Worker has exactly one `INTO review_requests` statement, in `queuePaidReviewRequest`, and that function is awaited only from the verified Stripe checkout webhook.
- **Public review GET creates zero review_requests.**
  - Integration test `public review reads never seed review invitations`: a paid order with no invitation; 10 × `GET /api/resume-builder/reviews/public`; count stays 0 after every call. It also calls `reviews/request`, admin GET and the scheduler, and the count stays 0 and no email is sent.
  - On the real local Worker over HTTP: 10 × `GET /api/resume-builder/reviews/public` → 200 each, `review_requests` before = 0, after = 0.
- **Homepage creates zero review_requests.** On the real local Worker, 10 × `GET /` → 200 each, and `review_requests` stays 0 (ORDER_HOME, paid 10 days ago, has 0 rows). A static test also asserts that `CustomerReviews` does a single GET with no `method:`, and that the public handler contains no `INSERT`, `UPDATE` or `queuePaidReviewRequest`.
- **New payment schedules exactly +3 days.** In the same integration test, after the 10 reads a signed `checkout.session.completed` webhook creates exactly 1 row with `scheduled_at >= payment_time + 259200 - 5s`. Ten further public reads leave it at 1.
- **Migration-only seed respects paid_at + 3 days.** On the local D1, ORDER_RECENT has `scheduled_at - paid_at = 259200` exactly (see C).
- **Tests catch a regression.** I temporarily added the old `INSERT OR IGNORE … FROM resume_orders WHERE status='paid'` seed back into `REVIEW_SCHEMA_STATEMENTS`. Five tests failed, including `public review reads never seed review invitations`, `schema bootstrap on a database without the review tables creates them and seeds nothing`, `schema bootstrap never seeds invitations`, and `paid checkout queues exactly one review invitation, scheduled three days out`. The change was then reverted.

## A–P

A. Migration first run — PASS
Evidence: local D1, migrations 0000–0005, then fixtures, then `0006_verified_customer_reviews.sql` → "7 commands executed successfully".
- **Tables:** `review_requests` and `customer_reviews`.
- **Indexes:** `review_requests_due_idx`, `review_requests_user_idx`, `customer_reviews_public_idx`, `customer_reviews_user_idx`, plus autoindexes for the UNIQUE columns.
- **Constraints enforced by the D1 engine:**

  | Attempted write | Result |
  | --- | --- |
  | `rating` 6 or 0 | `CHECK constraint failed: rating BETWEEN 1 AND 5` |
  | `consent_publish` 2 | `CHECK … consent_publish IN (0, 1)` |
  | `consent_resume_example` 2 | `CHECK … consent_resume_example IN (0, 1)` |
  | `recommend` 2 | `CHECK … recommend IN (0, 1)` |
  | `status` 'published' | `CHECK … status IN ('pending', 'approved', 'rejected')` |
  | duplicate `customer_reviews.request_id` | `UNIQUE constraint failed: customer_reviews.request_id` |
  | duplicate `review_requests.order_id` | `UNIQUE constraint failed: review_requests.order_id` |
  | duplicate `review_requests.token_hash` | `UNIQUE constraint failed: review_requests.token_hash` |
  | valid row | accepted |

B. Migration second run — PASS
Evidence: re-applying 0006 on the same local D1 raised no error. The `review_requests` total was 2 before and 2 after. The migration is idempotent (`IF NOT EXISTS` plus `ON CONFLICT(order_id) DO NOTHING`); still treat it as run-once in production.

C. Existing paid order seed — PASS
Evidence: fixtures created before 0006 were ORDER_OLD (paid, paid 7 days ago), ORDER_RECENT (paid, paid 1 day ago) and ORDER_REFUNDED (refunded, paid 7 days ago).

| order_id | rows | scheduled_at | seconds from now | seconds after paid_at |
| --- | --- | --- | --- | --- |
| ORDER_OLD | 1 | 1790306795 | −3 (due now) | 604802 |
| ORDER_RECENT | 1 | 1790479593 | +172795 (≈2 days, not yet due) | 259200 |
| ORDER_REFUNDED | 0 | — | — | — |

D. Duplicate seed protection — PASS
Evidence: after the second application, ORDER_OLD = 1, ORDER_RECENT = 1 and TOTAL = 2. The integration test `0006 migration seeds paid orders at paid_at + 3 days, skips refunds, and is harmless to re-run` asserts the same fixtures, including a count unchanged after the second run. A separate test covers the Worker-deploys-first order: bootstrap creates the tables, then 0006 applied on top succeeds and seeds exactly 1 row for the existing paid order.

E. Stripe test purchase — BLOCKED
Missing access:
- Stripe test-mode credentials: `STRIPE_SECRET_KEY=sk_test_…` and `STRIPE_RESUME_WEBHOOK_SECRET`
- the Stripe CLI (`stripe listen --forward-to …/api/resume-builder/stripe/webhook`), or a staging Worker with a test-mode webhook endpoint
- a staging Worker bound to `tradehustl3-website-staging` with migrations 0004–0006 applied

None of these exist in this environment. No real checkout was performed.

Automated coverage only (not an integration pass): a signed-webhook test shows the order becomes `paid`, one active entitlement is created, exactly 1 review request exists (`scheduled_at ≈ now + 259200`), and a replayed event creates no duplicate. `a failing review queue never breaks payment fulfillment` makes every review SQL statement throw; the webhook still returns 200, the order is `paid`, and the entitlement is active.

F. Refund before email — BLOCKED
Missing access: `BREVO_API_KEY` for a safe test sender and a TRADE HUSTL3-owned QA inbox, on a staging Worker. Delivery could not be observed end to end.

Supporting local evidence (not a delivery pass): on the real local Worker, `/cdn-cgi/handler/scheduled` ran with two due invitations, one on a refunded order and one on a paid order.
- Exactly one delivery attempt was logged (`Review request delivery failed`, for the paid order, because no Brevo key is configured).
- The refunded order's invitation was never claimed (`sent_at` NULL, no token).
- The integration test `scheduler skips refunded orders…` sends 0 emails for a refunded order.

G. Brevo single email — BLOCKED
Missing access: same as F (`BREVO_API_KEY` and a TRADE HUSTL3 QA inbox).

Automated coverage only: the Brevo request is sent to the order email with subject "How did TRADE HUSTL3 work for you?". It contains a `https://tradehustl3.com/reviews?token=<43-char token>` link, the text "Positive, negative, and mixed feedback are all welcome", and "No discount, payment, reward, or other incentive is provided for leaving a review". It contains no 5-star request.

H. Duplicate scheduler protection — BLOCKED
Missing access: same as F.

Automated coverage only:
- Two sequential scheduler runs produce 1 email.
- Two overlapping runs (`Promise.all`) produce 1 email.
- A failed Brevo send releases the claim (`sent_at` and `token_hash` go back to NULL) so it can be retried.

I. Valid token — PASS
Evidence (real local Worker over HTTP; the token hash was inserted directly because the email step is blocked):
- `GET /api/resume-builder/reviews/request?token=…` → 200 `{"trade":"Electrical","defaultName":"Quinn Tester","verifiedPurchase":true}`
- `GET /reviews?token=…` → 200
- D1 stores only the SHA-256 hash, not the token.

J. Modified token — PASS
Evidence: one character changed → 404 `{"ok":false,"message":"This review link is invalid, expired, or already used."}`, with no review data. A missing token → 404.

K. Used token — PASS
Evidence: after one successful submission, resubmitting → 404 "invalid, expired, or already used", and the request lookup → 404. `customer_reviews` still has exactly 1 row for that request.

L. Expired token — PASS
Evidence: `sent_at` 31 days ago → 404. The integration test also shows 29 days → 200 and 31 days → 404, and that a refunded order's token → 404.

M. Private feedback — PASS
Evidence: submitted with `consentPublish=false` → 200 "Your feedback was saved privately and will not be published."
- **Stored row:** `status=pending`, `consent_publish=0`, `consent_resume_example=1`.
- **Founder approval attempt:** 409 "This customer did not give permission to publish the review."; the status stays `pending`.
- **Public API:** does not return it.

N. Pending publication consent — PASS
Evidence: submitted with `consentPublish=true` → 200 "submitted for moderation before anything can appear publicly".
- **Stored row:** `status=pending`, `consent_publish=1`.
- **Public API:** 0 reviews.
- **Rejected before any row was stored:**
  - `rating` 0 or 6 → 400
  - review text 19 or 1201 characters → 400
  - result 501 characters → 400
  - name 121 characters → 400
  - a cross-site `Origin` → 403
- **Accepted:** `rating` 1–5, a 20-character review, a 120-character name and a 500-character result (integration test).

O. Admin approval/public display — PASS
Evidence:
- **Admin API authorization:**
  - logged out → 401
  - normal customer → 403 (PATCH → 403)
  - `founder@tradehustl3.com` → 200
  - a customer listed in `REVIEW_ADMIN_EMAILS` → 200 (integration test)
- **Approval:** 200.
- **Public API response:** `{"ok":true,"reviews":[{"id":"…","name":"Quinn T.","trade":"Electrical","rating":4,"review":"I got a few calls after using the builder.","result":"A few callbacks so far.","verifiedCustomer":true}]}`. It has exactly those keys, and the wording is exactly as submitted. A scan for `email`, `user_id`, `resume_id`, `order_id`, `stripe`, `token`, `consent`, `status`, `approved_at`, the customer email, the order id and the request id found nothing.

P. Refund approved review — PASS
Evidence: after setting the order to `refunded`, the public API returns 0 reviews. The `customer_reviews` record still exists with `status=approved`; it is not deleted, it just no longer qualifies for display.

### Additional checks
- **Homepage with zero approved reviews:** the server HTML has no Jessica M./David R./Taylor S./Michael T./Marcus K./Chris L. and no `/testimonials/`. `CustomerReviews` renders nothing until the API returns approved reviews, and the production build output has 0 hits.
- **Homepage with one approved review:** the component renders the name, trade, stars, verbatim review, optional "Customer-reported result" and "✓ Verified TRADE HUSTL3 customer" (static test). This was not visually inspected in a browser.
- **`/admin/reviews`:** `<meta name="robots" content="noindex, nofollow, noarchive"/>`. `/reviews/admin` → 404.
- **Production smoke definitions** (`production-smoke.yml`, not run; no deploy):
  - `GET /`, `GET /reviews` and `GET /api/resume-builder/reviews/public` succeed
  - the public API response contains no `"email"`, `"user_id"`, `"order_id"` or `"token_hash"`
  - `/admin/reviews` has the robots directives above
  - the logged-out admin API returns 401
- **Normal Resume Builder regression:** the full automated suite passes. A manual browser run was BLOCKED because magic-link login needs Brevo and checkout needs Stripe test mode. No Resume Builder code was changed.

## Regression suite

npm audit: `npm audit --omit=dev --audit-level=high` → found 0 vulnerabilities
npm lint: `npm run lint` → pass, 0 problems
npm typecheck: `npm run typecheck` → pass
npm test: `npm test` → 448 tests, 448 pass, 0 fail (build included)
git diff --check: clean

## Release recommendation

NOT READY TO MERGE

The code-level release blocker, the early-email bootstrap bug, is fixed and covered by regression tests. A–D and I–P pass against a local D1 and the real Worker runtime. The remaining blockers need cloud test access this QA environment does not have:

1. **E:** a Stripe test-mode purchase through the real checkout on a staging Worker (needs `sk_test_…`, `STRIPE_RESUME_WEBHOOK_SECRET`, and the Stripe CLI or a staging webhook endpoint).
2. **F, G and H:** real Brevo delivery to a TRADE HUSTL3-owned QA inbox (needs `BREVO_API_KEY` on staging and the QA address).
3. **Migration 0006 human review:** apply it to the staging D1, which first needs 0004 and 0005, before production.
4. **Manual Resume Builder walkthrough on staging:** magic link, upload, preview, checkout, downloads, cover letter and corrections.

After those pass, re-run the checks and change the recommendation to READY TO MERGE.
