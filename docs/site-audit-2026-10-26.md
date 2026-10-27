# Website and link-preview audit — October 26, 2026 (Eastern)

Base: `208fc218dfd2ed67ef16ea89d0b95a72be9092d5` on main.

## Verified live before changes

- Crawled 33 URLs (including sitemap pages, internal destinations and read-only APIs) and 20 referenced images. All requested page/image URLs resolved successfully. The logged-out review-admin API returned the expected 401. No broken internal anchor targets or invalid JSON-LD were found.
- HTTP and www addresses redirected to the canonical HTTPS hostname.
- `/api/health` returned 200, healthy, with zero pending/dead-letter delivery jobs. This is an operational signal, not proof of checkout, email inbox receipt or AI generation.
- The homepage, share image and favicon returned 200 under ordinary, Googlebot, Facebook, WhatsApp and Twitter user-agent checks. These requests do not prove access from the platforms' actual crawler networks.
- Browser interaction confirmed the homepage Plumbing selector changes its example and CTA, the career-stage selector changes its recommendations, and the examples link navigates correctly. Browser-extension errors were excluded from site errors. Mobile interaction and payment were not tested.
- Checked 33 unique non-social external sources: 28 returned 200; NAA's two credential links and TSA's two links returned 403, and CareerOneStop returned 202. Those five remain unverified, not confirmed broken. Social login walls and the Stripe purchase destination were not used to assess link health.
- The latest main Test and Production Smoke workflow runs were green when inspected. The older production-verification document's assertion that every smoke run fails is therefore historical, not current runtime evidence.

## Confirmed defects fixed by this patch

1. **Image failures cached for a year.** The live `/optimized/audit-missing-image.webp` returned HTTP 404, HTML, and `Cache-Control: public, max-age=31536000, immutable`. The Worker applied that header to all optimized responses regardless of status or MIME type. Failed, redirected and non-image responses now receive browser/CDN `no-store`; only successful image responses receive the long cache policy.
2. **Stable favicon could remain stale for a year.** The Worker explicitly marked `/favicon.svg` immutable. Stable favicon paths now revalidate after one hour rather than declaring their content immutable.
3. **Book-sample preview dimensions were incorrect.** Metadata declared 1024×1536 for an 800×1200 cover. Share metadata now matches the actual JPEG dimensions. The Top 10 Trades share image also gains explicit dimensions and MIME type.

## Preview compatibility improvements

- Add a 96×96 PNG favicon derived from the existing TH3 icon and declare it in the server-rendered head. Existing ICO, 32px PNG and Apple touch icon remain available.
- Publish JPEG versions of the existing hub, Resume Builder, book and guide share artwork under new versioned URLs; declare `og:image:type=image/jpeg` and consistent Twitter images. On-page WebP artwork remains unchanged, and old image URLs remain available for previously shared links.
- Regression tests render every sitemap page and validate that preview metadata is present in the initial HTML head, points to a real JPEG with matching dimensions and stays within the file-size budget. Separate tests exercise error caching, HEAD requests and stable-icon refresh behavior.

The user's screenshot shows an entire missing message preview, not proof of a missing favicon file. These changes address confirmed caching/metadata defects and improve compatibility. They do **not** establish that WebP caused Google Messages to omit that card or guarantee previews in every messaging app. The original phone-side failure remains unreproduced.

## Remaining verification

- After an approved deployment, repeat public asset MIME/status/cache checks and share the canonical URL in Google Messages and Apple Messages. Old message cards can retain platform caches; a new asset URL does not force every platform to refetch an already-shared page.
- Confirm end-to-end verified-email login, resume generation, checkout, refund webhook and file delivery separately using approved test fixtures. No customer accounts, production payments or outbound emails were created in this audit.
- Recheck the five restricted external sources in an interactive browser before declaring their URLs invalid.
- Review existing open performance and dependency PRs separately; this patch does not merge unrelated changes.

References: [Apple rich previews](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages/), [Google favicon guidance](https://developers.google.com/search/docs/appearance/favicon-in-search).
