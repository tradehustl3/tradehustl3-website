# Marketing and conversion readiness

## Production event map

| Page or action | Meta event | Trigger | Parameters |
| --- | --- | --- | --- |
| Any full page load | `PageView` | Meta base code initializes | Pixel `2260020274539615` |
| `/resume-builder` | `ViewContent` | Product page client mount, once per browser session | `content_name=resume_builder`, `value=9.99`, `currency=USD` |
| Resume intake or preview | `ViewContent` | Stage mount, once per stage per browser session | `content_name=resume_builder`, stage category |
| `/book` | `ViewContent` | Book page client mount, once per browser session | `content_name=ebook`, `value=9.99`, `currency=USD` |
| Top Trades offer or book-interest preview offer | `ViewContent` | Offer enters the viewport | Funnel content name |
| Successful free-offer signup | `Lead` | `/api/subscribe` returns a 2xx response with `ok: true` | `content_name`, `content_category=lead_offer` |
| Resume checkout | `InitiateCheckout` | Server creates and returns a Stripe Checkout Session | `content_name=resume_builder`, session-deduped ID, `value=9.99`, `currency=USD` |
| Direct eBook checkout | `InitiateCheckout` | Customer follows the existing configured Stripe Payment Link | `content_name=ebook`, `value=9.99`, `currency=USD` |
| Resume purchase | `Purchase` | Authenticated status endpoint finds the exact paid order and active entitlement for the returned Stripe session | `transaction_id`, `content_name=resume_builder`, `value=9.99`, `currency=USD` |
| Direct eBook purchase | `Purchase` | Status endpoint finds the webhook-fulfilled, paid, unrefunded D1 order for the returned Stripe session | `transaction_id`, `content_name=ebook`, `value=9.99`, `currency=USD` |

GA4 receives `view_item`, `generate_lead`, `begin_checkout`, and `purchase` at the same meaningful milestones. Optional Google Ads labels remain disabled until real IDs are configured.

## Existing storage and attribution behavior

The current `subscribers` table contains `email`, `interest`, `source`, `status`, and `created_at`. This pass uses the existing `source` column to distinguish `book_sample`, `top_10_trades`, `general_interest`, and legacy `website` signups; no production migration is required. Brevo receives the same funnel source plus the existing UTM source, medium, and campaign attributes.

The browser preserves all five standard UTM parameters plus `gclid`, `gbraid`, `wbraid`, and `fbclid` in session storage. Resume Builder checkout copies available values into Stripe Checkout metadata. The current D1 schema does not persist a full first-touch/last-touch record, and the existing eBook Payment Link cannot attach those fields to its D1 order without changing the checkout architecture.

## Proposed future D1 attribution migration (not applied)

Add a new nullable, append-only `marketing_touchpoints` table keyed by a random `touchpoint_id`, with nullable `lead_email_hash`, `user_id`, `resume_order_id`, `ebook_order_id`, `product`, `funnel`, the five UTM fields, click-ID fields, `landing_path`, `referrer_host`, `agent_id`, `touch_type`, and timestamps. Do not store raw email in that table. Use first-party random IDs to connect a touchpoint to a lead or order only after the customer completes the corresponding action.

Backward compatibility: all fields are nullable, existing lead and order tables remain authoritative, and current funnels continue when no touchpoint exists. Rollout: add a numbered migration, deploy read-disabled dual writes, validate row counts in preview/test mode, enable reporting reads, then backfill only records with reliable keys. Rollback: disable writes and reads first; retain the append-only table for audit until reviewed, then remove it with a separate down migration if required.

For future human sales attribution, accept a short validated `agent_id` or signed referral code, preserve it with the same touchpoint, and resolve it against an allowlisted server-side agent record. Do not trust an arbitrary browser value for commissions.

## Dashboard and infrastructure verification required

- Meta Events Manager: use Test Events for Pixel `2260020274539615`; verify one `Lead` only after a successful response, `InitiateCheckout` at each checkout handoff, and one `Purchase` with the exact Stripe session ID, USD, and 9.99 value. Confirm domain verification and Aggregated Event Measurement priorities before campaigns.
- Gmail/Namecheap: create or verify the `support@tradehustl3.com` mailbox/forwarder, send inbound and outbound tests, verify SPF/DKIM/DMARC alignment, and confirm replies arrive in the monitored Gmail inbox. Repository code cannot verify this routing.
- Brevo: confirm sender authentication for the configured sender, list ID, and the required contact attributes. Test each funnel source, magic link, preview delivery, preorder confirmation, and release delivery. Confirm unsubscribe handling for nurture email.
- Stripe: in test mode, verify the Resume price is exactly $9.99 USD, the direct eBook Payment Link is exactly $9.99 USD, success redirects include `{CHECKOUT_SESSION_ID}`, and both webhook endpoints receive the configured paid/refund events. Do not use a live charge for QA.
- GA4: verify Realtime/DebugView for `generate_lead`, `begin_checkout`, and `purchase`, register any desired custom dimensions, exclude internal/test traffic, and confirm transaction-ID deduplication.
- Google Ads: create or import the documented conversions. If using direct tags, provide `AW-...` and the real labels through the listed build variables. Keep all conversion variables blank until then.
- Cloudflare/DNS: confirm the apex HTTPS redirect, canonical production hostname, D1/R2 bindings, encrypted runtime secrets, scheduled eBook release trigger, preview build variables, and CSP/network allowances for Meta, Google, Stripe, and Brevo endpoints.
