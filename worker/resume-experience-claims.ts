import { isCurrentDate, parseResumeDate } from "./resume-dates";

/**
 * Years-of-experience and leadership claim guard.
 *
 * The numeric guard in resume-builder-base checks that every digit in the output
 * appears somewhere in the customer's sources. That cannot catch an overstated
 * tenure claim: "9+ years" passes whenever a 9 appears anywhere in the sources —
 * a September start date, a year such as 2009 or 2019, a phone number. This guard
 * checks what such a claim actually asserts:
 *
 * - "N years" of experience is supported only when the customer stated at least
 *   N years themselves, or their dated roles add up to about N years.
 * - Directing, supervising or managing people is supported only when a job title,
 *   a role's leadership details, or the customer's own wording shows it.
 *
 * The target job and the job posting are never evidence: wanting a supervisor job
 * does not prove supervisor experience.
 */

export type ExperienceClaimKind = "years" | "leadership";

export type ExperienceClaim = {
  kind: ExperienceClaimKind;
  /** The matched phrase, e.g. "9+ years" or "directing". Contains no customer identity data. */
  phrase: string;
  /** Claimed whole years for kind "years". */
  years?: number;
};

export type ExperienceEvidence = {
  /** Every dated role, as written by the customer or extracted from their upload. */
  roles: Array<{ startDate?: string; endDate?: string; jobTitle?: string }>;
  /** Customer-authored free text: intake answers, uploaded resume text, correction request. */
  statements: string[];
  /** Customer-entered leadership details for a role (guided intake "leadership" field). */
  leadershipNotes?: string[];
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40,
};
const UNITS = "one|two|three|four|five|six|seven|eight|nine";

// "twenty-five" / "thirty five" before single words so the compound is matched whole.
const NUMBER = `(\\d{1,2}|(?:twenty|thirty|forty)[-\\s](?:${UNITS})|${Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length).join("|")})`;
const YEARS_WORD = "(?:years?|yrs?\\.?)";
// "6-10 years" / "6 to 10 years": the claim is the lower bound. Digits only, so a
// compound word such as "forty-five" is never read as a 40-to-5 range.
const RANGE_RE = new RegExp(`\\b(\\d{1,2})\\s*(?:-|–|—|to)\\s*(\\d{1,2})\\s*\\+?\\s*${YEARS_WORD}`, "gi");
// "9 years", "9+ years", "9-plus years", "nine years". A hyphenated "3-year" is an
// adjective ("3-year apprenticeship"), not a tenure claim, so it is not matched.
const SINGLE_RE = new RegExp(`(?:\\b(less than|under|fewer than|nearly|almost|close to)\\s+)?\\b${NUMBER}\\s*(?:\\+|\\s*-?\\s*plus)?\\s*${YEARS_WORD}(?![-\\w])`, "gi");
const DECADE_RE = /(?:\b(less than|under|nearly|almost|close to)\s+)?\b(?:(a|one|two|three)\s+)?decades?\b/gi;

// People-leadership verbs. "direct" alone is common HVAC language ("direct-drive",
// "direct expansion"), so directing needs an object that is people or an operation.
const PEOPLE = "(?:teams?|crews?|staff|technicians?|techs|workers|employees|personnel|apprentices|helpers|subcontractors|contractors|departments?|operations|shifts?|maintenance (?:teams?|departments?|operations|programs?))";
const LEADERSHIP_RES: RegExp[] = [
  new RegExp(`\\bdirect(?:ed|ing|s)\\s+(?:[\\w&/-]+\\s+){0,3}?${PEOPLE}\\b`, "gi"),
  /\b(?:\d+\+?\s+years?|decades?)\s+(?:of\s+)?directing\b/gi,
  /\bsupervis(?:e|ed|es|ing)\b/gi,
  new RegExp(`\\b(?:managed|manages|managing|led|leads|leading|oversaw|oversees|overseeing|oversee)\\s+(?:[\\w&/-]+\\s+){0,3}?${PEOPLE}\\b`, "gi"),
  /\b(?:team|crew|shift)\s+(?:lead|leader|supervisor|manager)\b/gi,
];

const LEADERSHIP_TITLE_RE = /\b(?:lead|leader|supervisor|superintendent|manager|foreman|forewoman|forelady|director|chief|head|coordinator|crew boss|charge hand)\b/i;
// Plain "lead" is not evidence: "lead paint", "test leads" and "lead-free solder" are trade terms.
const LEADERSHIP_STATEMENT_RE = /\b(?:supervis(?:e|ed|es|ing|ion of|or of)|foreman|forewoman|superintendent|in charge of|trained\s+(?:new\s+)?(?:techs?|technicians?|apprentices|helpers|staff|employees|workers))\b/i;

function wordNumber(value: string): number {
  const lower = value.toLowerCase();
  if (/^\d+$/.test(lower)) return Number(lower);
  const parts = lower.split(/[-\s]+/);
  return parts.reduce((total, part) => total + (NUMBER_WORDS[part] ?? NaN), 0);
}

function hedged(qualifier: string | undefined, value: number): number | null {
  if (!qualifier) return value;
  const lower = qualifier.toLowerCase();
  // "less than 1 year" asserts nothing; "nearly 10 years" asserts a little under 10.
  if (lower === "less than" || lower === "under" || lower === "fewer than") return null;
  return Math.max(0, value - 1);
}

