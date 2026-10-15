# Resume purchase protection

The Resume Builder records each checked policy agreement and clean-file delivery
and revokes clean-download/correction access when a signed Stripe dispute arrives.
The $9.99 price, first preview, matching cover letter, three shared corrections,
and existing partial/full-refund behavior remain the purchase contract.

## Agreement evidence

Both the guided intake and uploaded-resume path submit the checked agreement to
the authenticated, same-origin policy-acceptance endpoint before opening review.
Draft autosaves do not manufacture acceptance records. Repeating intake acceptance
for the same customer, resume and version preserves the first server timestamp.

Checkout requires its own unchecked-by-default Terms/Refund Policy agreement.
The server rejects missing, false, string-valued and stale-version consent. It
atomically stores the new pending order and the agreement before contacting
Stripe, so an evidence failure cannot create a Stripe checkout. The agreement is
bound to the signed-in customer, resume and order, with server time, version, exact
agreement wording and a refund-policy snapshot. Customer-supplied identity and
timestamps are ignored. Existing customers accept the current policy at checkout;
historical consent is never backfilled.

The protected preview has locked lines; the disclosure therefore says "protected
preview", not "full preview". The same disclosure is repeated on Stripe's submit
screen. Shared policy text in shared/purchase-terms.ts is used by the refund page
and saved snapshot. Bump PURCHASE_TERMS_VERSION whenever the linked policy bundle
or either agreement changes, and update the version/date metadata together.

## Delivery evidence

Clean resume and cover-letter PDF/DOCX responses record the authenticated customer,
resume, paid source order, file ID, format, byte count, stored SHA-256 and server
timestamp. Inline clean PDF views and attachment requests are distinct. Each
historical record retains its file version even after a correction or style change
replaces resume_files. Previews, unauthenticated/unpaid requests, missing files,
missing storage objects and revoked purchases do not produce delivery evidence.
An evidence-write failure prevents serving an unlogged clean file; retrying is safe.

This records a file prepared for a successful server response. It does not claim
that the browser received every byte or saved the file to disk. Use that exact
description when submitting evidence; an inline view is not an explicit download.
No raw IP address, user agent, resume text, card data or advertising event is added.

## Disputes and webhook order

The existing signature check runs before any dispute processing. Subscribe the
Resume Builder snapshot webhook to:

- checkout.session.completed
- checkout.session.async_payment_succeeded
- charge.refunded
- charge.dispute.created
- charge.dispute.funds_withdrawn

A signed dispute stores its payment ID, sets the matching Resume Builder order to
disputed and revokes its active entitlement in one D1 transaction. Full refunds
keep refunded status. Expanded PaymentIntent IDs are accepted; charge-only
notifications retrieve the charge with the existing server Stripe credential.
A failed lookup or database operation returns a retryable error without marking
the event processed. The credential needs charge-read permission for that fallback.

Duplicate events have no extra effects. A dispute received before checkout is
persisted and consulted during fulfillment, so a late paid event cannot activate
that order. A payment dispute is distinct from a merchant refund; disputed revenue
leaves the paid-order feed, while original paid_at and all evidence are retained.
Refund/paid replays never automatically restore disputed access.

This change suspends access when Stripe reports a dispute, including an inquiry
sent as charge.dispute.created. Resolution and any restoration after winning a
dispute are handled by support; this branch does not automatically decide or
submit bank evidence, issue refunds, or reinstate disputed purchases.

## Release order and staging check

1. Apply drizzle/0010_resume_purchase_protection.sql to staging D1 before deploying
   the candidate Worker. All statements are idempotent and seed no history.
2. Use a staging/test Stripe account and a staging customer. Complete the guided
   intake and uploaded-resume path, verifying unchecked consent cannot proceed.
3. On review, try every checkout button before checking the purchase agreement:
   each should focus the same agreement and create no checkout. Accept it, open
   Stripe and confirm the $9.99 price and protected-preview disclosure.
4. Complete a test payment. View clean PDFs and download all four files. Verify
   the acceptance is linked to the order and delivery formats/dispositions match.
5. Deliver a signed test dispute and retry it. All four clean downloads and
   corrections must be blocked. Repeat the paid notification: access stays blocked.
6. Test dispute-before-payment delivery order, an unrelated PaymentIntent, a
   partial refund, a full refund, and a temporary charge-lookup failure.
7. After review, apply the same forward migration to production before publishing
   the Worker, then enable the additional Stripe event subscriptions.

Migration, subscription changes, merges and production deployment are separate
release actions. On a code rollback, preserve the evidence tables and disputed
order/entitlement state; do not drop or invent evidence.

## Retrieve a purchase's evidence

Use the confirmed order_id in these parameterized, read-only queries. Evidence is
private and should only be accessed by an authorized support/operator workflow.

    SELECT order_id, email, amount_total, currency, status, stripe_session_id,
           stripe_payment_intent_id, paid_at
    FROM resume_orders WHERE order_id = ?;

    SELECT policy_version, agreement_text, policy_snapshot_json, accepted_at
    FROM resume_policy_acceptances WHERE order_id = ?;

    SELECT format, disposition, byte_size, sha256, served_at
    FROM resume_file_deliveries WHERE order_id = ? ORDER BY served_at, delivery_id;

    SELECT dispute_id, event_id, amount, currency, received_at
    FROM resume_dispute_events
    WHERE payment_intent_id = (SELECT stripe_payment_intent_id FROM resume_orders WHERE order_id = ?);

Keep a saved agreement and its snapshot together. If a historical purchase has
no acceptance/delivery record, report that gap instead of asserting acceptance or
download activity. Apply the purchase-record retention and data-request policy
to these records; the privacy page discloses their collection and use.

Stripe reference:
https://docs.stripe.com/api/disputes/object
https://docs.stripe.com/webhooks
