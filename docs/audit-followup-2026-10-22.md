# October 22 website audit follow-up

Based on main at `2f204a5` (includes PRs #230 and #225).

## Prepared changes

- Four new WebP assets replace page references to the heavy guide artwork, book cover, author portrait, and HUSTL3 BOT. Original URLs remain available for existing external links. The BOT's alpha channel is retained.
- The ASE FAQ citation now links to the official https://ase.com/faqs/ page, reached through ASE's own navigation. Its former PDF URL returned 404.
- Root metadata no longer supplies a homepage canonical or explicit index/follow directives to every route. Public pages keep their own canonical; missing pages render a single noindex directive without a canonical.
- Public policy titles are explicitly branded, avoiding duplicate Resume Builder title suffixes. The HVAC title is shorter. Homepage, book, electrician, and general-labor descriptions are within 160 characters.
- The hub grid shows three live destinations, followed by one “Coming next” sentence.
- Site and transactional eBook copy use “Built by Hustle. Backed by Trades.” The published book title is unchanged.
- Resume hero pricing says “Just your email” before the price to unlock.
- Each jobsite-truth card links to its matching trade page.
- robots.txt omits Host. A short llms.txt lists public resources and current product terms.

## Image bytes

| Asset | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Top 10 Trades artwork | 1,997,778 | 130,598 | 93.5% |
| Book cover | 1,103,404 | 286,906 | 74.0% |
| Author portrait | 405,401 | 63,830 | 84.3% |
| HUSTL3 BOT | 230,882 | 119,194 | 48.4% |
| Combined | 3,737,465 | 600,528 | 83.9% |

These are file sizes, not measured full-page transfer totals or PageSpeed results.

## Verification

Rendered tests cover every URL emitted by the sitemap: successful response, branded title, one description of at most 160 decoded characters, and the correct canonical path. Separate tests cover missing top-level, resource, and Resume Builder routes, requiring HTTP 404, a single noindex directive, and no canonical. Existing rendered tests cover the revised hub and product copy.

The homepage, guide, and book production HTML were visually inspected in 390px frames with production CSS and image assets. This was layout-only QA with scripts omitted, not a full mobile interaction or performance test. Account creation and checkout were not exercised.

## Follow-ups

- Run mobile PageSpeed Insights on /, /top-10-trades, and /book after this version is deployed. The production domain cannot measure an unmerged patch.
- Review optional script deferral together with the existing first-party campaign-attribution gap. UTMs currently depend on GA bootstrap; delaying it without independent campaign capture could worsen attribution.
- Consider a narrowly scoped anonymous marketing-page edge cache in its own change. Current no-store rules intentionally protect freshness; authenticated pages, review/purchase state, consent behavior, and RSC variants need separate validation.
- Confirm ownership and availability before changing X/TikTok handles or substituting a LinkedIn company URL. Existing profile links are retained.
- Configure and verify a GA4 exploration for the five displayed stages separately. This patch preserves existing events; it does not claim that a new GA4 funnel report was created.
