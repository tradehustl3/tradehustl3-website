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

Standard page views include the current URL and its normal UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term`). Signup submissions also preserve those values in hidden form fields during the visit.

## Production build

```bash
npm run build
```