/** Every years-of-experience phrase in the text, with its claimed whole years. */
export function yearsPhrases(text: string): Array<{ phrase: string; years: number }> {
  const results: Array<{ phrase: string; years: number }> = [];
  let remaining = text;
  for (const match of text.matchAll(RANGE_RE)) {
    const low = wordNumber(match[1]);
    if (Number.isFinite(low)) results.push({ phrase: match[0], years: low });
    remaining = remaining.replace(match[0], " ");
  }
  for (const match of remaining.matchAll(SINGLE_RE)) {
    const value = wordNumber(match[2]);
    const years = Number.isFinite(value) ? hedged(match[1], value) : null;
    if (years !== null) results.push({ phrase: match[0].trim(), years });
  }
  for (const match of remaining.matchAll(DECADE_RE)) {
    const count = !match[2] || /^(a|one)$/i.test(match[2]) ? 1 : match[2].toLowerCase() === "two" ? 2 : 3;
    const years = hedged(match[1], count * 10);
    if (years !== null) results.push({ phrase: match[0].trim(), years });
  }
  return results;
}

/** Every people-leadership phrase in the text. */
export function leadershipPhrases(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of LEADERSHIP_RES) {
    for (const match of text.matchAll(pattern)) found.add(match[0].trim());
  }
  return Array.from(found);
}

function monthIndex(value: string | undefined, now: Date, isEnd: boolean): number | null {
  const text = (value ?? "").trim();
  if (!text) return null;
  if (isEnd && isCurrentDate(text)) return now.getUTCFullYear() * 12 + now.getUTCMonth();
  const parsed = parseResumeDate(text);
  if (!parsed) return null;
  // A year without a month counts from January on both ends, so "2015 - 2019"
  // is four years. Months are never guessed in the customer's favor.
  return parsed.year * 12 + ((parsed.month ?? 1) - 1);
}

/**
 * Months covered by the customer's dated roles. Overlapping roles count once, and a
 * role without a readable end date counts as zero, so concurrent jobs and missing
 * dates can never inflate tenure.
 */
export function datedExperienceMonths(roles: ExperienceEvidence["roles"], now = new Date()): number {
  const intervals = roles.flatMap((role) => {
    const start = monthIndex(role.startDate, now, false);
    const end = monthIndex(role.endDate, now, true);
    return start !== null && end !== null && end > start ? [[start, end] as [number, number]] : [];
  }).sort((a, b) => a[0] - b[0]);
  let total = 0;
  let current: [number, number] | null = null;
  for (const interval of intervals) {
    if (!current || interval[0] > current[1]) {
      if (current) total += current[1] - current[0];
      current = [...interval];
    } else {
      current[1] = Math.max(current[1], interval[1]);
    }
  }
  if (current) total += current[1] - current[0];
  return total;
}

/** The most whole years of experience the customer's own evidence supports. */
export function supportedExperienceYears(evidence: ExperienceEvidence, now = new Date()): number {
  const stated = evidence.statements.flatMap((statement) => yearsPhrases(statement).map((phrase) => phrase.years));
  // Nearest whole year: "Jun 2016 - Present" in Nov 2026 supports 10 years.
  const dated = Math.round(datedExperienceMonths(evidence.roles, now) / 12);
  return Math.max(0, dated, ...stated);
}

/** True when a job title, leadership note, or the customer's own wording shows people leadership. */
export function hasLeadershipEvidence(evidence: ExperienceEvidence): boolean {
  if (evidence.roles.some((role) => LEADERSHIP_TITLE_RE.test(role.jobTitle ?? ""))) return true;
  if ((evidence.leadershipNotes ?? []).some((note) => note.trim().length > 0)) return true;
  return evidence.statements.some((statement) => LEADERSHIP_STATEMENT_RE.test(statement) || leadershipPhrases(statement).length > 0);
}

/** Claims in the text that the customer's evidence does not support. */
export function unsupportedExperienceClaims(
  text: string,
  evidence: ExperienceEvidence,
  now = new Date(),
): ExperienceClaim[] {
  const claims: ExperienceClaim[] = [];
  const years = yearsPhrases(text);
  if (years.length) {
    const supported = supportedExperienceYears(evidence, now);
    for (const phrase of years) {
      if (phrase.years > supported) claims.push({ kind: "years", phrase: phrase.phrase, years: phrase.years });
    }
  }
  const leadership = leadershipPhrases(text);
  if (leadership.length && !hasLeadershipEvidence(evidence)) {
    for (const phrase of leadership) claims.push({ kind: "leadership", phrase });
  }
  return claims;
}

export type RoleDateOverlap = { first: number; second: number };

/**
 * Pairs of roles whose date ranges overlap by more than one month. Concurrent jobs
 * are legitimate (a part-time job alongside a full-time one), so this is an advisory
 * for the customer to confirm, never an automatic change to their dates.
 */
export function overlappingRoleDates(
  roles: Array<{ startDate?: string; endDate?: string }>,
  now = new Date(),
): RoleDateOverlap[] {
  const intervals = roles.map((role) => {
    const start = monthIndex(role.startDate, now, false);
    const end = monthIndex(role.endDate, now, true);
    return start !== null && end !== null && end > start ? [start, end] as const : null;
  });
  const overlaps: RoleDateOverlap[] = [];
  for (let first = 0; first < intervals.length; first += 1) {
    for (let second = first + 1; second < intervals.length; second += 1) {
      const a = intervals[first];
      const b = intervals[second];
      if (!a || !b) continue;
      if (Math.min(a[1], b[1]) - Math.max(a[0], b[0]) > 1) overlaps.push({ first, second });
    }
  }
  return overlaps;
}
