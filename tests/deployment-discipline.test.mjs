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

test("Cloudflare Worker deployment owns the production custom domain", async () => {
  const source = await readFile(viteConfig, "utf8");
  assert.match(source, /pattern:\s*"tradehustl3\.com"/);
  assert.match(source, /custom_domain:\s*true/);
});
