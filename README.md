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

- Create the private R2 bucket `tradehustl3-books` and bind it to the Worker as `BOOKS`.
- Upload the customer PDF with the exact object key `TRADE-HUSTL3-COMPLETE-EBOOK.pdf`.
- Apply `drizzle/0000_curious_ravenous.sql` to the production D1 database.
- Add `STRIPE_WEBHOOK_SECRET` as an encrypted runtime secret.
- Add `STRIPE_EBOOK_PAYMENT_LINK_ID` as a regular runtime variable.
- Create a Stripe webhook for `checkout.session.completed` at `https://tradehustl3.com/api/stripe/webhook`.
- Set the Payment Link post-payment redirect to `https://tradehustl3.com/book/order-confirmed?session_id={CHECKOUT_SESSION_ID}`.

The webhook accepts only paid USD sessions for the configured Payment Link at exactly $9.99. Successful buyers are recorded in D1 and receive a private download link through Brevo. The PDF is streamed from R2 only when a valid paid-order token is presented.

## Production build

```bash
npm run build
```
