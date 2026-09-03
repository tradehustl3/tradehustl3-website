# TRADE HUSTL3

Official website for TRADE HUSTL3 — Built by Hustle, Backed by Trades.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local address printed by the development server.

## Analytics

GA4 is optional and loads only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set. For local development, add the variable to your local environment. For the live site, add `NEXT_PUBLIC_GA_MEASUREMENT_ID` as a Cloudflare build environment variable in the project dashboard, using the real GA4 Measurement ID for the property, then redeploy.

Standard page views include the current URL and its normal UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term`). Signup submissions preserve those values during the visit and send source, medium, and campaign attribution to Brevo.

## Email signup integration

The `/api/subscribe` endpoint stores normalized signups in D1 and creates or updates the matching Brevo contact. Configure these Cloudflare runtime values for production:

- `BREVO_API_KEY` as an encrypted secret.
- `BREVO_LIST_ID` as a regular variable containing the numeric website-subscriber list ID.

Brevo must contain the text attributes `INTEREST`, `SIGNUP_SOURCE`, `UTM_SOURCE`, `UTM_MEDIUM`, and `UTM_CAMPAIGN`.

Book-interest signups receive the gated seven-page preview (cover included) of *TRADE HUSTL3: 10 High-Opportunity Trades — 2026-2027 Edition*. The Worker serves the PDF from `worker/assets/trade-hustl3-free-sample.pdf` through `/api/free-sample`; direct public asset requests continue to redirect to the email gate.

## Production Brevo nurture automations

As of August 29, 2026, the two primary lead-magnet nurture paths are live in Brevo and tested before activation. Both start when a contact is added to the website subscriber list (`identified_contacts`, list #4), then use the `INTEREST` contact attribute to keep the funnels separated.

- **Top 10 Trades follow-up:** `INTEREST = Top 10 Trades` → wait 1 day → send the branded Top 10 Trades follow-up email → exit. The message links back to the free guide experience and presents the TRADE HUSTL3 Resume Builder as the next-step offer.
- **Book 7-Page Sample follow-up:** `INTEREST = Book 7-Page Sample` → wait 1 day → send the branded book-sample follow-up email → exit. The message links to `https://tradehustl3.com/book/sample/read` for the reader and `https://tradehustl3.com/book` for the full-book offer.
- Contacts that do not match the target `INTEREST` value exit the corresponding automation without receiving the wrong nurture message.
- Re-entry after exit is disabled for the book-sample automation to prevent repeat delivery of the same follow-up.
- Immediate resource delivery remains handled by the website flow; these Brevo workflows are the one-day nurture follow-ups, not the initial delivery mechanism.

Sender identity for these automations is `TRADE HUSTL3 <updates@tradehustl3.com>`.

Next measurement milestone: connect email-link clicks and downstream purchases to the originating funnel so guide-to-resume and sample-to-book conversion rates can be compared directly.

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

## Resume generation with Gemini

The Resume Builder uses Gemini through Google Cloud's Agent Platform API. Generation stays server-side and is deliberately bounded to one structured response per run: one candidate, low thinking, a 2,200-token output ceiling, and a JSON schema matching the resume document renderer. The existing deterministic validation rejects incomplete output and numeric claims that are not present in the customer's intake or correction request.

Configure these Cloudflare Worker runtime values:

- `RESUME_AI_PROVIDER=gemini` as a regular variable.
- `GOOGLE_CLOUD_PROJECT_ID=trade-hustl3-resume-ai` as a regular variable.
- `GOOGLE_CLOUD_LOCATION=global` as a regular variable.
- `GEMINI_MODEL=gemini-3.8-flash` as a regular variable.
- `GOOGLE_CLOUD_API_KEY` as an encrypted secret with its API restriction limited to the Agent Platform API. Never create a `NEXT_PUBLIC` version of this value or place it in browser code.

`ANTHROPIC_API_KEY` and `CLAUDE_MODEL` remain available as a temporary rollback path. Set `RESUME_AI_PROVIDER=anthropic` only if a staged rollback is required.

## Production build

```bash
npm run build
```
