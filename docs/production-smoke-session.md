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
   (see `docs/pr186/README.md`). No smoke step passes until this is resolved. See
   "Cloudflare edge rule" below. The Worker endpoint still requires its own,
   separate secret either way.

Until step 2 is done, the workflow step logs a warning and skips.

## Cloudflare edge rule

### First: find which product issues the challenge

In the Cloudflare dashboard, open **Security → Analytics → Events**. Filter on the
smoke User-Agent `TRADE-HUSTL3-Production-Smoke` and read the **Service** field.

- **Bot Fight Mode** (Free plan): it cannot be skipped by any custom rule, whatever
  the expression (Cloudflare docs: "Bot Fight Mode cannot be skipped"). Do not add a
  rule; it would do nothing. Choose one of these instead (owner decision):
  - upgrade the zone to Pro and use Super Bot Fight Mode with the rule below, or
  - turn Bot Fight Mode off, which removes it for all visitors, or
  - accept that the production smoke stays blocked.
- **Super Bot Fight Mode** (Pro and above), or a managed challenge from a custom or
  managed rule: use the rule below.

### The rule (exact value match only)

Create a custom rule with the action **Skip**, placed first in the custom rules list:

```txt
(http.host eq "tradehustl3.com"
 and len(http.request.headers["x-smoke-token"]) eq 1
 and http.request.headers["x-smoke-token"][0] eq "<SMOKE_BYPASS_TOKEN value>")
```

Each clause has a job:

- `eq` is exact, case-sensitive equality on the whole value. Never use
  `contains`, `matches`, `wildcard`, `starts_with`, or a check that the header
  merely exists (`has_key`, `len(...) gt 0`). With any of those, anyone could add
  the header and skip the challenge.
- `len(...) eq 1` rejects requests that send the header twice, so no
  first-or-any-value ambiguity applies.
- `http.host` limits the rule to the production hostname.

Skip settings:

- Skip **only** "All Super Bot Fight Mode rules" (phase `http_request_sbfm`). If the
  challenge comes from a specific custom rule, place this rule above it and skip
  only "All remaining custom rules".
- Do **not** skip Managed Rules (`http_request_firewall_managed`) or rate limiting
  (`http_ratelimit`). Smoke traffic has no reason to bypass attack protection.
- Turn on **Log matching requests**, so every bypass is visible in Security Events.

### Secret handling

- `SMOKE_BYPASS_TOKEN` is a different value from `SMOKE_TEST_LOGIN_SECRET`. Generate
  32+ random characters. Leaking the edge token alone must not grant a sign-in.
- The value is stored in plain text inside the rule expression, so anyone with
  dashboard or API read access to WAF rules can see it. Keep that access to the owner.
- To rotate: update the GitHub secret and the rule expression together. A mismatch
  only fails the smoke run; it never opens access.

### Verify the rule once after creating it

Look at Security Events, not at status codes alone. A request that is not
challenged is not proof the rule matched, because Cloudflare does not challenge
every request.

1. A request with no header, or a wrong value (for example `X-Smoke-Token: wrong`),
   must still be challenged or logged as challenged. It must never appear as a
   skip-rule match.
2. The next Production Smoke run, which sends the correct value, must appear as a
   match of the skip rule and reach the Worker.

## Disable

To disable sign-in: delete the Cloudflare Worker secret `SMOKE_TEST_LOGIN_SECRET`. The
endpoint immediately returns 404. To remove the edge bypass: delete the skip rule.
Each control works on its own.

## Running locally against another origin

```bash
SMOKE_ORIGIN=https://<origin> SMOKE_TEST_LOGIN_SECRET=<value> node tools/smoke/resume-builder-smoke.mjs
```

`SMOKE_DEBUG=1` prints stacks for unexpected runner errors (never secrets or bodies).
