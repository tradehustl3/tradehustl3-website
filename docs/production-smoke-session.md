# Production smoke session (signed-in Resume Builder smoke)

The post-deploy smoke run signs in as a synthetic account without email and walks
the review flow:

API health → smoke sign-in → open seeded resume → confirm Download/Print absent →
browser: unpaid review page has no Download/Print → switch template (Field Pro → Modern Trade) → inspect heading → change customization →
inspect rendered customization → switch template (→ Lead / Supervisor) → inspect heading → Lead / Supervisor rewrite
requires payment → open legacy resume → sign out.

Section headings follow the writing track, not the template. An unpaid look switch to
Lead / Supervisor keeps the Field Pro track (PROFESSIONAL SUMMARY, CORE SKILLS), so the
run asserts that `TECHNICAL & OPERATIONS COMPETENCIES` is absent and that the track
rewrite returns 402 without using a correction. The Lead track heading itself is
covered by the renderer tests (`tests/resume-templates-v2.test.ts`); the smoke fixture
is unpaid by design and cannot reach it.

Customization is checked in the rendered preview as well as in the saved values. The
runner renders the watermarked preview before and after the font / size / accent change,
in the same template, and compares a render signature extracted with pdf.js: body font
family, body text size, painted fill colors, every text size, fonts and page count, hashed
into a short fingerprint. Raw PDF bytes are not compared for this: pdf-lib writes creation
and modification dates, so two renders of identical input already differ. The step fails
if the fingerprint is unchanged, the body font did not change, the body size did not
grow, the requested accent (`#24543c`, Forest Green) is not painted, or the previous
accent is still painted. The fixture's core facts must appear in both renders, and the
resume must stay unpaid, without downloads, and with the same AI usage, template, and
track. The preview is rendered from the saved style on every request
(`serveProtectedPreview`), so this checks the same render customers see.

Download / Print are checked twice. The API step proves the server refuses the clean PDF,
DOCX and print view (404) and returns `downloads: null`. The browser step then opens the
same unpaid resume through the real customer page,
`/resume-builder/review?resume_id=…`, in headless Chrome at desktop (1280×900) and mobile
(390×844) sizes, and inspects the rendered DOM and every request the page made
(`tools/smoke/review-ui.mjs`, driven over the DevTools pipe by `tools/smoke/browser.mjs`, no
npm dependency). Product behavior it asserts, from `app/resume-builder/review/resume-review.tsx`:

- **Download** is removed, not disabled: no `.rb-downloads` / `.rb-download`, no element with
  a `download` attribute, no link or form to `/files/pdf` or `/files/docx` (resume or cover
  letter), and no button, link or menu item named Download / PDF / DOCX / Word, enabled or
  disabled. The checkout buttons "Unlock & download →" and "Unlock full resume + cover letter
  — $9.99" are allowed only by structure: a `type="button"` `<button>` inside `.rb-unlock-bar`
  or `.rb-unpaid-card`, with no href and no `download` attribute. They are never clicked.
- **Print** does not exist on the page: no control named Print (anywhere, enabled or
  disabled), no link to the print view (`/files/pdf?view=1`), and no `<iframe>`, `<embed>` or
  `<object>` showing a PDF. A native PDF viewer would bring its own Download and Print
  buttons; the unpaid preview is drawn into `<canvas>` by pdf.js instead.
- **Network**: the page loads the watermarked `/files/preview` (and, if built, the watermarked
  cover-letter `?view=1` preview), never a clean resume file, a cover-letter DOCX, a cover-letter
  PDF without `view=1`, or `/checkout`.
- **Still works**: the protected preview draws at least one page with the "Protected watermarked
  preview" toolbar and no error state; the customization fieldset and its four selects (font,
  text size, spacing, accent) are visible and enabled; the three templates (Field Pro, Modern
  Trade, Lead / Supervisor) are visible and enabled with exactly one selected. These are checked
  as enabled, not clicked: the API steps that follow make the same PATCH calls.
- **No state change**: before and after the page visit, the resume reports `paid: false`,
  `downloads: null`, and the same AI usage, corrections, template, track and style, and the
  clean PDF and DOCX still return 404.

