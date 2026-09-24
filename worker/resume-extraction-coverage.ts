import { DATE_RANGE_SOURCE, parseResumeDateRange, isCurrentDate, normalizeDateSeparators, parseResumeDate } from "./resume-dates";
export type ExtractionCoverageIssue = {
  code: "jobs" | "employers" | "job_titles" | "dates" | "responsibilities" | "education" | "credentials" | "skills_tools" | "software_cmms" | "training";
  message: string;
  expected?: number;
  actual?: number;
};

export type ExtractionCoverageResult = {
  ready: boolean;
  issues: ExtractionCoverageIssue[];
  warnings: ExtractionCoverageIssue[];
  sourceRoleSignals: number;
  extractedRoles: number;
};

type RecordValue = Record<string, unknown>;

type ParsedRole = RecordValue & {
  employer: string;
  jobTitle: string;
  location: string;
  employmentType: string;
  startDate: string;
  endDate: string;
  current: boolean;
  responsibilities: string;
  equipment: string;
  systems: string;
  workPerformed: string;
  leadership: string;
  workOrders: string;
  measurable: string;
};

function record(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function list(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function normalize(value: string): string {
  return normalizeDateSeparators(value).toLowerCase().replace(/\s+/g, " ").trim();
}

const DATE_RANGE_RE = new RegExp(DATE_RANGE_SOURCE, "gi");
const DATE_RANGE_LINE_RE = new RegExp(DATE_RANGE_SOURCE, "i");

const TOP_LEVEL_SECTION_RE = /^(?:professional\s+experience|work\s+experience|employment\s+history|work\s+history|experience|education(?:\s*(?:&|and)\s*(?:technical\s+)?training)?|technical\s+education|certifications?(?:\s*(?:&|and)\s*licenses?)?|licenses?|credentials|core\s+skills|technical\s+skills|skills|tools|summary|professional\s+summary|additional\s+information)$/i;
const EDUCATION_HEADING_RE = /^(?:education(?:\s*(?:&|and)\s*(?:technical\s+)?training)?|technical\s+education)$/i;
const CREDENTIAL_HEADING_RE = /^(?:certifications?(?:\s*(?:&|and)\s*licenses?)?|licenses?|credentials)$/i;
const TITLE_SIGNAL_RE = /\b(?:technician|supervisor|manager|mechanic|engineer|specialist|foreperson|foreman|lead|director|electrician|plumber|carpenter|welder|installer|operator|maintenance|hvac|refrigeration)\b/i;
const EMPLOYER_SIGNAL_RE = /\b(?:llc|inc\.?|corp\.?|corporation|company|companies|services?|staffing|living|communities|properties|property|heating|air|university|college|hospital|medical|facilities|facility|center|centre|group|solutions)\b/i;
const EDUCATION_EVIDENCE_RE = /\b(?:education|university|college|technical school|trade school|high school|diploma|associate(?:'s)?(?:\s+degree)?|bachelor(?:'s)?(?:\s+degree)?|master(?:'s)?\s+(?:degree|program)|degree)\b/i;
const CREDENTIAL_EVIDENCE_RE = /\b(?:certifications?|certificate|licenses?|certified|epa\s*608|osha(?:\s*10|\s*30)?|nccer|universal certification)\b/i;
const CREDENTIAL_NARRATIVE_RE = /\b(?:professional|experience|experienced|years?|performed|managed|maintained|responsible|skilled|proficient|specializing|expertise|with\s+experience)\b/i;
const PROMPT_LIKE_RE = /\b(?:ignore|disregard)\b.{0,120}\b(?:instructions?|prompt|invent|fabricate|pretend)\b|\b(?:invent|fabricate)\b.{0,80}\b(?:license|certification|credential|employer|job|date)\b/i;
const CREDENTIAL_SEPARATOR_RE = /\s*(?:\||•|▪|◦|●|;)\s*|\s+\/\s+/;

function sourceRoleSignals(source: string): number {
  const ranges = normalize(source).match(DATE_RANGE_RE) ?? [];
  return Math.min(new Set(ranges.map((value) => value.replace(/\s+/g, " "))).size, 12);
}

const WORK_HISTORY_HEADING_RE = /^(?:professional\s+experience|work\s+experience|relevant\s+experience|employment(?:\s+history)?|work\s+history|experience)\s*:?$/i;
const NO_EXPERIENCE_RE = /^(?:none|n\/a|no\s+(?:paid\s+)?(?:work\s+)?experience(?:\s+yet)?)\.?$/i;

/**
 * Employment evidence means a dated range or a work-history section heading with
 * content under it. The word "experience" in a summary ("10 years of experience",
 * "No experience yet") is not evidence that a job exists.
 */
export function hasWorkHistoryEvidence(source: string): boolean {
  if (sourceRoleSignals(source) > 0) return true;
  const lines = sourceLines(source);
  for (let index = 0; index < lines.length; index += 1) {
    if (!WORK_HISTORY_HEADING_RE.test(lines[index])) continue;
    const next = lines.slice(index + 1).find(Boolean) ?? "";
    if (next && !TOP_LEVEL_SECTION_RE.test(next.replace(/:$/, "")) && !NO_EXPERIENCE_RE.test(stripBullet(next))) return true;
  }
  return false;
}

function extractedRoles(value: unknown): RecordValue[] {
  const root = record(value);
  const rolesValue = Array.isArray(root.roles) ? root.roles : Array.isArray(root.experience) ? root.experience : [];
  return rolesValue.filter((item): item is RecordValue => Boolean(item && typeof item === "object" && !Array.isArray(item)));
}

function fieldValue(value: unknown): RecordValue {
  return record(record(value).fieldValue);
}

function hasAnyRoleNarrative(role: RecordValue): boolean {
  return ["responsibilities", "responsibilitiesAndWins", "equipment", "systems", "workPerformed", "leadership", "workOrders", "measurable"]
    .some((key) => text(role[key]).length >= 12);
}

function sourceHas(source: string, pattern: RegExp): boolean {
  return pattern.test(source);
}

function appearsInSource(source: string, value: unknown): boolean {
  const candidate = normalize(text(value));
  return Boolean(candidate && source.includes(candidate));
}

function sourceLines(source: string): string[] {
  return source
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").replace(/^\s*[•▪◦●]\s*/, "• ").trim());
}

function stripBullet(line: string): string {
  return line.replace(/^•\s*/, "").trim();
}

const parseDateRange = parseResumeDateRange;

function splitHeaderParts(line: string): string[] {
  return line
    .split(/\s+(?:\||—|–|\u2022)\s+|\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function looksLikeLocation(value: string): boolean {
  return /\b[A-Za-z .'-]+,\s*[A-Z]{2}\b/.test(value) || /\b(?:remote|hybrid)\b/i.test(value);
}

function inlineTitleEmployerHeader(lines: string[]): { employer: string; jobTitle: string; location: string } | null {
  for (const line of lines) {
    if (!line.includes("|")) continue;
    const parts = line.split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2) continue;

    const location = parts.find(looksLikeLocation) ?? "";
    const nonLocation = parts.filter((part) => part !== location);
    if (nonLocation.length < 2) continue;

    const [first, second] = nonLocation;
    if (!TITLE_SIGNAL_RE.test(first)) continue;
    if (normalize(first) === normalize(second)) continue;

    return { jobTitle: first, employer: second, location };
  }
  return null;
}

/** Structural signs of an organization name: an acronym ("ABC"), "&", or a possessive ("Joe's"). */
function organizationMarker(value: string): boolean {
  return /(?:^|\s)[A-Z]{2,}(?:\s|$)/.test(value.replace(TITLE_SIGNAL_RE, "")) || /&|\b\w+'s\b/.test(value);
}

function chooseHeaderFields(lines: string[]): { employer: string; jobTitle: string; location: string } {
  const explicitInline = inlineTitleEmployerHeader(lines);
  if (explicitInline) return explicitInline;

  const candidates = lines.flatMap(splitHeaderParts).filter((part) => !DATE_RANGE_LINE_RE.test(part));
  const location = candidates.find(looksLikeLocation) ?? "";
  const nonLocation = candidates.filter((part) => part !== location);

  let jobTitle = nonLocation.find((part) => TITLE_SIGNAL_RE.test(part) && !EMPLOYER_SIGNAL_RE.test(part)) ?? "";
  let employer = nonLocation.find((part) => part !== jobTitle && EMPLOYER_SIGNAL_RE.test(part)) ?? "";
  if (!jobTitle && !employer && nonLocation.length === 2) {
    // No title or employer keyword on either part: an organization marker names
    // the employer; otherwise the first part is the title ("Laborer" above "ABC Builders").
    const titleIndex = organizationMarker(nonLocation[0]) && !organizationMarker(nonLocation[1]) ? 1 : 0;
    return { jobTitle: nonLocation[titleIndex], employer: nonLocation[1 - titleIndex], location };
  }
  if (!jobTitle) jobTitle = nonLocation.find((part) => TITLE_SIGNAL_RE.test(part)) ?? "";
  if (!employer) employer = nonLocation.find((part) => part !== jobTitle) ?? "";
  if (!jobTitle && nonLocation.length >= 2) jobTitle = nonLocation[1];
  if (!employer && nonLocation.length >= 1) employer = nonLocation[0] === jobTitle ? nonLocation[1] ?? "" : nonLocation[0];

  if (normalize(employer) === normalize(jobTitle)) {
    employer = nonLocation.find((part) => normalize(part) !== normalize(jobTitle)) ?? "";
  }
  return { employer, jobTitle, location };
}

function looksLikeNarrative(line: string): boolean {
  const cleaned = stripBullet(line);
  return line.startsWith("•") || /[.!?]$/.test(cleaned) || cleaned.length > 120;
}

/** A standalone title line: one short part that is not a heading, date, bullet, location, or contact detail. */
function titleOnlyLine(line: string | undefined): line is string {
  if (!line || TOP_LEVEL_SECTION_RE.test(line) || parseDateRange(line) || parseResumeDate(line) || looksLikeNarrative(line)) return false;
  if (/^[-*–—]\s/.test(line) || /[@\d]/.test(line) || looksLikeLocation(line) || splitHeaderParts(line).length !== 1) return false;
  // "Acme Services" is an employer line; "HVAC Service Technician" is still a title.
  return line.split(/\s+/).length <= 8 && (TITLE_SIGNAL_RE.test(line) || !EMPLOYER_SIGNAL_RE.test(line));
}

/** True when an "Employer — City, ST" style line already names a job title. */
function carriesTitle(line: string): boolean {
  return splitHeaderParts(line).some((part) => !looksLikeLocation(part) && TITLE_SIGNAL_RE.test(part) && !EMPLOYER_SIGNAL_RE.test(part));
}

/**
 * Title directly above a title-less "Employer — Location" line:
 *   Building Equipment Mechanic
 *   Northgate Medical Center — Portland, OR
 *   Mar 2021 - Present
 * Titles without a known title word must start a block so a previous job's
 * trailing line is never read as the next job's title.
 */
function stackedTitleAbove(lines: string[], employerIndex: number): boolean {
  const title = lines[employerIndex - 1];
  if (!titleOnlyLine(title) || carriesTitle(lines[employerIndex])) return false;
  const before = lines[employerIndex - 2];
  return TITLE_SIGNAL_RE.test(title) || !before || TOP_LEVEL_SECTION_RE.test(before) || Boolean(parseDateRange(before)) || looksLikeNarrative(before);
}

function roleHeaderStart(lines: string[], dateIndex: number): number {
  let start = dateIndex;
  let seen = 0;
  for (let index = dateIndex - 1; index >= 0 && seen < 3; index -= 1) {
    const line = lines[index];
    if (!line) continue;
    if (TOP_LEVEL_SECTION_RE.test(line) || parseDateRange(line) || looksLikeNarrative(line)) break;
    start = index;
    seen += 1;
    if (splitHeaderParts(line).length >= 2) {
      if (stackedTitleAbove(lines, index)) start = index - 1;
      break;
    }
  }
  return start;
}

/** Header fields when the first header line is a stacked title above a multi-part employer line. */
function stackedHeaderFields(headerLines: string[]): { employer: string; jobTitle: string; location: string } | null {
  const [title, employerLine] = headerLines;
  if (!titleOnlyLine(title) || !employerLine || splitHeaderParts(employerLine).length < 2 || carriesTitle(employerLine)) return null;
  const { employer, location } = chooseHeaderFields(headerLines.slice(1));
  return employer ? { employer, jobTitle: title, location } : null;
}

function parseRolesDeterministically(source: string): ParsedRole[] {
  const lines = sourceLines(normalizeDateSeparators(source));
  const anchors = lines.flatMap((line, index) => {
    const range = parseDateRange(line);
    return range ? [{ index, range, headerStart: roleHeaderStart(lines, index) }] : [];
  });

  let inExperience = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (TOP_LEVEL_SECTION_RE.test(line)) {
      inExperience = /experience|employment|work history/i.test(line);
      continue;
    }
    if (!inExperience || anchors.some((anchor) => index >= anchor.headerStart && index <= anchor.index)) continue;
    const parts = splitHeaderParts(line);
    if (parts.length < 2 || looksLikeNarrative(line)) continue;
    // Undated stacked header ("Title" above "Employer — City, ST", date missing):
    // keep it as its own job rather than folding it into the previous job's duties.
    const before = lines[index - 2];
    if (stackedTitleAbove(lines, index) && (!before || TOP_LEVEL_SECTION_RE.test(before) || looksLikeNarrative(before))
      && !anchors.some((anchor) => index - 1 >= anchor.headerStart && index - 1 <= anchor.index)) {
      anchors.push({ index, headerStart: index - 1, range: { startDate: "", endDate: "", match: "" } });
      continue;
    }
    const header = chooseHeaderFields([line]);
    if (!header.employer || !header.jobTitle || !TITLE_SIGNAL_RE.test(header.jobTitle)) continue;
    const next = lines[index + 1]?.trim() ?? "";
    const singleDate = parseResumeDate(next) ? next : "";
    anchors.push({ index: singleDate ? index + 1 : index, headerStart: index,
      range: { startDate: singleDate, endDate: "", match: singleDate } });
  }
  anchors.sort((a, b) => a.headerStart - b.headerStart);
  // Employer heading shared by later title-only positions ("Employer / Title / Dates", then "Title / Dates").
  let groupEmployer: { employer: string; location: string } | null = null;
  return anchors.map((anchor, anchorIndex) => {
    const headerLines = lines.slice(anchor.headerStart, anchor.index + 1)
      // Remove only the date text, then any delimiter it leaves dangling.
      .map((line) => (anchor.range.match ? line.replace(anchor.range.match, "") : line).replace(/^[\s|•·,;-]+|[\s|•·,;-]+$/g, "").trim())
      .filter(Boolean);
    let header = stackedHeaderFields(headerLines) ?? chooseHeaderFields(headerLines);
    const previousEnd = anchors[anchorIndex - 1]?.index ?? anchor.headerStart;
    const sameSection = !lines.slice(previousEnd + 1, anchor.headerStart).some((line) => TOP_LEVEL_SECTION_RE.test(line));
    if (!header.employer && header.jobTitle && headerLines.length === 1 && groupEmployer && sameSection) {
      header = { ...header, employer: groupEmployer.employer, location: header.location || groupEmployer.location };
    } else {
      const employerFirst = headerLines.length >= 2 && Boolean(header.employer) && Boolean(header.jobTitle)
        && headerLines[0].includes(header.employer) && !headerLines[0].includes(header.jobTitle);
      groupEmployer = employerFirst ? { employer: header.employer, location: header.location } : null;
    }
    const nextHeaderStart = anchors[anchorIndex + 1]?.headerStart ?? lines.length;
    const responsibilityLines: string[] = [];

    for (let index = anchor.index + 1; index < nextHeaderStart; index += 1) {
      const line = lines[index];
      if (!line) continue;
      if (TOP_LEVEL_SECTION_RE.test(line)) break;
      const cleaned = stripBullet(line);
      if (cleaned && cleaned.length >= 8) responsibilityLines.push(cleaned);
    }

    return {
      employer: header.employer,
      jobTitle: header.jobTitle,
      location: header.location,
      employmentType: "",
      startDate: anchor.range.startDate,
      endDate: anchor.range.endDate,
      current: isCurrentDate(anchor.range.endDate),
      responsibilities: responsibilityLines.join("\n"),
      equipment: "",
      systems: "",
      workPerformed: "",
      leadership: "",
      workOrders: "",
      measurable: "",
    };
  }).filter((role) => role.employer || role.jobTitle);
}

function collectSection(source: string, heading: RegExp): string[] {
  const lines = sourceLines(source);
  const start = lines.findIndex((line) => heading.test(line));
  if (start < 0) return [];
  const result: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;
    if (TOP_LEVEL_SECTION_RE.test(line)) break;
    result.push(stripBullet(line));
  }
  return result.filter(Boolean);
}

function parseEducationDeterministically(source: string): string {
  const section = collectSection(source, EDUCATION_HEADING_RE);
  if (section.length) return section.join("\n");
  return sourceLines(source)
    .filter((line) => /\b(?:university|college|technical school|trade school|high school)\b/i.test(line))
    .map(stripBullet)
    .join("\n");
}

function splitCredentialCandidateLine(value: string): string[] {
  return stripBullet(value)
    .split(CREDENTIAL_SEPARATOR_RE)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isConciseCredentialCandidate(value: string): boolean {
  const cleaned = stripBullet(value);
  if (!cleaned || PROMPT_LIKE_RE.test(cleaned) || !CREDENTIAL_EVIDENCE_RE.test(cleaned)) return false;
  if (CREDENTIAL_NARRATIVE_RE.test(cleaned)) return false;
  const words = normalize(cleaned).split(" ").filter(Boolean);
  return words.length <= 12;
}

function credentialCandidates(source: string): string[] {
  const lines = sourceLines(source);
  const section = collectSection(source, CREDENTIAL_HEADING_RE);
  const educationLines = new Set(collectSection(source, EDUCATION_HEADING_RE).map(normalize));
  const explicit = lines.filter((line) => {
    const cleaned = stripBullet(line);
    return CREDENTIAL_EVIDENCE_RE.test(cleaned)
      && !educationLines.has(normalize(cleaned))
      && !PROMPT_LIKE_RE.test(cleaned);
  });
  const seen = new Set<string>();
  const result: string[] = [];
  for (const candidate of [...section, ...explicit].flatMap(splitCredentialCandidateLine)) {
    const cleaned = stripBullet(candidate);
    const key = normalize(cleaned);
    if (!key || seen.has(key) || !isConciseCredentialCandidate(cleaned)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

function roleMatchScore(aiRole: RecordValue, fallbackRole: RecordValue): number {
  let score = 0;
  if (text(aiRole.employer) && normalize(text(aiRole.employer)) === normalize(text(fallbackRole.employer))) score += 4;
  if (text(aiRole.jobTitle) && normalize(text(aiRole.jobTitle)) === normalize(text(fallbackRole.jobTitle))) score += 4;
  if (text(aiRole.startDate) && normalize(text(aiRole.startDate)) === normalize(text(fallbackRole.startDate))) score += 2;
  if (text(aiRole.endDate) && normalize(text(aiRole.endDate)) === normalize(text(fallbackRole.endDate))) score += 2;
  return score;
}

function preferSourceValue(source: string, aiValue: unknown, fallbackValue: unknown): string {
  const ai = text(aiValue);
  const fallback = text(fallbackValue);
  if (!fallback) return ai;
  const normalizedSource = normalize(source);
  const fallbackVerified = appearsInSource(normalizedSource, fallback);
  if (!ai) return fallbackVerified ? fallback : ai;
  const aiVerified = appearsInSource(normalizedSource, ai);
  if (fallbackVerified && (!aiVerified || normalize(ai) !== normalize(fallback))) return fallback;
  return ai;
}

function mergeRolesFromSource(source: string, aiRoles: RecordValue[], fallbackRoles: ParsedRole[]): RecordValue[] {
  const unused = new Set(aiRoles.map((_, index) => index));
  const merged: RecordValue[] = fallbackRoles.map((fallbackRole) => {
    let bestIndex = -1;
    let bestScore = 0;
    for (const index of unused) {
      const score = roleMatchScore(aiRoles[index], fallbackRole);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    const aiRole = bestIndex >= 0 && bestScore >= 2 ? aiRoles[bestIndex] : {};
    if (bestIndex >= 0 && bestScore >= 2) unused.delete(bestIndex);

    return {
      ...aiRole,
      employer: preferSourceValue(source, aiRole.employer, fallbackRole.employer),
      jobTitle: preferSourceValue(source, aiRole.jobTitle, fallbackRole.jobTitle),
      location: preferSourceValue(source, aiRole.location, fallbackRole.location),
      startDate: preferSourceValue(source, aiRole.startDate, fallbackRole.startDate),
      endDate: preferSourceValue(source, aiRole.endDate, fallbackRole.endDate),
      current: fallbackRole.current || aiRole.current === true,
      employmentType: text(aiRole.employmentType) || fallbackRole.employmentType,
      responsibilities: text(aiRole.responsibilities) && appearsInSource(normalize(source), aiRole.responsibilities)
        ? text(aiRole.responsibilities)
        : fallbackRole.responsibilities || text(aiRole.responsibilities),
      equipment: text(aiRole.equipment) || fallbackRole.equipment,
      systems: text(aiRole.systems) || fallbackRole.systems,
      workPerformed: text(aiRole.workPerformed) || fallbackRole.workPerformed,
      leadership: text(aiRole.leadership) || fallbackRole.leadership,
      workOrders: text(aiRole.workOrders) || fallbackRole.workOrders,
      measurable: text(aiRole.measurable) || fallbackRole.measurable,
    };
  });

  for (const index of unused) {
    const role = aiRoles[index];
    if (appearsInSource(normalize(source), role.employer) && appearsInSource(normalize(source), role.jobTitle)) merged.push(role);
  }
  return merged;
}

export function repairResumeExtractionFromSource(sourceResumeText: string, structured: unknown): { structured: RecordValue; repaired: boolean } {
  const root = { ...record(structured) };
  const originalRoles = extractedRoles(root);
  const roleSignals = sourceRoleSignals(sourceResumeText);
  const needsRoleRepair = hasWorkHistoryEvidence(sourceResumeText) && (
    originalRoles.length === 0 || originalRoles.length < roleSignals
    || originalRoles.some((role) => !text(role.employer) || !text(role.jobTitle) || (!text(role.startDate) && !text(role.dates)) || !hasAnyRoleNarrative(role))
  );
  const educationEvidence = EDUCATION_EVIDENCE_RE.test(sourceResumeText);
  const field = fieldValue(root);
  const credentialEvidence = CREDENTIAL_EVIDENCE_RE.test(sourceResumeText) && !PROMPT_LIKE_RE.test(sourceResumeText);
  const credentialCount = list(field.certifications).length + (text(field.licenses) ? 1 : 0);
  let repaired = false;

  if (needsRoleRepair) {
    const fallbackRoles = parseRolesDeterministically(sourceResumeText);
    if (fallbackRoles.length) {
      root.roles = mergeRolesFromSource(sourceResumeText, originalRoles, fallbackRoles);
      repaired = true;
    }
  }

  if (educationEvidence && !text(root.education)) {
    const education = parseEducationDeterministically(sourceResumeText);
    if (education) {
      root.education = education;
      repaired = true;
    }
  }

  if (credentialEvidence && credentialCount === 0) {
    const credentials = credentialCandidates(sourceResumeText);
    if (credentials.length) {
      const nextField: RecordValue = { ...field, certifications: credentials };
      if (!("licenses" in nextField)) nextField.licenses = "";
      root.fieldValue = nextField;
      repaired = true;
    }
  }

  return { structured: root, repaired };
}

export function assessResumeExtractionCoverage(sourceResumeText: string, structured: unknown): ExtractionCoverageResult {
  const source = normalize(sourceResumeText);
  if (!source) {
    return { ready: true, issues: [], warnings: [], sourceRoleSignals: 0, extractedRoles: extractedRoles(structured).length };
  }

  const root = record(structured);
  const confirmed = record(record(root.meta).confirmedFields);
  const isConfirmed = (index: number, field: string, value: unknown) => confirmed[`roles.${index}.${field}`] === value;
  const roles = extractedRoles(structured);
  const field = fieldValue(structured);
  const roleSignals = sourceRoleSignals(sourceResumeText);
  const issues: ExtractionCoverageIssue[] = [];
  const warnings: ExtractionCoverageIssue[] = [];

  if (roles.length === 0 && hasWorkHistoryEvidence(sourceResumeText)) {
    issues.push({
      code: "jobs",
      message: roleSignals > 0
        ? `The uploaded resume appears to contain ${roleSignals} dated job${roleSignals === 1 ? "" : "s"}, but none were extracted.`
        : "The uploaded resume has a work-history section, but no jobs were extracted from it.",
      expected: Math.max(roleSignals, 1),
      actual: 0,
    });
  } else if (roleSignals >= 2 && roles.length < roleSignals) {
    issues.push({ code: "jobs", message: `The uploaded resume appears to contain ${roleSignals} dated jobs, but only ${roles.length} were extracted.`, expected: roleSignals, actual: roles.length });
  }

  if (roles.length > 0) {
    const missingEmployers = roles.filter((role) => !text(role.employer)).length;
    if (missingEmployers > 0) issues.push({ code: "employers", message: `${missingEmployers} extracted job(s) are missing an employer.` });
    const missingTitles = roles.filter((role) => !text(role.jobTitle)).length;
    if (missingTitles > 0) issues.push({ code: "job_titles", message: `${missingTitles} extracted job(s) are missing a job title.` });
    const sourceMismatchEmployers = roles.filter((role, index) => text(role.employer) && !isConfirmed(index, "employer", role.employer) && !appearsInSource(source, role.employer)).length;
    if (sourceMismatchEmployers > 0) issues.push({ code: "employers", message: `${sourceMismatchEmployers} extracted employer name(s) could not be verified in the uploaded resume.` });
    const sourceMismatchTitles = roles.filter((role, index) => text(role.jobTitle) && !isConfirmed(index, "jobTitle", role.jobTitle) && !appearsInSource(source, role.jobTitle)).length;
    if (sourceMismatchTitles > 0) issues.push({ code: "job_titles", message: `${sourceMismatchTitles} extracted job title(s) could not be verified in the uploaded resume.` });
    const rolesWithoutDates = roles.filter((role) => !text(role.startDate) && !text(role.dates)).length;
    if (rolesWithoutDates > 0) issues.push({ code: "dates", message: `${rolesWithoutDates} extracted job(s) are missing dates that are present in the uploaded resume.` });
    const sourceMismatchedDates = roles.filter((role, index) => {
      const start = text(role.startDate);
      const end = text(role.endDate);
      if (!start || isConfirmed(index, "startDate", role.startDate)) return false;
      const dateText = end ? `${start} - ${end}` : start;
      return !appearsInSource(source, dateText) && !appearsInSource(source, start);
    }).length;
    if (sourceMismatchedDates > 0) issues.push({ code: "dates", message: `${sourceMismatchedDates} extracted job date range(s) could not be verified in the uploaded resume.` });
  }

  const sourceLooksLikeWorkHistory = sourceHas(source, /\b(work experience|professional experience|employment history|work history|experience)\b/i);
  if (sourceLooksLikeWorkHistory && roles.length > 0 && roles.some((role) => !hasAnyRoleNarrative(role))) {
    issues.push({ code: "responsibilities", message: "At least one extracted job lost its responsibilities or substantive work details." });
  }

  const educationEvidence = sourceHas(source, EDUCATION_EVIDENCE_RE);
  if (educationEvidence && !text(root.education)) issues.push({ code: "education", message: "Education appears in the uploaded resume but was not extracted." });

  const credentialEvidence = sourceHas(source, CREDENTIAL_EVIDENCE_RE) && !PROMPT_LIKE_RE.test(sourceResumeText);
  const credentialCount = list(field.certifications).length + (text(field.licenses) ? 1 : 0);
  if (credentialEvidence && credentialCount === 0) issues.push({ code: "credentials", message: "Certifications or licenses appear in the uploaded resume but were not extracted." });

  const skillsToolsEvidence = sourceHas(source, /\b(core skills|technical skills|skills|tools|equipment|systems)\b/i);
  const skillsToolsCount = list(field.tools).length + list(field.equipmentSystems).length + list(field.technicalSkills).length;
  if (skillsToolsEvidence && skillsToolsCount === 0) warnings.push({ code: "skills_tools", message: "Skills, tools, equipment, or systems appear in the uploaded resume but were not extracted." });

  const softwareEvidence = sourceHas(source, /\b(software|cmms|salesforce|yardi|maximo|building engines|buildingengines|upkeep|emaint|computerized maintenance management)\b/i);
  if (softwareEvidence && list(field.software).length === 0) warnings.push({ code: "software_cmms", message: "Software or CMMS experience appears in the uploaded resume but was not extracted." });

  const trainingEvidence = sourceHas(source, /\b(training|safety training|lockout\/?tagout|loto|confined space|fall protection|respirator|silica|fire watch)\b/i);
  if (trainingEvidence && list(field.safety).length === 0 && !text(root.additionalDetails)) warnings.push({ code: "training", message: "Meaningful training appears in the uploaded resume but was not extracted." });

  return { ready: issues.length === 0, issues, warnings, sourceRoleSignals: roleSignals, extractedRoles: roles.length };
}

export function uploadedSourceFromIntake(intake: unknown): string {
  const root = record(intake);
  const meta = record(root.meta);
  const imported = meta.importedResume === true || text(meta.source) === "upload";
  return imported ? text(root.sourceResumeText) : "";
}

export function assessSavedIntakeExtractionCoverage(intake: unknown): ExtractionCoverageResult {
  const source = uploadedSourceFromIntake(intake);
  return assessResumeExtractionCoverage(source, intake);
}
