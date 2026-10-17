# Production smoke session (signed-in Resume Builder smoke)

The post-deploy smoke run signs in as a synthetic account without email and walks
the review flow:

API health → smoke sign-in → open seeded resume → confirm Download/Print absent →
review page in a browser (no Download/Print controls) → switch template (Field Pro → Modern Trade) → inspect heading → change customization →
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

### Browser check of unpaid controls

After the API-level file checks, the runner opens `/resume-builder/review` for the
seeded unpaid resume in headless Chrome, signed in with the smoke session cookie
(`tools/smoke/review-ui.mjs`, driven over the DevTools protocol by
`tools/smoke/cdp-browser.mjs`). No browser dependency is installed: it uses Node's
built-in WebSocket and the runner's Chrome (`/usr/bin/google-chrome` on GitHub's ubuntu
runners; `SMOKE_CHROME_PATH` overrides it).

The browser cannot change anything on the server:

- every non-GET request the page makes is answered inside the browser with a 503 and
  never sent;
- third-party requests (GA4, Meta, Stripe, fonts) are blocked;
- downloads are denied and counted;
- `window.print()` is replaced with a counter.

The step passes only when all of these hold, both on load and after the checkout click:

- **Viewer renders.** The viewer group "Watermarked resume preview with locked lines"
  finishes (`aria-busy="false"`), a drawn canvas has visible ink, the toolbar reads
  "Protected watermarked preview", and Zoom in changes the zoom label (the page is
  hydrated).
- **No Download section.** No `.rb-downloads` / `.rb-download` element exists, visible or
  hidden.
- **No file links.** No link points at `/api/resume-builder/resumes/{id}/files/…` (other
  than the preview), and no element has a `download` attribute.
- **No native PDF viewer.** No `iframe`, `embed` or `object`, since those carry their own
  Download and Print buttons.
- **No usable Download/Print control.** No visible, enabled link, button or `role`
  button/link/menuitem has an accessible name matching `download`, `print` or
  `save as pdf`, except the checkout button below. No Print control is rendered at all,
  and `window.print()` is never called.
- **Checkout button behaves as checkout.** Unpaid customers see one download-named
  control, the sticky "Unlock & download" checkout button (`.rb-unlock-bar`), next to
  "Unlock full resume + cover letter — $9.99" (`#unlock-package`). Both are
  `<button type="button">` elements that call checkout. The runner clicks the visible
  one. That must send exactly one `POST /api/resume-builder/resumes/{id}/checkout`
  (answered in the browser, so no Stripe session is created) and show the intercepted
  message, with no navigation, no clean-file request and no download.
- **Customization stays usable.** The resume system picker has three enabled radios with
  Field Pro checked, and Font, Text size, Spacing and Accent color are enabled and show
  the API's saved style.
- **No state change.** The API reports the resume unpaid, without downloads or
  corrections, before and after the check, with the same AI usage, template and style.

Failure messages start with `API entitlement failure:` (the API granted access),
`UI regression:` (the page exposed it anyway), or `browser unavailable:` (no browser
could be started). A Cloudflare challenge on the page navigation reports the same
Cloudflare message as the API calls.

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
| Clean analytics | Funnel events from the smoke session are dropped (202) and never reach Agent 1 metrics. The runner blocks every third-party request in its browser step, so GA4/Meta pixels never load. |

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

The browser step needs Chrome or Chromium; set `SMOKE_CHROME_PATH` if it is not found.
`SMOKE_DEBUG=1` prints stacks for unexpected runner errors (never secrets or bodies).
