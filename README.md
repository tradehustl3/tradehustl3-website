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

## Production build

```bash
npm run build
```
