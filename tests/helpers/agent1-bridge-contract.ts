/**
 * Consumer contract for the Agent A01 funnel snapshot.
 *
 * The A01 bridge (repo trade-hustl3-growth-agent, file
 * production/bridge/integration.py, function validate_snapshot) rejects any
 * 24h snapshot that breaks the rules below with `invalid_source` or
 * `invalid_snapshot_fields`, and the daily A01 run fails without calling the
 * model. That happened every day from 2026-10-23 to 2026-10-28 after this
 * repo added an `orderLedger` authority entry (PR #235).
 *
 * These rules mirror validate_snapshot as of growth-agent commit 321c906.
 * If you change the snapshot shape here, this contract test tells you whether
 * the deployed bridge will still accept it. If the bridge tightens or loosens
 * validate_snapshot, update this file in the same change.
 */

export const A01_CONTRACT_SOURCE = "trade-hustl3-growth-agent@321c906 production/bridge/integration.py validate_snapshot";

const COUNT_KEYS = [
  "starts",
  "intakeStarted",
  "intakeCompleted",
  "previewsGenerated",
  "checkoutStarted",
  "verifiedPurchases",
] as const;

const REQUIRED_AUTHORITY: Readonly<Record<string, string>> = {
  behavioralEvents: "funnel_events",
  purchases: "resume_orders.status=paid AND paid_at IS NOT NULL",
};

export type ContractResult = { ok: true } | { ok: false; code: "invalid_snapshot" | "invalid_source" | "invalid_snapshot_fields"; reason: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Python's datetime.fromisoformat after replacing Z, requiring a UTC offset. */
function parseUtc(value: unknown): number | null {
  if (typeof value !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** Python `type(x) is int and x >= 0`: rejects booleans, floats and strings. */
function isNonNegativeInt(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Validates a parsed snapshot exactly as the A01 bridge does.
 * `nowMs` is the bridge's clock when it receives the snapshot.
 */
export function validateA01Snapshot(value: unknown, nowMs: number): ContractResult {
  const fail = (code: Extract<ContractResult, { ok: false }>["code"], reason: string): ContractResult => ({ ok: false, code, reason });

  if (!isObject(value) || value.ok !== true) return fail("invalid_snapshot", "ok must be true");
  if (value.source !== "trade_hustl3_production" || value.product !== "resume_builder" || value.window !== "24h") {
    return fail("invalid_source", "source/product/window must be trade_hustl3_production/resume_builder/24h");
  }

  const generated = parseUtc(value.generatedAt);
  const windowStart = parseUtc(value.windowStart);
  const windowEnd = parseUtc(value.windowEnd);
  if (generated === null || windowStart === null || windowEnd === null) {
    return fail("invalid_snapshot_fields", "generatedAt/windowStart/windowEnd must be ISO-8601 timestamps with a UTC offset");
  }

  const ageSeconds = (nowMs - generated) / 1000;
  const spanSeconds = (windowEnd - windowStart) / 1000;
  const generatedAfterWindowSeconds = (generated - windowEnd) / 1000;
  if (ageSeconds < -60 || ageSeconds > 900) return fail("invalid_snapshot_fields", `generatedAt age ${ageSeconds}s outside [-60, 900]`);
  if (spanSeconds < 86340 || spanSeconds > 86460) return fail("invalid_snapshot_fields", `window span ${spanSeconds}s outside [86340, 86460]`);
  if (generatedAfterWindowSeconds < -60 || generatedAfterWindowSeconds > 900) {
    return fail("invalid_snapshot_fields", `generatedAt - windowEnd ${generatedAfterWindowSeconds}s outside [-60, 900]`);
  }

  const counts = value.counts;
  if (!isObject(counts)) return fail("invalid_snapshot_fields", "counts must be an object");
  for (const key of COUNT_KEYS) {
    if (!isNonNegativeInt(counts[key])) return fail("invalid_snapshot_fields", `counts.${key} must be a non-negative integer`);
  }

  const revenue = value.revenue;
  if (!isObject(revenue)) return fail("invalid_snapshot_fields", "revenue must be an object");
  const cents = revenue.verifiedRevenueCents;
  if (!isNonNegativeInt(cents) || revenue.currency !== "USD") {
    return fail("invalid_snapshot_fields", "revenue.verifiedRevenueCents must be a non-negative integer and currency USD");
  }
  if (revenue.verifiedRevenueUsd !== (cents as number) / 100) {
    return fail("invalid_snapshot_fields", "revenue.verifiedRevenueUsd must equal verifiedRevenueCents / 100");
  }
  if (counts.verifiedPurchases === 0 && cents !== 0) {
    return fail("invalid_snapshot_fields", "revenue must be 0 when verifiedPurchases is 0");
  }

  const authority = value.authority;
  if (!isObject(authority) || !Object.entries(authority).every(([, v]) => typeof v === "string")) {
    return fail("invalid_snapshot_fields", "authority must map strings to strings");
  }
  for (const [key, expected] of Object.entries(REQUIRED_AUTHORITY)) {
    if (authority[key] !== expected) return fail("invalid_snapshot_fields", `authority.${key} must be exactly "${expected}"`);
  }

  return { ok: true };
}
