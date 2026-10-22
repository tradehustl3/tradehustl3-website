# Analytics definition changes

Record every change to what a tracked event means, so reports never compare
periods with different definitions as if they were the same.

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
