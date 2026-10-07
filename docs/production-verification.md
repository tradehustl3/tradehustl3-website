# Production verification after a deploy

## Why this exists

`tradehustl3.com` runs Cloudflare **Bot Fight Mode** (free plan). It challenges
GitHub Actions runners at the edge, before requests reach the Worker, and on the
free plan it **cannot be bypassed by a WAF custom rule**. Cloudflare docs: Bot Fight
Mode "cannot be customized, adjusted, or reconfigured via WAF custom rules"; only
Super Bot Fight Mode (Pro and above) supports a Skip exception.

Decision (owner, 2026-10-06): keep Bot Fight Mode on and stay on the free plan.
Security takes priority over automation. Turning Bot Fight Mode off to make the
automated smoke pass was rejected.

Consequence: the **Production Smoke** run shows a red "failure" status on every
deploy, with the error title `Smoke inconclusive - Cloudflare challenge`. That result means the
site was not checked. It does not mean the site is down, and it never counts as a
pass. After every production deploy, run the manual verification below.

To automate again later: upgrade the zone to Pro, enable Super Bot Fight Mode, and
add a WAF custom rule with the **Skip** action (Super Bot Fight Mode) that matches
only `http.request.headers["x-smoke-token"]` equal to the `SMOKE_BYPASS_TOKEN`
GitHub secret on host `tradehustl3.com`.

## Manual verification (about 2 minutes)

1. Confirm Cloudflare **Workers Builds** succeeded for the merge commit on `main`.
2. From a machine that can reach the live site, run this in Claude Code or Codex
   inside the repo. Keep auto-approve off for anything that writes.

```
READ-ONLY. Do not edit files, commit, push, or merge anything.
Production verification for https://tradehustl3.com after a deploy.
1. curl -sS -o /dev/null -w '%{http_code}' for: /, /resume-builder/intake, /reviews, /book, /privacy. Each must be 200. Then curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' https://tradehustl3.com/resume-builder must be 308 to https://tradehustl3.com/#resume-start (intentional permanent redirect: the homepage is the builder entry point).
2. curl -s https://tradehustl3.com/ (Cache-Control: no-cache): page contains "Continue with email" and does NOT contain "Create account &amp; continue".
3. curl -s https://tradehustl3.com/resume-builder/intake contains "Upload your resume once." (the intake heading).
4. curl -sI https://tradehustl3.com/ : print connect-src from Content-Security-Policy. It must include https://analytics.google.com, https://*.analytics.google.com and https://*.google-analytics.com.
5. curl -s https://tradehustl3.com/api/resume-builder/reviews/public : valid JSON with a "reviews" array and none of the strings "email", "user_id", "order_id", "token_hash" as keys.
6. curl -s -o /dev/null -w '%{http_code}' https://tradehustl3.com/api/resume-builder/reviews/admin must be 401 (logged out).
7. Load https://tradehustl3.com/ in headless Chrome, wait 8 seconds, report every request to analytics.google.com and *.google-analytics.com with its HTTP status, and any console errors containing "Content Security Policy".
Report a PASS/FAIL table, one row per check.
```

3. Expected results:
   - Checks 1-6 pass.
   - Check 7: the GA4 `g/collect` request returns 204 or 200.
   - The only CSP console errors are for `stats.g.doubleclick.net` or `www.google.com`. Google Signals and ads endpoints are intentionally blocked.
4. If any check fails, treat the deploy as broken. Use **Revert** on the PR in GitHub and redeploy.

The signed-in review-flow smoke (`docs/production-smoke-session.md`) is challenged
the same way and cannot be replaced by the steps above. It needs the Pro upgrade
path to run automatically.
