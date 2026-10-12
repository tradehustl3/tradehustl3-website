import { CHECKOUT_AGREEMENT, INTAKE_AGREEMENT, PURCHASE_POLICY_SNAPSHOT, PURCHASE_TERMS_VERSION } from "../shared/purchase-terms";

/** The forward migration is applied before deployment; evidence is never seeded. */
export function policyAcceptanceStatement(
  db: D1Database,
  userId: string,
  resumeId: string,
  source: "intake" | "checkout",
  acceptanceId: string,
  orderId: string | null = null,
): D1PreparedStatement {
  return db.prepare(
    `INSERT INTO resume_policy_acceptances
     (acceptance_id, user_id, resume_id, order_id, source, policy_version, agreement_text, policy_snapshot_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
  ).bind(acceptanceId, userId, resumeId, orderId, source, PURCHASE_TERMS_VERSION,
    source === "checkout" ? CHECKOUT_AGREEMENT : INTAKE_AGREEMENT, PURCHASE_POLICY_SNAPSHOT);
}

export type DeliveredResumeFile = {
  file_id: string;
  byte_size: number;
  sha256: string;
};

/**
 * Records the server serving a file, not proof that the browser saved it.
 * Inline viewing is kept distinct from an explicit attachment request. The
 * final SQL check also catches a dispute/refund during the storage read.
 */
export async function recordCleanFileDelivery(
  db: D1Database,
  userId: string,
  resumeId: string,
  format: "pdf" | "docx" | "cover_pdf" | "cover_docx",
  disposition: "inline" | "attachment",
  file: DeliveredResumeFile,
): Promise<boolean> {
  const result = await db.prepare(
    `INSERT INTO resume_file_deliveries
     (delivery_id, user_id, resume_id, order_id, file_id, format, disposition, byte_size, sha256)
     SELECT ?, e.user_id, e.resume_id, e.source_order_id, ?, ?, ?, ?, ?
     FROM entitlements e JOIN resume_orders ro ON ro.order_id = e.source_order_id
     WHERE e.user_id = ? AND e.resume_id = ? AND e.status = 'active'
       AND (e.access_expires_at IS NULL OR e.access_expires_at > ?)
       AND ro.status = 'paid' AND ro.user_id = e.user_id AND ro.resume_id = e.resume_id
     ORDER BY e.created_at DESC LIMIT 1`,
  ).bind(crypto.randomUUID(), file.file_id, format, disposition, file.byte_size, file.sha256,
    userId, resumeId, Math.floor(Date.now() / 1000)).run();
  return (result.meta.changes ?? 0) === 1;
}

export function stripeObjectId(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return "";
}

/** Called only after the existing webhook signature and payload checks. */
export async function recordResumeDispute(
  db: D1Database,
  eventId: string,
  eventType: string,
  object: unknown,
): Promise<boolean> {
  if (!object || typeof object !== "object" || Array.isArray(object)) return false;
  const dispute = object as Record<string, unknown>;
  const disputeId = stripeObjectId(dispute.id);
  const paymentIntent = stripeObjectId(dispute.payment_intent);
  if (!disputeId || !paymentIntent || !Number.isSafeInteger(dispute.amount)
    || Number(dispute.amount) <= 0 || dispute.currency !== "usd") return false;

  await db.batch([
    db.prepare("INSERT OR IGNORE INTO stripe_events (event_id, type) VALUES (?, ?)").bind(eventId, eventType),
    db.prepare(
      `INSERT OR IGNORE INTO resume_dispute_events
       (event_id, dispute_id, payment_intent_id, amount, currency) VALUES (?, ?, ?, ?, ?)`,
    ).bind(eventId, disputeId, paymentIntent, dispute.amount, dispute.currency),
    db.prepare(
      `UPDATE resume_orders SET status = CASE WHEN status = 'refunded' THEN 'refunded' ELSE 'disputed' END
       WHERE stripe_payment_intent_id = ? AND plan = 'resume_mvp_999' AND amount_total = 999 AND currency = 'usd'`,
    ).bind(paymentIntent),
    db.prepare(
      `UPDATE entitlements SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'active' AND source_order_id IN (
         SELECT order_id FROM resume_orders
         WHERE stripe_payment_intent_id = ? AND status IN ('disputed', 'refunded')
       )`,
    ).bind(paymentIntent),
  ]);
  return true;
}
