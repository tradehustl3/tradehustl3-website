/**
 * Trade preselection for the guided Resume Builder intake.
 *
 * Trade-specific SEO landing pages (for example `/resume-builder/hvac`) send
 * visitors into the *existing* intake flow with their trade already chosen.
 * There is no second intake system: the landing CTA points at the normal hub
 * (`/resume-builder?trade=<slug>`), the hub threads the slug into the
 * "continue" link, and the wizard reads it on load. A short-lived
 * `localStorage` note bridges the magic-link email round trip, where the query
 * string cannot survive.
 *
 * The trade names below must stay byte-for-byte identical to `TRADE_TRACKS`
 * (and therefore `ALLOWED_TRADES` in `worker/resume-builder.ts`).
 */

import { type TradeTrack, isTradeTrack } from "./trade-content";

/**
 * Accepted `?trade=` values -> canonical trade track. Multiple slugs can map to
 * one track (for example `electrician` and `electrical`) so inbound links from
 * different landing pages and campaigns all resolve.
 */
export const TRADE_SLUGS = {
  hvac: "HVAC & Refrigeration",
  "hvac-refrigeration": "HVAC & Refrigeration",
  electrician: "Electrical",
  electrical: "Electrical",
  plumbing: "Plumbing",
  plumber: "Plumbing",
  "construction-carpentry": "Construction & Carpentry",
  construction: "Construction & Carpentry",
  carpentry: "Construction & Carpentry",
  "facilities-maintenance": "Facilities Maintenance",
  "maintenance-technician": "Facilities Maintenance",
  "welding-fabrication": "Welding & Fabrication",
  welding: "Welding & Fabrication",
  "general-labor": "General Labor / Trade Helper",
} as const satisfies Record<string, TradeTrack>;

export type TradeSlug = keyof typeof TRADE_SLUGS;

/** Canonical slug per track, used whenever we build an outbound Resume Builder URL. */
export const CANONICAL_TRADE_SLUG: Record<TradeTrack, string> = {
  "HVAC & Refrigeration": "hvac",
  Electrical: "electrician",
  Plumbing: "plumbing",
  "Construction & Carpentry": "construction-carpentry",
  "Facilities Maintenance": "facilities-maintenance",
  "Welding & Fabrication": "welding-fabrication",
  "General Labor / Trade Helper": "general-labor",
};

export function tradeTrackFromSlug(slug: string | null | undefined): TradeTrack | null {
  if (!slug) return null;
  const key = slug.trim().toLowerCase();
  return (TRADE_SLUGS as Record<string, TradeTrack>)[key] ?? null;
}

/** Resolve a raw `?trade=` value, accepting either a slug or the exact track name. */
export function resolveTradeParam(value: string | null | undefined): TradeTrack | null {
  if (!value) return null;
  const raw = value.trim();
  if (isTradeTrack(raw)) return raw;
  return tradeTrackFromSlug(raw);
}

export function slugForTradeTrack(track: TradeTrack): string {
  return CANONICAL_TRADE_SLUG[track];
}

/** Hub entry URL that carries a preselected trade (the primary landing-page CTA target). */
export function intakeEntryHref(track: TradeTrack): string {
  return `/resume-builder?trade=${slugForTradeTrack(track)}`;
}

/** Direct intake URL with a preselected trade (used once an account is verified). */
export function intakeWizardHref(track: TradeTrack): string {
  return `/resume-builder/intake?trade=${slugForTradeTrack(track)}`;
}

// --- magic-link bridge -------------------------------------------------------
// The confirmation link opens from the user's inbox, so the `?trade=` query
// string is gone by the time they return. A short TTL keeps a stale trade from
// a previous visit out of a brand-new resume; an explicit `?trade=` always wins.

const TRADE_MEMORY_KEY = "tradehustl3_intake_trade";
const TRADE_MEMORY_TTL_MS = 1000 * 60 * 60 * 2;

export function rememberIntakeTrade(track: TradeTrack): void {
  try {
    window.localStorage.setItem(TRADE_MEMORY_KEY, JSON.stringify({ track, ts: Date.now() }));
  } catch {
    // Storage disabled — preselection falls back to the query string.
  }
}

export function recallIntakeTrade(): TradeTrack | null {
  try {
    const raw = window.localStorage.getItem(TRADE_MEMORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { track?: unknown; ts?: unknown };
    if (typeof parsed.track !== "string" || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > TRADE_MEMORY_TTL_MS) {
      clearIntakeTrade();
      return null;
    }
    return isTradeTrack(parsed.track) ? parsed.track : null;
  } catch {
    return null;
  }
}

export function clearIntakeTrade(): void {
  try {
    window.localStorage.removeItem(TRADE_MEMORY_KEY);
  } catch {
    // ignore
  }
}
