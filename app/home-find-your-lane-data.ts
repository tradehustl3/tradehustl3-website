import {
  CREDENTIAL_REQUIREMENT_LABELS,
  TRADE_KEY_CREDENTIALS,
  credentialsForTrade,
  type TradeFamilySlug,
} from "./resources/credential-library";
import { TRADE_CAREER_FAMILIES } from "./resume-examples/trade-career-catalog";
import { TRADE_WORKSITE_IMAGES, type TradeWorksiteImage } from "./resume-builder/trade-worksite-images";
import type { ToolName } from "./tool-silhouettes";

/**
 * Homepage "Find Your Lane" trade cards.
 *
 * Every card answers three questions for someone who knows nothing about the
 * trade: what the worker does, how people usually get started, and which
 * credentials apply.
 *
 * Editorial rules (enforced in tests/home-find-your-lane.test.ts):
 * - `work` and `start` restate the linked U.S. Bureau of Labor Statistics
 *   Occupational Outlook Handbook page ("What They Do" / "How to Become One"),
 *   checked on FIND_YOUR_LANE_CHECKED_ON. Change them only against that page.
 * - Credentials are never typed here. They come from the Credential Library
 *   (the trade's mapped records, key credential first), so a correction there
 *   updates these cards too.
 * - No pay figures, job guarantees, or outcome promises.
 *
 * This module imports the full trade catalog, so only server components may
 * import it.
 */

export const FIND_YOUR_LANE_CHECKED_ON = "2026-11-09";

const MAX_CREDENTIALS = 3;
/** Credentials that apply to nearly every trade go after the trade-specific ones. */
const GENERAL_LAST = new Set(["osha-outreach-10-30", "state-trade-license", "lockout-tagout"]);

type LaneSource = { label: string; url: string };

type LaneDefinition = {
  /** Trade-family slug in the career catalog. */
  family: TradeFamilySlug;
  title: string;
  tagline: string;
  tool: ToolName;
  work: string;
  start: string;
  source: LaneSource;
  /** Optional editorial order; every slug must be mapped to this trade in the library. */
  credentialOrder?: readonly string[];
};

const BLS = "https://www.bls.gov/ooh";

/** Display order matches the approved Find Your Lane concept. */
const LANES: readonly LaneDefinition[] = [
  {
    family: "hvac-refrigeration",
    title: "HVAC & Refrigeration",
    tagline: "Heating, cooling & refrigeration",
    tool: "gauge",
    work: "Install, maintain, and repair the heating, cooling, ventilation, and refrigeration systems that control temperature and air quality in buildings.",
    start: "Many start with a 6-month to 2-year program at a technical school or community college. Others train through an apprenticeship that pairs paid on-the-job training with classroom instruction.",
    source: { label: "BLS — HVAC and refrigeration mechanics and installers", url: `${BLS}/installation-maintenance-and-repair/heating-air-conditioning-and-refrigeration-mechanics-and-installers.htm` },
  },
  {
    family: "electrical-low-voltage",
    title: "Electrical",
    tagline: "Power, wiring & controls",
    tool: "multimeter",
    work: "Install, maintain, and repair power, lighting, communications, and control systems in homes, businesses, and factories.",
    start: "A high school diploma or equivalent, then most train through a 4- or 5-year paid apprenticeship. A technical-school program can earn credit toward one.",
    source: { label: "BLS — Electricians", url: `${BLS}/construction-and-extraction/electricians.htm` },
  },
  {
    family: "plumbing-pipefitting",
    title: "Plumbing",
    tagline: "Water, piping & systems",
    tool: "pipewrench",
    work: "Install and repair the pipes, fixtures, and piping systems that carry water and waste through buildings.",
    start: "A high school diploma or equivalent, then most learn through a 4- or 5-year paid apprenticeship. Some start as helpers or finish a pre-apprenticeship first.",
    source: { label: "BLS — Plumbers, pipefitters, and steamfitters", url: `${BLS}/construction-and-extraction/plumbers-pipefitters-and-steamfitters.htm` },
  },
  {
    family: "welding-fabrication-machining",
    title: "Welding & Fabrication",
    tagline: "Metalwork & fabrication",
    tool: "helmet",
    work: "Use hand-held or remotely controlled equipment to join, cut, and repair metal parts and products.",
    start: "Employers usually want a high school diploma plus technical training from a high school program, community college, or welding school, followed by months of on-the-job training. Some employer apprenticeships take beginners.",
    source: { label: "BLS — Welders, cutters, solderers, and brazers", url: `${BLS}/production/welders-cutters-solderers-and-brazers.htm` },
  },
  {
    family: "construction-carpentry",
    title: "Construction",
    tagline: "Building & carpentry",
    tool: "hardhat",
    work: "Build, repair, and install frameworks and structures made of wood and other materials.",
    start: "A high school diploma or equivalent, then learn on the job or through an apprenticeship that combines technical training with paid work, often sponsored by unions and contractor associations.",
    source: { label: "BLS — Carpenters", url: `${BLS}/construction-and-extraction/carpenters.htm` },
  },
  {
    family: "facilities-property-apartment-maintenance",
    title: "Facilities Maintenance",
    tagline: "Repair & maintain buildings",
    tool: "wrench",
    work: "Keep buildings and equipment working, from painting and flooring to plumbing, electrical, and heating and cooling systems.",
    start: "A high school diploma or equivalent. Most learn on the job, starting with simple repairs and taking on harder work alongside experienced workers. Some complete apprenticeships.",
    source: { label: "BLS — General maintenance and repair workers", url: `${BLS}/installation-maintenance-and-repair/general-maintenance-and-repair-workers.htm` },
    credentialOrder: ["epa-608", "camt", "osha-outreach-10-30"],
  },
  {
    family: "roadwork-paving-concrete-heavy-equipment",
    title: "Heavy Equipment",
    tagline: "Operate jobsite machinery",
    tool: "level",
    work: "Operate the heavy machinery used to build roads, buildings, and other structures.",
    start: "A high school diploma or equivalent. Many start on light equipment under an experienced operator. Others complete a 3- or 4-year apprenticeship or a vocational program.",
    source: { label: "BLS — Construction equipment operators", url: `${BLS}/construction-and-extraction/construction-equipment-operators.htm` },
  },
  {
    family: "general-labor-trade-helpers",
    title: "General Labor",
    tagline: "Start building field experience",
    tool: "hammer",
    work: "Support crews by handling materials and tools, keeping sites and equipment clean, and assisting skilled tradespeople.",
    start: "Usually no formal credential is required. Most learn on the job by working alongside experienced workers, and some go on to apprenticeships sponsored by unions or trade associations.",
    source: { label: "BLS — Construction laborers and helpers", url: `${BLS}/construction-and-extraction/construction-laborers-and-helpers.htm` },
  },
];

