# Analytics definition changes

Record every change to what a tracked event means, so reports never compare
periods with different definitions as if they were the same.

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
