/**
 * Trade picker data for the homepage hero.
 *
 * Each entry drives the headline word, the fictional example resume card and
 * the CTA. The CTA reuses the trade landing pages' entry URL
 * (`/?trade=<slug>#resume-start`), so AccountStart and the intake wizard
 * preselect the trade exactly as they do for `/resume-builder/<trade>`.
 *
 * Example card content is fictional (the same "Jordan Taylor" as the cover
 * letter example) and must never read as a customer result.
 */

import type { TradeTrack } from "./resume-builder/trade-content";
import { intakeEntryHref, resolveTradeParam } from "./resume-builder/trade-preselect";

export type HeroTrade = {
  id: string;
  label: string;
  /** Headline word, shown in red: "Build {article} {word} resume ..." */
  word: string;
  article: "a" | "an";
  /** CTA word: "Build my free {short} preview" */
  short: string;
  track: TradeTrack;
  title: string;
  certs: string;
  bullets: readonly string[];
};

export const HERO_TRADES: readonly HeroTrade[] = [
  {
    id: "hvac",
    label: "HVAC",
    word: "HVAC tech",
    article: "an",
    short: "HVAC",
    track: "HVAC & Refrigeration",
    title: "HVAC Technician",
    certs: "EPA 608 Type II · OSHA 10-Hour training",
    bullets: [
      "Performed preventive maintenance on rooftop units and split systems.",
      "Diagnosed refrigerant and airflow problems with technicians on service calls.",
      "Logged work orders and parts used on every job.",
    ],
  },
  {
    id: "electrical",
    label: "Electrical",
    word: "electrician",
    article: "an",
    short: "electrician",
    track: "Electrical",
    title: "Electrical Apprentice",
    certs: "OSHA 10-Hour training · Registered apprentice",
    bullets: [
      "Pulled wire and installed conduit for residential and light commercial jobs.",
      "Mounted panels, devices and fixtures under a journeyman.",
      "Followed lockout/tagout on every de-energized circuit.",
    ],
  },
  {
    id: "plumbing",
    label: "Plumbing",
    word: "plumber",
    article: "a",
    short: "plumber",
    track: "Plumbing",
    title: "Plumbing Apprentice",
    certs: "OSHA 10-Hour training · Registered apprentice",
    bullets: [
      "Assisted with residential drain, waste and vent installation.",
      "Measured, cut and prepped copper and PEX supply lines.",
      "Kept tools organized and job sites clean and safe.",
    ],
  },
  {
    id: "facilities",
    label: "Facilities",
    word: "maintenance tech",
    article: "a",
    short: "maintenance",
    track: "Facilities Maintenance",
    title: "Facilities Maintenance Technician",
    certs: "EPA 608 Universal · OSHA 30-Hour training",
    bullets: [
      "Completed preventive and corrective work orders across a commercial building.",
      "Maintained HVAC, plumbing and electrical systems.",
      "Coordinated with vendors on repairs and inspections.",
    ],
  },
  {
    id: "welding",
    label: "Welding",
    word: "welder",
    article: "a",
    short: "welder",
    track: "Welding & Fabrication",
    title: "Welder / Fabricator",
    certs: "AWS Certified Welder — GMAW 3G (D1.1) · OSHA 10-Hour training",
    bullets: [
      "Welded structural steel using MIG and stick processes.",
      "Read blueprints and weld symbols to fit and tack parts.",
      "Inspected welds and reworked defects before handoff.",
    ],
  },
  {
    id: "construction",
    label: "Construction",
    word: "construction",
    article: "a",
    short: "construction",
    track: "Construction & Carpentry",
    title: "Construction Laborer",
    certs: "OSHA 10-Hour training · Forklift operator (employer-evaluated)",
    bullets: [
      "Set up and broke down job sites for framing and concrete crews.",
      "Operated hand and power tools safely.",
      "Moved and staged materials with a forklift.",
    ],
  },
];

/** Shown when no trade has been picked and the URL names none. */
export const DEFAULT_HERO_TRADE = HERO_TRADES[0];

export function heroTradeById(id: string | null | undefined): HeroTrade | null {
  return HERO_TRADES.find((trade) => trade.id === id) ?? null;
}

/** Map a raw `?trade=` value (any accepted slug) to a hero trade, if one matches. */
export function heroTradeFromParam(value: string | null | undefined): HeroTrade | null {
  const track = resolveTradeParam(value);
  return track ? HERO_TRADES.find((trade) => trade.track === track) ?? null : null;
}

/**
 * CTA target. With no trade chosen it stays on the plain intake anchor; once a
 * trade is chosen (picked, or named in the URL) it carries `?trade=` so the
 * existing intake preselects it.
 */
export function heroCtaHref(chosen: HeroTrade | null): string {
  return chosen ? intakeEntryHref(chosen.track) : "#resume-start";
}

export function heroCtaLabel(shown: HeroTrade): string {
  return `Build my free ${shown.short} preview`;
}

/**
 * Headline words for campaign visits (`?trade=`) whose trade has no quick-pick
 * card above. Every builder track resolves to a headline, so a campaign never
 * lands on a hero that names a different trade.
 */
export const CAMPAIGN_HEADLINES: Record<TradeTrack, Pick<HeroTrade, "word" | "article" | "short">> = {
  "HVAC & Refrigeration": { word: "HVAC tech", article: "an", short: "HVAC" },
  Electrical: { word: "electrician", article: "an", short: "electrician" },
  Plumbing: { word: "plumber", article: "a", short: "plumber" },
  "Construction & Carpentry": { word: "construction", article: "a", short: "construction" },
  "Facilities Maintenance": { word: "maintenance tech", article: "a", short: "maintenance" },
  "Welding & Fabrication": { word: "welder", article: "a", short: "welder" },
  "General Labor / Trade Helper": { word: "general labor", article: "a", short: "general labor" },
  "Commercial Driving & Transportation": { word: "commercial driver", article: "a", short: "driver" },
  "Warehouse, Logistics & Material Handling": { word: "warehouse", article: "a", short: "warehouse" },
  "Industrial & Warehouse Maintenance": { word: "industrial maintenance", article: "an", short: "maintenance" },
  "Landscaping & Grounds Maintenance": { word: "landscaping", article: "a", short: "landscaping" },
  "Roadwork, Paving, Concrete & Heavy Equipment": { word: "heavy equipment", article: "a", short: "heavy equipment" },
  "Roofing & Exterior Trades": { word: "roofing", article: "a", short: "roofing" },
  "Automotive, Diesel & Fleet Maintenance": { word: "diesel & auto tech", article: "a", short: "automotive" },
};
