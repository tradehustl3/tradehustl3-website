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

test("production smoke waits for the successful Cloudflare main deployment check", async () => {
  const source = await readFile(smokeWorkflow, "utf8");
  assert.match(source, /check_run:/);
  assert.match(source, /types:\s*\[completed\]/);
  assert.match(source, /Workers Builds: tradehustl3-website/);
  assert.match(source, /cloudflare-workers-and-pages/);
  assert.match(source, /check_run\.conclusion == 'success'/);
  assert.match(source, /check_suite\.head_branch == 'main'/);
  assert.match(source, /cancel-in-progress:\s*false/);
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
  assert.match(source, /UPLOAD IT OR START FRESH/);
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
  for (const check of ["/resume-builder/intake", "Continue with email", "UPLOAD IT OR START FRESH", "https://analytics.google.com", "reviews/public", "reviews/admin must be 401", "headless Chrome"]) {
    assert.ok(doc.includes(check), `manual verification must cover ${check}`);
  }
});

test("grouped dependency bumps never carry a pdfjs-dist major upgrade", async () => {
  const source = await readFile(new URL("../.github/dependabot.yml", import.meta.url), "utf8");
  const npmBlock = source.slice(source.indexOf("package-ecosystem: npm"), source.indexOf("package-ecosystem: github-actions"));
  assert.match(npmBlock, /ignore:\s*\n(?:\s*#.*\n)*\s*- dependency-name: "pdfjs-dist"\s*\n\s*update-types: \["version-update:semver-major"\]/);
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
  assert.match(source, /ref: \$\{\{ github\.event\.check_run\.head_sha \}\}/);
  assert.match(source, /persist-credentials: false/);
  assert.match(source, /npm ci --omit=dev --ignore-scripts/);
  const runner = await readFile(new URL("../tools/smoke/resume-builder-smoke.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(runner, /call\("\/api\/health"/, "the queue-coupled health endpoint must not gate deploys");
  for (const step of ["smoke sign-in", "switch template", "inspect heading", "change customization", "Download/Print absent", "open legacy resume"]) {
    assert.ok(runner.includes(step), `runner covers: ${step}`);
  }
});
