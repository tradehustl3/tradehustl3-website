import assert from "node:assert/strict";
import test from "node:test";
import { getOperationsHealth, operationalEvent } from "../worker/operations-monitoring";

function db(queue = { pending: 0, dead_letter: 0 }, fail = false) {
  return {
    prepare(sql: string) {
      return {
        async first() {
          if (fail) throw new Error("db down");
          if (/lead_delivery_jobs/i.test(sql)) return queue;
          return { healthy: 1 };
        },
      };
    },
  } as unknown as D1Database;
}

const configuredHealthEnv = {
  BOOKS: {} as R2Bucket,
  BREVO_API_KEY: "brevo",
  RESUME_AI_BRIDGE_URL: "https://bridge.example.com",
  RESUME_AI_BRIDGE_SECRET: "bridge-secret",
  ANTHROPIC_API_KEY: "anthropic",
  STRIPE_SECRET_KEY: "stripe",
  STRIPE_RESUME_WEBHOOK_SECRET: "webhook",
  GA4_MEASUREMENT_PROTOCOL_API_SECRET: "ga4-mp-test-secret",
};

test("operations health is healthy when critical services are configured", async () => {
  const health = await getOperationsHealth({ DB: db(), ...configuredHealthEnv });

  assert.equal(health.ok, true);
  assert.equal(health.status, "healthy");
  assert.equal(health.components.database, "ok");
  assert.equal(health.components.deliveryQueue, "ok");
  assert.equal(health.components.stripe, "ok");
  assert.equal(health.components.analytics, "ok");
});

test("missing GA4 Measurement Protocol secret degrades health without failing it", async () => {
  const env = { ...configuredHealthEnv, GA4_MEASUREMENT_PROTOCOL_API_SECRET: undefined };
  const previous = process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET;
  delete process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET;
  try {
    const health = await getOperationsHealth({ DB: db(), ...env });
    assert.equal(health.ok, true, "analytics must never make /api/health return 503");
    assert.equal(health.status, "degraded");
    assert.equal(health.components.analytics, "degraded");
  } finally {
    if (previous !== undefined) process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET = previous;
  }
});

test("whitespace-only GA4 secret is treated as not configured", async () => {
  const health = await getOperationsHealth({ DB: db(), ...configuredHealthEnv, GA4_MEASUREMENT_PROTOCOL_API_SECRET: "   " });
  assert.equal(health.components.analytics, "degraded");
});

test("health snapshot never contains the GA4 secret value", async () => {
  const secret = "ga4-unique-secret-value-should-not-leak";
  const health = await getOperationsHealth({ DB: db(), ...configuredHealthEnv, GA4_MEASUREMENT_PROTOCOL_API_SECRET: secret });
  assert.equal(health.components.analytics, "ok");
  assert.equal(JSON.stringify(health).includes(secret), false);
  assert.equal(JSON.stringify(health).includes("GA4_MEASUREMENT_PROTOCOL_API_SECRET"), false);
});

test("dead-letter delivery jobs degrade health without exposing customer data", async () => {
  const health = await getOperationsHealth({
    DB: db({ pending: 3, dead_letter: 2 }),
    ...configuredHealthEnv,
  });

  assert.equal(health.ok, true);
  assert.equal(health.status, "degraded");
  assert.deepEqual(health.queue, { pending: 3, deadLetter: 2 });
  assert.equal(JSON.stringify(health).includes("email"), true);
  assert.equal(JSON.stringify(health).includes("@"), false);
});

test("missing critical production configuration makes health unhealthy", async () => {
  const health = await getOperationsHealth({ DB: db() });
  assert.equal(health.ok, false);
  assert.equal(health.status, "unhealthy");
  assert.equal(health.components.storage, "unavailable");
  assert.equal(health.components.email, "unavailable");
  assert.equal(health.components.aiPrimary, "unavailable");
  assert.equal(health.components.stripe, "unavailable");
});

test("database failure is surfaced as unavailable", async () => {
  const health = await getOperationsHealth({
    DB: db({ pending: 0, dead_letter: 0 }, true),
    ...configuredHealthEnv,
  });
  assert.equal(health.ok, false);
  assert.equal(health.components.database, "unavailable");
});

test("operational events are structured and contain no implicit sensitive fields", () => {
  const event = operationalEvent("ai_generation", "primary_failed_fallback_used", "warning", {
    model: "gemini",
    fallback: true,
  });
  assert.equal(event.type, "tradehustl3_operational_event");
  assert.equal(event.area, "ai_generation");
  assert.equal(event.severity, "warning");
  assert.equal("email" in event, false);
  assert.equal("resumeText" in event, false);
});
