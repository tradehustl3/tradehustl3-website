import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const testWorkflow = new URL("../.github/workflows/test.yml", import.meta.url);
const smokeWorkflow = new URL("../.github/workflows/production-smoke.yml", import.meta.url);
const viteConfig = new URL("../vite.config.ts", import.meta.url);

test("main and pull requests are protected by the repository test workflow", async () => {
  const source = await readFile(testWorkflow, "utf8");
  assert.match(source, /pull_request:/);
  assert.match(source, /push:/);
  assert.match(source, /branches:\s*\[main\]/);
  assert.match(source, /npm audit --omit=dev --audit-level=high/);
  assert.match(source, /npm run lint/);
  assert.match(source, /npm run typecheck/);
  assert.match(source, /npm test/);
});

test("production smoke runs in the main Test pipeline, after tests, on the pushed commit", async () => {
  const source = await readFile(testWorkflow, "utf8");
  const job = source.slice(source.indexOf("  production-smoke:"));
  assert.ok(job.length > 0, "Test workflow must have a production-smoke job");
  assert.match(job, /needs:\s*test\b/, "smoke must wait for the test job");
  assert.match(job, /if:\s*github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/, "pull requests are never smoked against production");
  assert.match(job, /uses:\s*\.\/\.github\/workflows\/production-smoke\.yml/);
  assert.match(job, /sha:\s*\$\{\{ github\.sha \}\}/, "smoke verifies the same commit the tests ran on");
  assert.match(job, /checks:\s*read/);
  assert.doesNotMatch(job, /secrets:\s*inherit/, "pass only the two smoke secrets");
  assert.match(job, /SMOKE_BYPASS_TOKEN: \$\{\{ secrets\.SMOKE_BYPASS_TOKEN \}\}/);
  assert.match(job, /SMOKE_TEST_LOGIN_SECRET: \$\{\{ secrets\.SMOKE_TEST_LOGIN_SECRET \}\}/);
});

test("production smoke is only called, never woken by unrelated check events", async () => {
  const source = await readFile(smokeWorkflow, "utf8");
  const triggers = source.slice(source.indexOf("\non:"), source.indexOf("\njobs:"));
  assert.match(triggers, /workflow_call:/);
  assert.match(triggers, /workflow_dispatch:/);
  assert.doesNotMatch(triggers, /check_run:|push:|pull_request:/, "listening triggers create Skipped noise or duplicate runs");
  assert.doesNotMatch(source, /github\.event\.check_run/);
});

