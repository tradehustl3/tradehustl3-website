# Plumbing resume example experiment

Review date: October 15, 2026 (America/Los_Angeles).
Base main: `28382d203b3e299f8cd667ae6f827aaa0ce61296`.
Branch: `growth/plumbing-resume-example-20261015`.

## Decision and scope

Improve the existing `/resume-builder/plumbing` page for the **plumbing resume**
cluster. Its newly returned query evidence spans several days and is stronger
than the other observed trade-specific clusters. Nine query impressions are
still a small sample, not a search-volume estimate or proof of commercial value.

The existing page already has plumbing skills, tools, credentials, FAQs and
individual accomplishment bullets, but no complete resume example. Add one
original fill-in apprentice example, advice for helper, service, construction
and lead roles, and a way to quantify work from real records. Align the title,
description, single H1 and FAQs with that content. Reuse the existing example
component, its builder handoff, internal links and FAQ schema. Update only the
plumbing sitemap date. No new URL, component, style, dependency, payment code,
analytics transport, credential, deployment setting or role-page expansion is
part of this experiment.

The homepage and `/resume-examples` remain the all-trades discovery surfaces.
HVAC/refrigeration, electrical, plumbing, construction/carpentry, facilities,
welding/fabrication and general labor/maintenance remain peer trade guides.
The other six detailed guides are unchanged. The SEO Library inventory and
index-status audit remain prerequisites for broader expansion.

## Fresh evidence

Windsor.ai reads used GA4 property `551179421` and Search Console domain
`sc-domain:tradehustl3.com`. Date filters were October 8–14 (7 days) and
September 17–October 14 (28 days). Search Console used the supported
`include_fresh_data=true` option, so recent rows may be revised. No paid or
forced-hourly refresh was requested.

### Search Console

| Query | Page | 7-day impressions | Clicks | Average position |
| --- | --- | ---: | ---: | ---: |
| plumbing resume | /resume-builder/plumbing | 7 | 0 | 72.57 |
| apprentice plumber resume | /resume-builder/plumbing | 1 | 0 | 66 |
| plumbing skills for resume | /resume-builder/plumbing | 1 | 0 | 76 |
| facility maintenance resume | /resume-builder/facilities-maintenance | 1 | 0 | 43 |
| tradesman resume | /resume-examples/skilled-trades | 1 | 0 | 96 |

The plumbing query rows returned in the 28-day pull are the same nine
impressions. The main query appeared on October 9, 13 and 14. The skills query
appeared October 12; the apprentice query appeared October 13. Page-level
plumbing rows total 11 impressions and zero clicks over the two windows.
Query-level reporting is incomplete; do not force its totals to match pages.

A second read with `include_fresh_data=false` returned **six** plumbing-cluster
impressions: four for the main query at position 74, one apprentice impression
at 66 and one skills impression at 76, all without clicks. The other three
main-query impressions are therefore preliminary, not finalized demand.

No visible high-intent query rows were returned for the other five core trades
in these pulls. That is missing evidence, not proof of no demand. Facilities
already received an example in PR #204 and a separate writing guide in #207;
plumbing rotates the next improvement to another trade.

Sitewide page-row totals: 4 clicks / 24 impressions for 7 days, and
23 clicks / 126 impressions for 28 days. These include brand and policy pages;
they are not resume-product conversions or a clean nonbrand total. The latest
returned Search Console date is October 14. The prior report returned only
through October 11, so newly available days affect comparisons.

### GA4 and data health

| Metric | Prior 7-day report, Oct 7–13 | Current 7 days, Oct 8–14 | Current 28 days, Sep 17–Oct 14 |
| --- | ---: | ---: | ---: |
| Active users | 9 | 9 | 32 |
| Sessions | 30 | 35 | 70 |
| Engaged sessions | 16 | 16 | 29 |
| Views | 42 | 51 | 89 |
| Builder-start users | 2 | 1 | 5 |

Current 7-day CTA clicks: 11 events from 2 users; `form_start`: 4 events from
2 users. No intake-completion, preview, checkout or purchase event was returned
in either window. These event aggregates are not a linked user cohort.
`form_start` can also originate in a signup form.

GA4 returned activity on October 14 (6 sessions, 10 views, 21 events), so it
is not entirely stale. It still has no activity rows for September 23–October 5,
which prevents clean 28-day traffic comparisons. Current main still excludes
private intake/review/confirmation/payment routes from loading GA4; PR #133
remains open. First-party funnel telemetry can run independently. Missing
downstream GA4 events therefore do not prove abandonment or generation failure.
No plumbing landing session was returned in the current 7-day landing-page
report. One facilities landing session was returned, without engagement.

### Revenue truth

A read-only check of the connected live TRADE HUSTL3 Stripe account returned
all charges (`has_more=false`). Its only charge remains the fully refunded
August 26 test. There were **zero new charges and $0 gross receipts in both
requested windows**. This is the connected Stripe account's charge evidence,
not an estimate from GA4 and not a claim about unrelated business income.

## Architecture, competitors and production checks

Inspected current main, repository paths, README, contributor-file locations,
package/build/test scripts, the seven content objects and shared renderer,
plumbing route, metadata/schema generation, sitemap and open PRs. No AGENTS.md
was present in the repository or checked ancestors. No plumbing branch or
overlapping open content PR was returned before creating this branch.

Current competitors checked directly:

