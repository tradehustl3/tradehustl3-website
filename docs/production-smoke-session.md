# Production smoke session (signed-in Resume Builder smoke)

The post-deploy smoke run signs in as a synthetic account without email and walks
the review flow:

API health → smoke sign-in → open seeded resume → switch template (Field Pro →
Modern Trade) → inspect heading → change customization → confirm Download/Print
absent → open legacy resume → sign out.

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
| Clean analytics | Funnel events from the smoke session are dropped (202) and never reach Agent 1 metrics. The runner is API-only, so GA4/Meta pixels never load. |

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
3. Cloudflare edge: smoke traffic is currently challenged before it reaches the Worker
   (see `docs/pr186/README.md`). A narrowly scoped WAF custom rule that skips the
   challenge only when `X-Smoke-Token` equals the `SMOKE_BYPASS_TOKEN` value is required
   for any production smoke step to pass, including this one. The Worker endpoint still
   requires its own, separate secret.

Until step 2 is done, the workflow step logs a warning and skips.

To disable: delete the Cloudflare secret. The endpoint immediately returns 404.

## Running locally against another origin

```bash
SMOKE_ORIGIN=https://<origin> SMOKE_TEST_LOGIN_SECRET=<value> node tools/smoke/resume-builder-smoke.mjs
```

`SMOKE_DEBUG=1` prints stacks for unexpected runner errors (never secrets or bodies).
