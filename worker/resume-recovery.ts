export type RecoveryContext = { waitUntil(promise: Promise<unknown>): void };

type RecoveryPayload = {
  resumeId?: string | null;
  email?: string | null;
  emailEligible: boolean;
};

/** Best-effort notification: never join delivery to the customer response. */
export function notifyResumeRecovery(payload: RecoveryPayload, context?: RecoveryContext): void {
  try {
    const resumeId = payload.resumeId?.trim();
    const email = payload.email?.trim();
    const emailEligible = payload.emailEligible;
    const url = process.env.N8N_RESUME_RECOVERY_WEBHOOK_URL?.trim();
    if (!resumeId || !email || emailEligible !== true || !url) return;

    const delivery = (async () => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeId, email, emailEligible }),
          signal: AbortSignal.timeout(5_000),
          redirect: "error",
        });
        if (!response.ok) console.warn("Resume recovery webhook rejected", response.status);
        await response.body?.cancel();
      } catch {
        // Never log the email, resume ID, webhook URL, or provider response body.
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