- [BeamJobs plumber examples](https://www.beamjobs.com/resumes/plumber-resume-examples):
  seven examples spanning apprentice/helper, journeyman/master and commercial
  roles, with skill lists, bullets, PDF/template links and builder CTAs.
- [HVACHires plumber resume guide](https://www.hvachires.com/career-guides/plumber/plumber-resume/):
  apprentice, journeyman and master/foreman examples with credential guidance.
- [OSHA Outreach program](https://www.osha.gov/training/outreach): the official
  source describes 10-hour and 30-hour course completion cards; the plumbing
  credential label now uses that wording.

These are substantive competitors. This patch fixes a visible gap in our own
page, rather than claiming the search results have weak competition. Its
potential advantage is practical, editable evidence of supervised work and
record-backed hours with the transparent $9.99 offer. That is a hypothesis,
not proven conversion lift. Competitor copy and example numbers are not reused.

PR #204 was merged October 14 at 17:44 UTC and #207 at 18:09 UTC. Live GETs
returned HTTP 200, the expected new content and correct canonicals for the
facilities example and maintenance-writing guide. The existing plumbing guide
also returned 200 with its current content and canonical.

[Current-main Test #515](https://github.com/tradehustl3/tradehustl3-website/actions/runs/38612765493)
passed. [Production Smoke #358](https://github.com/tradehustl3/tradehustl3-website/actions/runs/38612901314)
passed its public checks and authenticated seeded-resume flow, including
template switching, text extraction and customization. This is stronger
evidence than the earlier Cloudflare-blocked smoke. It uses a seeded resume
and smoke sign-in; it does not establish real email delivery, new AI
generation or a paid checkout. No paid generation or checkout test was run.

## Measurement after a reviewed release

Record the actual production release date before attributing results. Compare
equal 7- and 28-day windows after release, allowing for recrawling/reporting:

1. Plumbing query/page impressions, clicks and CTR against the 9-query /
   11-page-impression, zero-click baseline. Observe positions alongside counts;
   the current 66–77 samples do not establish a stable ranking trend.
2. `cta_click` with `data-location=plumbing_hero_resume_example` and
   `data-item=resume_builder_plumbing`. This marker already comes from the
   shared example component; the underlying analytics wiring is unchanged.
3. Attributed builder starts and first-party intake/preview/checkout records.
   Do not divide unrelated GA4 aggregates to invent a page conversion rate.
4. Stripe-confirmed paid charges, gross receipts and refunds reported separately.

The facilities changes are live, but there is no defensible post-release
ranking or sales result yet. Plumbing is showing search exposure before this
patch. Neither observation proves an experiment has worked. Expected impact:
a more useful example/skills landing page and a clearer path to the existing
builder, with ranking and sales effects still to be measured.

## Distribution drafts — prepared, not published

Use only after the reviewed plumbing change is released and the customer
journey is verified. No external post or contact is authorized by this record.

**TRADE HUSTL3 LinkedIn company-page organic feed:**

Plumbing helper or apprentice? Show the materials you worked with, tasks you
completed under supervision, and field hours your records support. Our
plumbing resume guide brings those details into one fill-in example, with
advice for service and construction roles. Build and preview free; $9.99 once
unlocks your resume and matching cover letter as PDF and DOCX. No subscription.
https://tradehustl3.com/resume-builder/plumbing?utm_source=linkedin&utm_medium=organic_social&utm_campaign=plumbing_resume_example

**TRADE HUSTL3 Facebook business-page organic feed:**

From rough-in to trim, show the work you actually did. See a complete apprentice
plumber resume example, choose relevant plumbing skills, and describe your
hours and completed jobs honestly. Preview your own resume free, then unlock
your resume and matching cover letter for $9.99 once. No subscription.
https://tradehustl3.com/resume-builder/plumbing?utm_source=facebook&utm_medium=organic_social&utm_campaign=plumbing_resume_example

**@tradehustl3 Instagram organic-feed caption:**

PIPE MATERIALS. TOOLS. SUPERVISED TASKS. VERIFIED HOURS.
Put the work you actually did on your plumbing resume. Explore the apprentice
example through the profile link, then build your free preview. $9.99 once
unlocks your resume and matching cover letter. No subscription.

Place the following URL in the Instagram profile link or a Story link sticker;
do not rely on a caption URL being clickable:
https://tradehustl3.com/resume-builder/plumbing?utm_source=instagram&utm_medium=organic_social&utm_campaign=plumbing_resume_example

## Validation

- Production build and all **618 tests passed**. The rendered landing-page
  checks cover metadata, one H1, the existing canonical, supervised scope,
  visible FAQ/schema agreement, the measured plumbing CTA, sibling discovery
  and sitemap uniqueness.
- Lint, TypeScript and whitespace/diff checks passed.
- Worker gzip: **2,293,108 bytes**, below the conservative 3 MiB budget.
- Production dependency audit passed the high-severity threshold. Three
  existing moderate findings remain in the mammoth dependency chain; this
  experiment changes no dependencies.
- Browser checks passed at 320, 390, 820 and 1440 pixels: HTTP 200, one H1,
  no horizontal overflow, matching visible FAQs/schema, no uncaught browser
  errors, and CTA navigation to `/?trade=plumbing#resume-start`. Desktop and
  phone example screenshots were visually reviewed.

Browser QA served the built Worker through a local HTTP adapter with local
static assets. Third-party requests were blocked to avoid test analytics.
These checks validate rendering and navigation, not production mail, new AI
generation, authentication or paid Stripe checkout. No merge, deployment,
posting, secret change or spending is part of this run.
