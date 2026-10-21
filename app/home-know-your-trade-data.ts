import {
  CREDENTIAL_KIND_LABELS,
  CREDENTIAL_MYTHS,
  CREDENTIAL_REQUIREMENT_LABELS,
  credentialBySlug,
  credentialsForTrade,
  type CredentialKind,
} from "./resources/credential-library";
import { TRADE_CAREER_FAMILIES, type TradeCareerFamily } from "./resume-examples/trade-career-catalog";

/** Trades offered as quick picks on the homepage, in display order. */
export const KNOW_YOUR_TRADE_PICKS = [
  ["hvac-refrigeration", "HVAC"],
  ["electrical-low-voltage", "Electrical"],
  ["plumbing-pipefitting", "Plumbing"],
  ["facilities-property-apartment-maintenance", "Facilities"],
  ["welding-fabrication-machining", "Welding"],
  ["commercial-driving-transportation", "Driving"],
  ["construction-carpentry", "Construction"],
] as const;

const MAX_CREDENTIALS = 4;
/** OSHA Outreach applies to every trade, so it goes last to keep trade-specific credentials first. */
const GENERAL_LAST = new Set(["osha-outreach-10-30", "state-trade-license"]);

export type KnowYourTradeCredential = {
  slug: string;
  name: string;
  kind: CredentialKind;
  kindLabel: string;
  requirementLabel: string;
  summary: string;
};

export type KnowYourTradeTrade = {
  slug: string;
  label: string;
  name: string;
  builderHref: string;
  credentials: KnowYourTradeCredential[];
};

export type KnowYourTradeMyth = { id: string; claim: string; isTrue: boolean; fact: string; source: string; href: string };

function familyBySlug(slug: string): TradeCareerFamily {
  const family = TRADE_CAREER_FAMILIES.find((candidate) => candidate.slug === slug);
  if (!family) throw new Error(`Unknown trade family: ${slug}`);
  return family;
}

export function knowYourTradeTrades(): KnowYourTradeTrade[] {
  return KNOW_YOUR_TRADE_PICKS.map(([slug, label]) => {
    const family = familyBySlug(slug);
    const credentials = [...credentialsForTrade(slug)]
      .sort((a, b) => Number(GENERAL_LAST.has(a.slug)) - Number(GENERAL_LAST.has(b.slug)))
      .slice(0, MAX_CREDENTIALS)
      .map((record) => ({
        slug: record.slug,
        name: record.name,
        kind: record.kind,
        kindLabel: CREDENTIAL_KIND_LABELS[record.kind],
        requirementLabel: CREDENTIAL_REQUIREMENT_LABELS[record.requirement],
        summary: record.summary,
      }));
    return { slug, label, name: family.name, builderHref: family.guideHref ?? "/#resume-start", credentials };
  });
}

export function knowYourTradeMyths(): KnowYourTradeMyth[] {
  return CREDENTIAL_MYTHS.map((myth) => {
    const record = credentialBySlug(myth.credentialSlug);
    if (!record) throw new Error(`Myth ${myth.id} points at unknown credential ${myth.credentialSlug}`);
    return {
      id: myth.id,
      claim: myth.claim,
      isTrue: myth.isTrue,
      fact: myth.fact,
      source: record.sources[0].label,
      href: `/resources/certifications#${record.slug}`,
    };
  });
}
