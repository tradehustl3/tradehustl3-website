import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("production health route uses the full operations snapshot", async () => {
  const source = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");

  assert.match(source, /import \{ getOperationsHealth, operationalEvent \} from "\.\/operations-monitoring"/);
  assert.match(source, /url\.pathname === "\/api\/health"/);
  assert.match(source, /const health = await getOperationsHealth\(env\)/);
  assert.match(source, /health\.ok \? 200 : 503/);
  assert.match(source, /operations_health_unhealthy/);
  assert.match(source, /operations_health_degraded/);
  assert.doesNotMatch(source, /Health check failed/);
});

test("high-value lead delivery failures emit structured operational events", async () => {
  const source = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");

  for (const event of [
    "lead_delivery_queue_failed",
    "lead_delivery_queue_unavailable",
    "lead_delivery_retry_failed",
    "lead_delivery_dead_letter",
    "subscriber_brevo_sync_deferred",
    "top_trades_email_failed",
    "book_sample_email_failed",
    "subscriber_signup_failed",
  ]) {
    assert.match(source, new RegExp(event));
  }

  assert.match(source, /operationalEvent\("delivery_queue"/);
  assert.match(source, /operationalEvent\("auth_email"/);
});

test("production smoke reports GA4 configuration as a warning that never fails the run", async () => {
  const source = await readFile(new URL("../tools/smoke/resume-builder-smoke.mjs", import.meta.url), "utf8");
  const advisory = source.slice(source.indexOf("async function advisory("), source.indexOf("async function main("));

  assert.ok(advisory.length > 0, "smoke must define an advisory() helper");
  assert.match(advisory, /::warning::/);
  assert.doesNotMatch(advisory, /failures/, "advisory checks must not count as smoke failures");
  assert.doesNotMatch(advisory, /::error::/);
  assert.match(source, /await advisory\("GA4 server-side delivery configured"/);
  assert.doesNotMatch(source, /await step\("GA4/, "GA4 must never gate deploys");
});
