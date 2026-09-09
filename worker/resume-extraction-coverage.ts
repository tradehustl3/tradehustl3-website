export type ExtractionCoverageIssue = {
  code: "jobs" | "dates" | "responsibilities" | "education" | "credentials" | "skills_tools" | "software_cmms" | "training";
  message: string;
  expected?: number;
  actual?: number;
};

export type ExtractionCoverageResult = {
  ready: boolean;
  issues: ExtractionCoverageIssue[];
  sourceRoleSignals: number;
  extractedRoles: number;
};

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\u2012-\u2015]/g, "-").replace(/\s+/g, " ").trim();
}

const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DATE = `(?:${MONTH}\\s+)?(?:19|20)\\d{2}`;
const DATE_RANGE_RE = new RegExp(`\\b${DATE}\\s*(?:-|to|through|thru)\\s*(?:${DATE}|present|current|now)\\b`, "gi");

function sourceRoleSignals(source: string): number {
  const normalized = normalize(source);
  const ranges = normalized.match(DATE_RANGE_RE) ?? [];
  return Math.min(new Set(ranges.map((value) => value.replace(/\s+/g, " "))).size, 12);
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

export function assessResumeExtractionCoverage(sourceResumeText: string, structured: unknown): ExtractionCoverageResult {
  const source = normalize(sourceResumeText);
  if (!source) return { ready: true, issues: [], sourceRoleSignals: 0, extractedRoles: extractedRoles(structured).length };

  const root = record(structured);
  const roles = extractedRoles(structured);
  const field = fieldValue(structured);
  const roleSignals = sourceRoleSignals(sourceResumeText);
  const issues: ExtractionCoverageIssue[] = [];

  if (roleSignals >= 2 && roles.length < roleSignals) {
    issues.push({
      code: "jobs",
      message: `The uploaded resume appears to contain ${roleSignals} dated jobs, but only ${roles.length} were extracted.`,
      expected: roleSignals,
      actual: roles.length,
    });
  }

  if (roleSignals > 0 && roles.length > 0) {
    const rolesWithoutDates = roles.filter((role) => !text(role.startDate) && !text(role.dates)).length;
    if (rolesWithoutDates > 0) {
      issues.push({ code: "dates", message: `${rolesWithoutDates} extracted job(s) are missing dates that are present in the uploaded resume.` });
    }
  }

  const sourceLooksLikeWorkHistory = sourceHas(source, /\b(work experience|professional experience|employment history|experience)\b/i);
  if (sourceLooksLikeWorkHistory && roles.length > 0 && roles.some((role) => !hasAnyRoleNarrative(role))) {
    issues.push({ code: "responsibilities", message: "At least one extracted job lost its responsibilities or substantive work details." });
  }

  const educationEvidence = sourceHas(source, /\b(education|university|college|technical school|trade school|high school|diploma|associate(?:'s)?|bachelor(?:'s)?|master(?:'s)?|degree)\b/i);
  if (educationEvidence && !text(root.education)) {
    issues.push({ code: "education", message: "Education appears in the uploaded resume but was not extracted." });
  }

  const credentialEvidence = sourceHas(source, /\b(certifications?|licenses?|certified|epa\s*608|osha(?:\s*10|\s*30)?|nccer|universal certification)\b/i);
  const credentialCount = list(field.certifications).length + (text(field.licenses) ? 1 : 0);
  if (credentialEvidence && credentialCount === 0) {
    issues.push({ code: "credentials", message: "Certifications or licenses appear in the uploaded resume but were not extracted." });
  }

  const skillsToolsEvidence = sourceHas(source, /\b(core skills|technical skills|skills|tools|equipment|systems)\b/i);
  const skillsToolsCount = list(field.tools).length + list(field.equipmentSystems).length + list(field.technicalSkills).length;
  if (skillsToolsEvidence && skillsToolsCount === 0) {
    issues.push({ code: "skills_tools", message: "Skills, tools, equipment, or systems appear in the uploaded resume but were not extracted." });
  }

  const softwareEvidence = sourceHas(source, /\b(software|cmms|salesforce|yardi|maximo|building engines|buildingengines|upkeep|emaint|computerized maintenance management)\b/i);
  if (softwareEvidence && list(field.software).length === 0) {
    issues.push({ code: "software_cmms", message: "Software or CMMS experience appears in the uploaded resume but was not extracted." });
  }

  const trainingEvidence = sourceHas(source, /\b(training|safety training|lockout\/?tagout|loto|confined space|fall protection|respirator|silica|fire watch)\b/i);
  if (trainingEvidence && list(field.safety).length === 0 && !text(root.additionalDetails)) {
    issues.push({ code: "training", message: "Meaningful training appears in the uploaded resume but was not extracted." });
  }

  return { ready: issues.length === 0, issues, sourceRoleSignals: roleSignals, extractedRoles: roles.length };
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
