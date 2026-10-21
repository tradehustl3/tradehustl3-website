/**
 * U.S. Bureau of Labor Statistics figures used on the homepage and Resource
 * Center. Each value is quoted from the linked Occupational Outlook Handbook
 * page (2025–35 projections; wages are May 2025 medians).
 *
 * The HVAC and electrician occupations sit inside the broader groups, so these
 * numbers must never be summed or presented as a combined total.
 */

export type LaborMarketFact = {
  id: string;
  label: string;
  annualOpenings: number;
  /** Projected 2025–35 growth in percent, when BLS states one. */
  growthPercent?: number;
  /** Median annual wage, May 2025, when shown. */
  medianPay?: number;
  sourceUrl: string;
};

export const LABOR_MARKET_PERIOD = "2025–2035";
export const LABOR_MARKET_CHECKED_ON = "2026-10-21";

export const LABOR_MARKET_FACTS: readonly LaborMarketFact[] = [
  {
    id: "construction-extraction",
    label: "construction & extraction occupations",
    annualOpenings: 587_000,
    medianPay: 59_540,
    sourceUrl: "https://www.bls.gov/ooh/construction-and-extraction/",
  },
  {
    id: "installation-maintenance-repair",
    label: "installation, maintenance & repair occupations",
    annualOpenings: 569_000,
    medianPay: 59_620,
    sourceUrl: "https://www.bls.gov/ooh/installation-maintenance-and-repair/",
  },
  {
    id: "electricians",
    label: "electricians",
    annualOpenings: 72_700,
    growthPercent: 9,
    sourceUrl: "https://www.bls.gov/ooh/construction-and-extraction/electricians.htm",
  },
  {
    id: "hvacr",
    label: "HVAC & refrigeration mechanics and installers",
    annualOpenings: 40_600,
    growthPercent: 11,
    sourceUrl: "https://www.bls.gov/ooh/installation-maintenance-and-repair/heating-air-conditioning-and-refrigeration-mechanics-and-installers.htm",
  },
];

export const formatCount = (value: number) => value.toLocaleString("en-US");
export const formatPay = (value: number) => `$${value.toLocaleString("en-US")}`;