export type LaneCredential = { slug: string; name: string; requirementLabel: string; href: string };

export type FindYourLaneCard = {
  id: TradeFamilySlug;
  title: string;
  tagline: string;
  tool: ToolName;
  work: string;
  start: string;
  credentials: LaneCredential[];
  source: LaneSource;
  image: TradeWorksiteImage;
  /** Trade pathway block in the Resource Center: credentials, roles, sources. */
  exploreHref: string;
  /** The trade's existing guided page. */
  tradePageHref: string;
};

/** Short display names; the library's full names run long on a card. */
const SHORT_NAMES: Record<string, string> = {
  "epa-608": "EPA 608",
  "osha-outreach-10-30": "OSHA 10 / 30",
  "state-trade-license": "State trade license",
  "aws-certified-welder": "AWS Certified Welder",
  cdl: "CDL",
  "lockout-tagout": "Lockout / Tagout",
  "forklift-operator": "Forklift operator",
  nate: "NATE",
  nccer: "NCCER",
  camt: "CAMT",
  "aws-cwi": "AWS CWI",
  cpo: "CPO",
};

function laneCredentials(family: TradeFamilySlug, order?: readonly string[]): LaneCredential[] {
  // The trade's key credential uses its approved badge label ("State electrical license").
  const { credentialSlug: key, badgeLabel } = TRADE_KEY_CREDENTIALS[family];
  const mapped = credentialsForTrade(family);
  const rank = (slug: string) => {
    if (order) {
      const index = order.indexOf(slug);
      return index >= 0 ? index : order.length + (GENERAL_LAST.has(slug) ? 1 : 0);
    }
    return slug === key ? 0 : GENERAL_LAST.has(slug) ? 2 : 1;
  };
  for (const slug of order ?? []) {
    if (!mapped.some((record) => record.slug === slug)) throw new Error(`${slug} is not mapped to ${family}`);
  }
  // Array.prototype.sort is stable, so ties keep the library's order.
  return [...mapped]
    .sort((a, b) => rank(a.slug) - rank(b.slug))
    .slice(0, MAX_CREDENTIALS)
    .map((record) => ({
      slug: record.slug,
      name: record.slug === key ? badgeLabel : SHORT_NAMES[record.slug] ?? record.name,
      requirementLabel: CREDENTIAL_REQUIREMENT_LABELS[record.requirement],
      href: `/resources/certifications#${record.slug}`,
    }));
}

export function findYourLaneCards(): FindYourLaneCard[] {
  return LANES.map((lane) => {
    const family = TRADE_CAREER_FAMILIES.find((candidate) => candidate.slug === lane.family);
    if (!family) throw new Error(`Unknown trade family: ${lane.family}`);
    if (!family.guideHref) throw new Error(`Trade family ${lane.family} has no live trade page`);
    const image = TRADE_WORKSITE_IMAGES[family.builderTrack];
    if (!image) throw new Error(`No worksite photo for ${family.builderTrack}`);
    return {
      id: lane.family,
      title: lane.title,
      tagline: lane.tagline,
      tool: lane.tool,
      work: lane.work,
      start: lane.start,
      credentials: laneCredentials(lane.family, lane.credentialOrder),
      source: lane.source,
      image,
      exploreHref: `/resources/certifications#trade-${lane.family}`,
      tradePageHref: family.guideHref,
    };
  });
}
