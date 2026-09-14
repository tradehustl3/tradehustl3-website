export type OperationsComponentStatus = "ok" | "degraded" | "unavailable";

export type OperationsHealth = {
  ok: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  components: {
    database: OperationsComponentStatus;
    storage: OperationsComponentStatus;
    email: OperationsComponentStatus;
    aiPrimary: OperationsComponentStatus;
    aiFallback: OperationsComponentStatus;
    stripe: OperationsComponentStatus;
    deliveryQueue: OperationsComponentStatus;
  };
  queue?: {
    pending: number;
    deadLetter: number;
  };
};

type HealthEnv = {
  DB: D1Database;
  BOOKS?: R2Bucket;
  BREVO_API_KEY?: string;
  RESUME_AI_BRIDGE_URL?: string;
  RESUME_AI_BRIDGE_SECRET?: string;
  ANTHROPIC_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
};

function configured(...values: Array<string | undefined>): boolean {
  return values.every((value) => Boolean(value?.trim()));
}

export async function getOperationsHealth(env: HealthEnv): Promise<OperationsHealth> {
  const components: OperationsHealth["components"] = {
    database: "unavailable",
    storage: env.BOOKS ? "ok" : "unavailable",
    email: configured(env.BREVO_API_KEY) ? "ok" : "unavailable",
    aiPrimary: configured(env.RESUME_AI_BRIDGE_URL, env.RESUME_AI_BRIDGE_SECRET) ? "ok" : "unavailable",
    aiFallback: configured(env.ANTHROPIC_API_KEY) ? "ok" : "degraded",
    stripe: configured(env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET) ? "ok" : "unavailable",
    deliveryQueue: "unavailable",
  };

  let pending = 0;
  let deadLetter = 0;

  try {
    await env.DB.prepare("SELECT 1 AS healthy").first();
    components.database = "ok";

    try {
      const queue = await env.DB.prepare(
        `SELECT
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN status = 'dead_letter' THEN 1 ELSE 0 END) AS dead_letter
         FROM lead_delivery_jobs`,
      ).first<{ pending: number | null; dead_letter: number | null }>();
      pending = Number(queue?.pending) || 0;
      deadLetter = Number(queue?.dead_letter) || 0;
      components.deliveryQueue = deadLetter > 0 ? "degraded" : "ok";
    } catch {
      components.deliveryQueue = "degraded";
    }
  } catch {
    components.database = "unavailable";
  }

  const criticalUnavailable = [
    components.database,
    components.storage,
    components.email,
    components.aiPrimary,
    components.stripe,
  ].some((status) => status === "unavailable");
  const anyDegraded = Object.values(components).some((status) => status === "degraded");

  return {
    ok: !criticalUnavailable,
    status: criticalUnavailable ? "unhealthy" : anyDegraded ? "degraded" : "healthy",
    timestamp: new Date().toISOString(),
    components,
    queue: { pending, deadLetter },
  };
}

export function operationalEvent(
  area: "auth_email" | "ai_generation" | "stripe" | "document_storage" | "delivery_queue",
  event: string,
  severity: "info" | "warning" | "error",
  detail: Record<string, string | number | boolean | null> = {},
): Record<string, unknown> {
  return {
    type: "tradehustl3_operational_event",
    area,
    event,
    severity,
    timestamp: new Date().toISOString(),
    ...detail,
  };
}
