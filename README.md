# TRADE HUSTL3

Official website for TRADE HUSTL3 — Built by Hustle, Backed by Trades.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local address printed by the development server.

## Analytics and conversion tracking

The production GA4 Measurement ID defaults to `G-PHLN0C7BWF` and can be overridden with `NEXT_PUBLIC_GA_MEASUREMENT_ID`. The Meta base Pixel uses ID `2260020274539615`. Conversion helpers emit no email address or other customer-entered PII.

Standard page views include the current URL and its normal UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term`). The browser also preserves `gclid`, `gbraid`, `wbraid`, and `fbclid` for the current visit without overwriting query-string values. Signup submissions send their distinct funnel source plus source, medium, and campaign attribution to Brevo. Resume Builder checkout sessions receive the available campaign and click identifiers as non-PII Stripe metadata.

Google Ads remains disabled until real values are supplied. Set `NEXT_PUBLIC_GOOGLE_ADS_ID` and only the conversion labels that exist in Google Ads, then redeploy. Alternatively, import the GA4 `generate_lead`, `begin_checkout`, and `purchase` events into Google Ads; do not enable a direct label and import the same GA4 conversion as Primary at the same time.

See `docs/marketing-readiness.md` for the event map, dashboard verification steps, and the proposed future D1 attribution design.

## Email signup integration

The `/api/subscribe` endpoint stores normalized signups in D1 and creates or updates the matching Brevo contact. Configure these Cloudflare runtime values for production:

- `BREVO_API_KEY` as an encrypted secret.
- `BREVO_LIST_ID` as a regular variable containing the numeric website-subscriber list ID.

Brevo must contain the text attributes `INTEREST`, `SIGNUP_SOURCE`, `UTM_SOURCE`, `UTM_MEDIUM`, and `UTM_CAMPAIGN`. `SIGNUP_SOURCE` receives `book_sample`, `top_10_trades`, `general_interest`, or the legacy `website` fallback.

Book-interest signups receive the gated seven-page preview (cover included) of *TRADE HUSTL3: 10 High-Opportunity Trades — 2026-2027 Edition*. The Worker serves the PDF from `worker/assets/trade-hustl3-free-sample.pdf` through `/api/free-sample`; direct public asset requests continue to redirect to the email gate.

## Secure eBook preorder fulfillment

The $9.99 direct eBook preorder is charged at checkout and delivered on September 15, 2026. Stripe fulfillment is handled by the Cloudflare Worker, and the full book is never exposed through public site assets.

Production setup:

- Create the private R2 bucket `tradehustl3books` and bind it to the Worker as `BOOKS`.
- Upload the customer PDF with the exact object key `TRADE-HUSTL3-COMPLETE-EBOOK.pdf`.
- Apply the numbered D1 migrations through `drizzle/0003_ebook_refund_safety.sql` in order. Keep `drizzle/0003_ebook_refund_safety_down.sql` as the reviewed rollback procedure; do not run it during deployment.
- Add `STRIPE_WEBHOOK_SECRET` as an encrypted runtime secret.
- Add `STRIPE_EBOOK_PAYMENT_LINK_ID` as a regular runtime variable.
- Create one Stripe webhook at `https://tradehustl3.com/api/stripe/webhook` subscribed to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `charge.refunded`.
- Set the Payment Link post-payment redirect to `https://tradehustl3.com/book/order-confirmed?session_id={CHECKOUT_SESSION_ID}`.
- Confirm the deployed Worker has the `*/5 * * * *` Cron Trigger from `vite.config.ts`.

The webhook accepts only paid USD sessions for the configured Payment Link at exactly $9.99. Successful preorder customers are recorded in D1 and receive an immediate confirmation through Brevo. The release sweep sends a private download link only to orders that remain fully paid. A full refund revokes pending delivery and download access; a partial refund records the refunded amount while leaving access active. Refund events are stored separately so a refund delivered before its matching checkout event is still reconciled safely.

Before enabling the public preorder button, run a Stripe test-mode checkout, delayed-payment success, full-refund, partial-refund, duplicate-event, and simulated release test. Check for older rows that cannot yet be correlated to refunds with:

```sql
SELECT stripe_session_id, email
FROM ebook_orders
WHERE stripe_payment_intent_id IS NULL;
```

## Production build

```bash
npm run build
```
