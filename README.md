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

## Secure eBook fulfillment

The direct eBook button unlocks at midnight Eastern Time on September 15, 2026. Stripe fulfillment is handled by the Cloudflare Worker and never exposes the full book through public site assets.

Production setup:

- Create the private R2 bucket `tradehustl3books` and bind it to the Worker as `BOOKS`.
- Upload the customer PDF with the exact object key `TRADE-HUSTL3-COMPLETE-EBOOK.pdf`.
- Apply `drizzle/0000_curious_ravenous.sql` to the production D1 database.
- Add `STRIPE_WEBHOOK_SECRET` as an encrypted runtime secret.
- Add `STRIPE_EBOOK_PAYMENT_LINK_ID` as a regular runtime variable.
- Create a Stripe webhook for `checkout.session.completed` at `https://tradehustl3.com/api/stripe/webhook`.
- Set the Payment Link post-payment redirect to `https://tradehustl3.com/book/order-confirmed?session_id={CHECKOUT_SESSION_ID}`.

The webhook accepts only paid USD sessions for the configured Payment Link at exactly $9.99. Successful buyers are recorded in D1 and receive a private download link through Brevo. The PDF is streamed from R2 only when a valid paid-order token is presented.

## Resume Builder one-time payments

The integrated Resume Builder payment layer uses the existing Cloudflare Worker, D1 database, and Stripe webhook. It does not require Vercel or a second backend.

Current checkout options:

- `single` — $9.00 one-time payment.
- `bundle` — $15.00 one-time payment.

Flow:

1. `/resume` redirects to the integrated `/resume-builder` page.
2. The browser posts the customer email and selected plan to `/api/resume/checkout`.
3. The Worker creates a Stripe Checkout Session with `mode=payment`; the Stripe secret key never reaches browser code.
4. A pending order is stored in D1 before checkout begins.
5. Stripe sends `checkout.session.completed` to the existing `/api/stripe/webhook` endpoint.
6. The Worker validates the Stripe signature, product metadata, expected amount, currency, email, session ID, and matching D1 order before marking the order paid.
7. `/api/resume/order-status` issues a seven-day HttpOnly paid-access cookie only after the webhook has marked the order paid.
8. `/api/resume/access` is the server-side gate future resume-generation and export endpoints must check before doing paid work.

Production setup before merging/deploying:

- Apply `drizzle/0001_resume_orders.sql` to the production D1 database.
- Add `STRIPE_SECRET_KEY` as an encrypted Cloudflare runtime secret. Never commit the real value to GitHub or expose it in frontend code.
- Keep `STRIPE_WEBHOOK_SECRET` configured for the existing Stripe webhook endpoint.
- Confirm the Stripe webhook is subscribed to `checkout.session.completed`.
- Test both the $9 and $15 flows in Stripe test mode before using live keys.

The payment layer intentionally does not trust the Stripe success redirect. Paid access comes only from the signed webhook and the corresponding paid D1 record.

## Production build

```bash
npm run build
```
