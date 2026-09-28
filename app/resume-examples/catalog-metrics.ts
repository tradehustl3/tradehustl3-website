import { TRADE_GUIDANCE, TRADE_TRACKS } from "../resume-builder/trade-content";
import { TRADE_LANDING_PAGES } from "../resume-builder/trade-landing-content";
import { MAPPED_ROLE_COUNT, TRADE_CAREER_FAMILIES } from "./trade-career-catalog";

const normalize = (value: string) => value.trim().toLocaleLowerCase("en-US");

const distinctFieldPrompts = new Set(
  Object.values(TRADE_GUIDANCE).flatMap((guidance) => [
    ...guidance.tools,
    ...guidance.equipmentSystems,
    ...guidance.certifications,
    ...guidance.technicalSkills,
    ...guidance.dutyCategories,
  ].map(normalize)),
);

export const CATALOG_METRICS = {
  careerFamilies: TRADE_CAREER_FAMILIES.length,
  mappedRoles: MAPPED_ROLE_COUNT,
  guidedTracks: TRADE_TRACKS.length,
  detailedGuides: TRADE_LANDING_PAGES.length,
  fieldPrompts: distinctFieldPrompts.size,
  accomplishmentExamples: TRADE_LANDING_PAGES.reduce(
    (total, page) => total + page.accomplishments.examples.length,
    0,
  ),
} as const;
