export type RecoveryContext = { waitUntil(promise: Promise<unknown>): void };

type RecoveryPayload = {
  resumeId?: string | null;
  email?: string | null;
  emailEligible: boolean;
};

/** Worker bindings take precedence; process.env remains a fallback for older deployments. */
export type RecoveryConfig = {
  N8N_RESUME_RECOVERY_WEBHOOK_URL?: string;
  N8N_RESUME_RECOVERY_WEBHOOK_SECRET?: string;
};

const MIN_SECRET_LENGTH = 32;

function setting(config: RecoveryConfig | undefined, key: keyof RecoveryConfig): string {
  const fromEnv = config?.[key];
  const value = typeof fromEnv === "string" && fromEnv.trim()
    ? fromEnv
    : typeof process !== "undefined" ? process.env?.[key] : undefined;
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Best-effort notification: never join delivery to the customer response.
 * The n8n webhook sends customer email, so it is only called with its bearer
 * secret. Without a 32+ character secret nothing is sent (fail closed).
 */
export function notifyResumeRecovery(payload: RecoveryPayload, context?: RecoveryContext, config?: RecoveryConfig): void {
  try {
    const resumeId = payload.resumeId?.trim();
    const email = payload.email?.trim();
    const emailEligible = payload.emailEligible;
    const url = setting(config, "N8N_RESUME_RECOVERY_WEBHOOK_URL");
    const secret = setting(config, "N8N_RESUME_RECOVERY_WEBHOOK_SECRET");
    if (!resumeId || !email || emailEligible !== true || !url || secret.length < MIN_SECRET_LENGTH) return;

    const delivery = (async () => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
          body: JSON.stringify({ resumeId, email, emailEligible }),
          signal: AbortSignal.timeout(5_000),
          redirect: "error",
        });
        if (!response.ok) console.warn("Resume recovery webhook rejected", response.status);
        await response.body?.cancel();
      } catch {
        // Never log the email, resume ID, webhook URL, secret, or provider response body.
        console.warn("Resume recovery webhook delivery failed");
      }
    })();
    // Workers otherwise may cancel outbound work once the response is returned.
    if (context) context.waitUntil(delivery);
    else void delivery;
  } catch {
    console.warn("Resume recovery webhook scheduling failed");
  }
}
