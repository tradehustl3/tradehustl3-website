# Facility maintenance example experiment

Review date: October 13, 2026. Base: `d308bb1f9fa182ac531e2851dd0e3328ca5a08aa`.

## Hypothesis and scope

The existing `/resume-builder/facilities-maintenance` page has skills, tools,
credentials, FAQs, and individual accomplishment bullets, but lacks a complete
resume example. A clearly labelled fill-in example may serve example-seeking
visitors better and help them enter the existing builder with the correct trade.
This is an exploratory improvement, not a proven ranking or conversion winner.

The patch adds one complete example, guidance for apartment, commercial and
warehouse-building work, and advice by experience level. It explains how to
calculate PM completion from real records. It aligns metadata and the H1 with
the example, adds one measured builder CTA and links to the all-trades guide and
career catalog. The visible FAQs and FAQ schema use the same content. Only this
page's sitemap modification date changes.

No new URL is introduced. The homepage/catalog still own all-trades discovery;
this route owns facility/building-maintenance intent. Warehouse building care
is distinguished from the existing Industrial & Warehouse Maintenance family.
The other six detailed trade pages keep their existing content and layout.
The complete SEO Library inventory and Google index-status audit remain open;
this patch does not authorize role-page expansion.

## Baseline evidence

Windsor.ai Search Console read on October 13, covering September 15–October 12:

| Query | Page | Date | Impressions | Clicks | Position |
| --- | --- | --- | ---: | ---: | ---: |
| facility maintenance resume | /resume-builder/facilities-maintenance | October 11 | 1 | 0 | 43 |
| plumbing resume | /resume-builder/plumbing | October 9 | 1 | 0 | 77 |
| tradesman resume | /resume-examples/skilled-trades | October 10 | 1 | 0 | 96 |

The facilities row is present only with `include_fresh_data=true` and is
preliminary. It has not repeated; do not infer search volume or stable ranking.
An hourly forced refresh is unavailable on the Windsor trial plan. A normal
read with the connector's fresh-data option was used instead.

GA4, October 6–12: three users triggered `resume_builder_start`; two users
triggered five `form_start` events. No intake-completion, preview,
checkout or purchase event was returned. These are separate event aggregates,
not a matched user cohort, and `form_start` does not prove resume intake began;
the signup components also emit it. Code inspection confirms that
`app/google-analytics.tsx` excludes the private intake, review, confirmation and
payment-confirmed routes from loading GA4. `funnel-analytics.tsx` can still send
first-party telemetry when `window.gtag` is absent. Missing GA4 downstream
events therefore cannot establish actual customer abandonment or a generation
failure; use backend funnel evidence and a real production journey to verify.
GA4 revenue is not used to establish business gross; Stripe was not checked in
this page experiment.

Compared with the October 5–11 report, sitewide sessions rose 26→32, engaged
sessions 12→17, and views 31→44; builder starters stayed at three. The historical
GA4 reporting gap prevents clean conclusions from rolling 28-day declines.

Competitor pages checked October 13:

- [BeamJobs facilities manager examples](https://www.beamjobs.com/resumes/facilities-manager-resume-examples)
- [Limble facility maintenance examples](https://limble.com/learn/resume-examples)

The broader search contains substantive maintenance-resume competitors. The
earlier exact-query sample of unrelated results is not proof of weak competition.
Original fill-in copy and distinct building-setting advice are this experiment's
useful addition; no competitor content or performance claims are copied.

## Measurement after a reviewed release

Record the actual production release date before attributing any result.
Compare equal windows after release, allowing time for crawling:

1. Query/page impressions and clicks for facility/facilities/building-maintenance
   resume terms. Observe whether the preliminary position 43 repeats. Evaluate
   position alongside impressions; low-volume averages can be volatile.
2. `cta_click` with `data-location=facilities_hero_resume_example` and
   `data-item=resume_builder_facilities_maintenance`.
3. Builder starts, intake completions, previews and checkout events from that
   landing page where attribution is available. Do not infer a cohort from
   unrelated event totals.
4. Stripe-confirmed purchases and gross receipts, with refunds reported
   separately, once the financial source is available.

No impression threshold, ranking improvement or sale is guaranteed.

## Production evidence and distribution

[Production Smoke #347](https://github.com/tradehustl3/tradehustl3-website/actions/runs/38191815918)
hit a Cloudflare challenge at the homepage on October 12. Signed-in checks were
skipped. This does not establish an application outage or certify the customer
journey. Login email delivery was restored previously, but a complete
login→intake→preview→checkout journey remains unverified in this review.

The following drafts are for owner review. They were not posted. Confirm a
working customer journey and the released example before using them.

**TRADE HUSTL3 LinkedIn company feed:**

Facility maintenance covers more than a list of repairs. Show the building
systems you service, the work orders you close, the PMs you complete, and the
software you use. Our facility-maintenance resume guide includes a fill-in
example and advice for apartment, commercial, and warehouse-building work.
Build and preview free; unlock your resume and matching cover letter as PDF
and DOCX for $9.99 once. No subscription.
https://tradehustl3.com/resume-builder/facilities-maintenance?utm_source=linkedin&utm_medium=organic_social&utm_campaign=facility_resume_example

**TRADE HUSTL3 Facebook page / @tradehustl3 Instagram feed:**

Work orders. PM routes. Building systems. CMMS.
Turn the work you actually do into a clearer facility-maintenance resume.
See a fill-in example, then build your free preview. $9.99 once to unlock your
resume and matching cover letter. No subscription.

Use the facilities guide URL with `utm_source=facebook` in the Facebook post.
For Instagram, place the guide URL with `utm_source=instagram` in the profile
link or a Story link sticker; refer to that link in the caption. Use
`utm_medium=organic_social&utm_campaign=facility_resume_example` for both.

## Validation

- Production build and all 607 tests passed, including the rendered example,
  one H1, exact canonical/metadata, visible FAQ/schema agreement, facilities
  CTA routing/measurement, sibling isolation, and one existing sitemap URL.
- Lint, TypeScript, and whitespace/diff checks passed.
- Worker gzip: 2,292,792 bytes, below the 3 MiB check.
- Production dependency audit passes the high-severity threshold. Three
  existing moderate findings remain in the mammoth dependency chain;
  dependencies are unchanged.
- Browser checks passed at 320, 390, 820 and 1440 pixels: HTTP 200, one H1,
  no horizontal overflow, no uncaught browser errors, and the new example CTA
  navigates to `/?trade=facilities-maintenance#resume-start`. Third-party
  analytics requests were blocked during local QA to avoid creating test traffic.
  Desktop and phone screenshots were visually reviewed.

Local rendered tests verify content, metadata, schema and CTA routing; they
cannot certify production authentication, email delivery, AI generation, or
Stripe checkout. This experiment remains a draft for review.