test("production smoke waits for Cloudflare to deploy that exact commit before checking the site", async () => {
  const source = await readFile(smokeWorkflow, "utf8");
  const deploy = source.slice(source.indexOf("  deploy:"), source.indexOf("  smoke:"));
  assert.match(deploy, /\^\[0-9a-f\]\{40\}\$/, "only a full commit SHA is accepted");
  assert.match(deploy, /commits\/\$SMOKE_SHA\/check-runs/);
  assert.match(deploy, /Workers Builds: tradehustl3-website/);
  assert.match(deploy, /cloudflare-workers-and-pages/);
  assert.match(deploy, /"completed success"/);
  assert.match(deploy, /exit 1/, "a failed or unfinished Cloudflare build fails the pipeline");
  assert.match(deploy, /checks:\s*read/);
  assert.match(deploy, /commits\/main" --jq \.sha/, "an older commit hands smoke to the newer main commit");

  const smoke = source.slice(source.indexOf("  smoke:"));
  assert.match(smoke, /needs:\s*deploy/);
  assert.match(smoke, /if:\s*needs\.deploy\.outputs\.ready == 'true'/);
  assert.match(smoke, /group:\s*production-smoke/);
  assert.match(smoke, /cancel-in-progress:\s*false/);
});

test("production smoke validates the real custom domain end to end", async () => {
  const source = await readFile(smokeWorkflow, "utf8");
  assert.match(source, /CUSTOM_ORIGIN:\s*https:\/\/tradehustl3\.com/);
  assert.doesNotMatch(source, /WORKER_ORIGIN:/);
  assert.doesNotMatch(source, /CUSTOM_ORIGIN\/api\/health/);
  assert.match(source, /"\$CUSTOM_ORIGIN\/"/);
  assert.match(source, /"\$CUSTOM_ORIGIN\/resume-builder"/);
  assert.match(source, /"\$CUSTOM_ORIGIN\/resume-builder\/intake"/);
  assert.match(source, /Continue with email/);
  assert.match(source, /Upload your resume once\./);
  assert.doesNotMatch(source, /UPLOAD IT OR START FRESH/, "retired intake heading");
  assert.match(source, /TRADE-HUSTL3-Production-Smoke/);
  assert.match(source, /smoke_fetch\(\)/);
  assert.match(source, /for attempt in \$\(seq 1 "\$attempts"\)/);
});

test("a Cloudflare edge challenge is reported as inconclusive, never as a pass, and points to manual verification", async () => {
  const source = await readFile(smokeWorkflow, "utf8");
  const challenge = source.slice(source.indexOf("cloudflare-challenge-page: yes"), source.indexOf("cloudflare-challenge-page: no"));
  assert.ok(challenge.length > 0, "challenge branch must exist");
  assert.match(challenge, /Smoke inconclusive - Cloudflare challenge/);
  assert.match(challenge, /NOT evidence the site is down or up/);
  assert.match(challenge, /docs\/production-verification\.md/);
  assert.match(challenge, /GITHUB_STEP_SUMMARY/);
  assert.match(challenge, /return 1/);
  assert.doesNotMatch(challenge, /return 0/, "a challenged run must never count as a pass");
  assert.doesNotMatch(challenge, /\$SMOKE_BYPASS_TOKEN/, "the bypass token must never be echoed");

  const doc = await readFile(new URL("../docs/production-verification.md", import.meta.url), "utf8");
  assert.match(doc, /Bot Fight Mode/);
  assert.match(doc, /READ-ONLY\. Do not edit files, commit, push, or merge anything\./);
  for (const check of ["/resume-builder/intake", "Continue with email", "Upload your resume once.", "308", "https://analytics.google.com", "reviews/public", "reviews/admin must be 401", "headless Chrome"]) {
    assert.ok(doc.includes(check), `manual verification must cover ${check}`);
  }
});

test("grouped dependency bumps never move pdfjs-dist (it parses customer uploads)", async () => {
  const source = await readFile(new URL("../.github/dependabot.yml", import.meta.url), "utf8");
  const npmBlock = source.slice(source.indexOf("package-ecosystem: npm"), source.indexOf("package-ecosystem: github-actions"));
  const rule = npmBlock.match(/- dependency-name: "pdfjs-dist"\s*\n([\s\S]*?)(?=\n\s*-\s|\n\s*groups:)/);
  assert.ok(rule, "pdfjs-dist must be in the npm ignore list");
  assert.doesNotMatch(rule[1], /update-types:/, "every pdfjs-dist update must be ignored, not only majors (GHSA-hq66-cqwq-w95j affects 5.6.83 to <6.2.108)");
  assert.match(npmBlock, /GHSA-hq66-cqwq-w95j/);
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const [major, minor] = pkg.dependencies["pdfjs-dist"].split(".").map(Number);
  assert.ok(major > 6 || (major === 6 && minor >= 2) || major < 5 || (major === 5 && minor < 6),
    `pinned pdfjs-dist ${pkg.dependencies["pdfjs-dist"]} is inside the GHSA-hq66-cqwq-w95j vulnerable range`);
});

test("Cloudflare Worker deployment owns the production custom domain", async () => {
  const source = await readFile(viteConfig, "utf8");
  assert.match(source, /pattern:\s*"tradehustl3\.com"/);
  assert.match(source, /custom_domain:\s*true/);
});

test("production smoke runs the signed-in review flow without gating deploys on the delivery queue", async () => {
  const source = await readFile(smokeWorkflow, "utf8");
  assert.match(source, /SMOKE_TEST_LOGIN_SECRET: \$\{\{ secrets\.SMOKE_TEST_LOGIN_SECRET \}\}/);
  assert.match(source, /node tools\/smoke\/resume-builder-smoke\.mjs/);
  assert.match(source, /ref: \$\{\{ needs\.deploy\.outputs\.sha \}\}/, "the runner is the commit Cloudflare deployed");
  assert.match(source, /persist-credentials: false/);
  assert.match(source, /npm ci --omit=dev --ignore-scripts/);
  const runner = await readFile(new URL("../tools/smoke/resume-builder-smoke.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(runner, /call\("\/api\/health"/, "the queue-coupled health endpoint must not gate deploys");
  for (const step of ["smoke sign-in", "switch template", "inspect heading", "change customization", "inspect rendered preview after customization", "render fingerprint", "Download/Print absent", "Lead / Supervisor", "TECHNICAL & OPERATIONS COMPETENCIES", "open legacy resume"]) {
    assert.ok(runner.includes(step), `runner covers: ${step}`);
  }
});