Failure messages name their class: `UI regression (desktop|mobile)` (a Download/Print path is
visible or usable), `UI broken (…)` (viewer or free controls), `API entitlement failure` (server
state), `browser unavailable` / `browser check error` (runner problem, not a site result), and
the existing `Cloudflare challenge (cf-mitigated)` wording when the edge challenges the page.
The browser sends the session cookie and `X-Smoke-Token` only to the site's own origin and
blocks every third-party request (GA4, Meta), so smoke traffic never loads analytics.

The browser is the runner's installed Chrome or Chromium (GitHub's ubuntu runners ship Google
Chrome). Set `SMOKE_CHROME_PATH` to choose a binary.

- Endpoint: `POST /api/resume-builder/internal/smoke/session` (`worker/resume-smoke-session.ts`)
- Runner: `tools/smoke/resume-builder-smoke.mjs`
- Workflow step: "Verify signed-in Resume Builder review flow" in `.github/workflows/production-smoke.yml`

## Security model

| Control | Behavior |
| --- | --- |
| Off by default | Without `SMOKE_TEST_LOGIN_SECRET` (32+ chars) the path returns the same 404 as an unknown route. |
| Fixed identity | Always `smoke-test@tradehustl3.invalid`. Nothing in the request can select another account. |
| No email path | Magic-link requests for the reserved address return the generic response and create nothing. `.invalid` cannot receive mail. |
| Secret check | `Authorization: Bearer`, constant-time comparison (shared helper with the n8n endpoints). |
| Server-to-server only | Any `Origin` header → 403, so no web page can call it. |
| Rate limits | 10 attempts / 15 min per IP (checked before the secret); 20 sessions / hour globally. |
| Short sessions | 15 minutes (customer sessions: 14 days). Each sign-in revokes the previous smoke session; the runner signs out at the end, including after failures. |
| Data isolation | Writes are scoped to the synthetic user. A fixture id owned by any other account aborts the reset (409) before anything is rendered or written. |
| No payment tampering | If the smoke account ever has an active entitlement or paid order, the reset stops (409) instead of deleting payment records. |
| No AI, no credits | Fixtures are rendered directly by the PDF/DOCX renderers. |
| Clean analytics | Funnel events from the smoke session are dropped (202) and never reach Agent 1 metrics. The browser step blocks every third-party request, so GA4/Meta pixels never load. |

## Fixtures

Reset to a known state on every sign-in (fictional content, 555 phone, example.com email):

- **Current** `f18c1fc3-…` — template version 2, Field Pro, plain track, unpaid.
- **Legacy** `90e80559-…` — template version 1 (pre-V2 rendering path), navy theme/track, unpaid.

Unpaid-resume retention may delete them after 37 idle days; the next sign-in recreates them.

## One-time setup (requires owner approval)

1. Generate one random value, 32+ characters (for example `openssl rand -base64 48`).
2. Store it as the Cloudflare Worker secret `SMOKE_TEST_LOGIN_SECRET` and as the
   GitHub Actions repository secret `SMOKE_TEST_LOGIN_SECRET`. Do not paste the value
   anywhere else.
3. Cloudflare edge: Cloudflare Bot Fight Mode challenges smoke traffic before it reaches
   the Worker. On the free plan, Bot Fight Mode cannot be skipped by a WAF custom rule.
   The owner decided on 2026-10-06 to keep it on, so no production smoke step can pass
   automatically, including this one. Each run ends as "Smoke inconclusive - Cloudflare
   challenge". Verify each deploy manually using `docs/production-verification.md`. The
   upgrade path to automation (Pro plan, Super Bot Fight Mode, and a Skip rule keyed to
   `SMOKE_BYPASS_TOKEN`) is described there. The Worker endpoint still requires its own,
   separate secret.

Until step 2 is done, the workflow step logs a warning and skips.

To disable: delete the Cloudflare secret. The endpoint immediately returns 404.

## Running locally against another origin

```bash
SMOKE_ORIGIN=https://<origin> SMOKE_TEST_LOGIN_SECRET=<value> node tools/smoke/resume-builder-smoke.mjs
```

`SMOKE_DEBUG=1` prints stacks for unexpected runner errors (never secrets or bodies).
