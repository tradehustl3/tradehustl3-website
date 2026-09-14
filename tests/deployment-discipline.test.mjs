import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const testWorkflow = new URL("../.github/workflows/test.yml", import.meta.url);
const smokeWorkflow = new URL("../.github/workflows/production-smoke.yml", import.meta.url);

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

test("production smoke validates the deployed Worker health and entry points", async () => {
  const source = await readFile(smokeWorkflow, "utf8");
  assert.match(source, /WORKER_ORIGIN:\s*https:\/\/tradehustl3-website\.tradehustl3\.workers\.dev/);
  assert.match(source, /"\$WORKER_ORIGIN\/api\/health"/);
  assert.match(source, /health\.ok !== true/);
  assert.match(source, /\['healthy', 'degraded'\]/);
  assert.match(source, /"\$WORKER_ORIGIN\/"/);
  assert.match(source, /"\$WORKER_ORIGIN\/resume-builder"/);
  assert.match(source, /--retry-all-errors/);
  assert.doesNotMatch(source, /tradehustl3\.com\/api\/health/);
});
