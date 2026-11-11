# Analytics definition changes

Record every change to what a tracked event means, so reports never compare
periods with different definitions as if they were the same.

## 2026-11-11 — entry steps between a start and the email box are tracked

**Before:** on the hub homepage, `resume_builder_start` fires when the
"Start Your Free Resume Preview" area (`#resume-start`) is at least 40% on
screen. Since the 2026-11-10 restructure that section sits high on the page, so
most hub visitors trigger a start just by scrolling. Nothing recorded whether
anyone then clicked through to the email page (`/resume-builder/start`) or
typed in the email box. The start page's own `resume_builder_start` is usually
already used up for the session by the homepage, so it could not show the
arrival either.

**After:** three new first-party events, each once per browser session, with
no email address or other identifier in metadata:

| Event | Fires when | GA4 |
|---|---|---|
| `resume_start_click` | a link to `/resume-builder/start` on the homepage is clicked | not forwarded |
| `resume_email_page_view` | `/resume-builder/start` loads, from any link | not forwarded |
| `resume_email_entered` | the first character is typed or autofilled into the email box (start page or campaign homepage) | not forwarded |

Submitting the email is still `resume_auth_requested`.

The A01 funnel snapshot reports these under a new `entrySteps` object
(`startClicked`, `emailPageViewed`, `emailEntered`), separate from `counts` and
`signInSteps`, whose keys are unchanged.

**Reporting impact:** `resume_builder_start` keeps its current meaning; do not
read it as intent on the hub. Use `entrySteps.startClicked` as the real
hub-to-builder click. There is no earlier data for these steps; treat
2026-11-11 (the deploy date) as their start.

## 2026-11-10 — Hub homepage restructured around trade discovery

**Before:** the hub homepage (no `?trade=`) ran storefront → story → stage band →
the full Resume Builder sales page (hero, promises, steps, jobsite truths, catalog
proof, `#resume-start`, cover letter, Know Your Trade, outlook, guide CTA, final CTA).

**After:** storefront → story → stage band → Find Your Lane (`#trade-guides`) →
BLS outlook → Your First Steps → Know Your Trade → Free Guides (inline Top 10 and
book-sample signups) → Turn Skills Into Opportunity → purchase promises →
`#resume-start` → Built by a Tradesman. Campaign and trade-landing visits
(`?trade=`) keep the resume-first page unchanged.

- New `data-location` values on the hub: `find_your_lane`, `find_your_lane_credential`,
  `find_your_lane_trade_page`, `first_steps`, `first_steps_credential`,
  `opportunity_resume`, `opportunity_book`, `opportunity_book_kindle`,
  `built_by_a_tradesman`. Signup forms report `data-cta-location="homepage_free_guides"`.
- `hero`, `hero_trade_picker`, `jobsite_truths`, `homepage_catalog`,
  `cover_letter_proof`, `guide_signup` and `footer_cta` now fire only on `?trade=` visits.

**Reporting impact:** `resume_builder_start` on hub visits still fires when
`#resume-start` is 40% on screen, but that section now sits further down the page,
so hub start counts are expected to fall even if intent does not. Compare hub
starts before and after 2026-11-10 as different definitions; campaign starts
(`trigger="mount"`) are unaffected. Free-guide signups from the homepage are new
`generate_lead` sources, not a change to the existing pages' counts.

## 2026-11-03 — GA4 delivery outcome is recorded for every eligible funnel event

**Before:** when a Resume Builder funnel event was not forwarded to GA4, nothing
recorded why. D1 showed far more builder events than GA4 (for example, 114 starts
in D1 vs 0 in GA4 for Oct 19–25) with no way to explain the gap.

**After:** each GA4-eligible funnel event (`GA4_FUNNEL_EVENTS`) writes one row to
`ga4_delivery_outcomes` (migration 0012) with its event name, server time and
one fixed outcome:

- `sent`: forwarded to GA4;
- `no_consent`: the visitor opted out, sent no consent, or sent Global Privacy Control;
- `no_ga_cookie`: no GA cookies at all (tag blocked, bot, or a visit that never
  loaded a public page);
- `no_ga_session`: a GA client cookie but no live GA session cookie;
- `not_configured`: the Measurement Protocol API secret is missing.

No identifiers, cookies or request data are stored. The A01 funnel snapshot
reports these as `ga4Delivery` (`total`, `byOutcome`, `byEvent`), separate from
`counts`, and `null` until the migration is applied.

**Reporting impact:** none on existing counts or on what reaches GA4: the
forwarding rules are unchanged. Outcome data starts with this release; there is
no backfill. Expect `ga4Delivery.byOutcome.sent` to roughly match GA4's counts for
the same events and window.

## 2026-10-29 — sign-in steps are tracked; `sign_up` is stored first-party

**Before:** nothing between `resume_builder_start` and `resume_intake_started`
was recorded first-party. `sign_up` went to GA4 only (method always
`magic_link`). A visitor who typed an email but never signed in was invisible.

**After:** three first-party events cover the sign-in step, all once per
browser session and with no email address or other identifier in metadata:

| Event | Fires when | GA4 |
|---|---|---|
| `resume_auth_requested` | the sign-in email (code + link) was sent | not forwarded |
| `resume_auth_link_opened` | the confirmation page opened from the email link | not forwarded |
| `sign_up` | sign-in completed, by code or link; `metadata.auth_method` is `code` or `magic_link` | forwarded, `method` = `code` or `magic_link` |

The same release adds the 6-digit sign-in code, so `resume_auth_link_opened`
will be low by design: most visitors are expected to type the code instead.

The A01 funnel snapshot reports these under `signInSteps`
(`codeOrLinkRequested`, `linkOpened`, `signedIn`), separate from `counts`.

**Reporting impact:** there is no earlier data for these steps; treat
2026-10-29 as their start. GA4 `sign_up` with `method=code` first appears with
this release.

## 2026-10-21 — `resume_builder_start` no longer counts every homepage view

**Before (through 2026-10-21):** the homepage was the Resume Builder sales page,
and `resume_builder_start` fired on every homepage load (once per browser session).

**After:** the homepage is the TRADE HUSTL3 hub, and many visitors only read the
free resources. `resume_builder_start` now fires:

- on load, for campaign and trade-landing visits (`/?trade=<slug>`), which render
  the resume-first layout; and
- on hub visits, only when the Resume Builder account-start section
  (`#resume-start`) is at least 40% visible.

Deduplication (once per session) and the consent rules are unchanged: the event
still goes only to the first-party endpoint, which forwards to GA4 only when the
visitor allows optional tracking.

**Reporting impact:** expect fewer `resume_builder_start` events and a higher
start-to-intake rate after this release. Do not compare start counts or
start-based conversion rates across 2026-10-21 without noting this change.
Overall hub traffic is available from GA4 page views (for visitors who allow
optional tracking).

## Book-led homepage redesign

The hub homepage labels book preview, Top 10 Trades preview, Resume Builder, and newsletter interactions with an offer and placement. Resource forms emit `generate_lead` once per accepted request during the form instance. Acceptance can precede email delivery or Brevo confirmation. The `resource_open` event measures a click on the PDF or browser reader, using a fixed destination label. Form event payloads contain no email address, signup fields, or resource tokens.

The hub's Resume Builder entry moved higher on the page. Its existing `resume_builder_start` event now explicitly checks for at least 40% visibility. Compare hub start rates across this change with the placement and threshold in mind. The campaign page continues to record the builder entry on mount. Amazon and direct eBook CTA clicks remain separate from verified purchases.
