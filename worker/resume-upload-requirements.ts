import { isTradeTrack } from "../app/resume-builder/trade-content";
import { fromIntake, type RoleEntry, type WizardData } from "../app/resume-builder/intake/wizard-data";
import { buildCanonicalSourceRecord } from "./resume-source-canonical";
import { extractionValueSupported } from "./resume-extraction-grounding";
import { dateBefore, isCurrentDate, parseResumeDate, resumeDateInSource } from "./resume-dates";

/**
 * Uploaded-resume requirements and field confidence. The browser uses these for
 * display; the server recomputes them from the saved intake before persisting and
 * before generation, so browser-supplied states are never authoritative.
 */

export type UploadedResumeIssue = {
  id: string;
  kind: "trade" | "contact" | "role" | "history";
  status: "missing" | "conflicting";
  message: string;
  field?: "fullName" | "phone" | "cityState" | "employer" | "jobTitle" | "startDate" | "endDate";
  roleIndex?: number;
};

export type UploadFieldState = {
  status: "confirmed" | "low_confidence" | "missing" | "conflicting";
  source: "user" | "extraction";
  /** Required fields that are missing or conflicting block generation; nothing else does. */
  required: boolean;
};
export type ConfirmedValue = string | boolean | string[];

export function roleHasIdentity(role: Pick<RoleEntry, "employer" | "jobTitle" | "responsibilities">): boolean {
  return Boolean(role.employer.trim() || role.jobTitle.trim() || role.responsibilities.trim());
}

/** Values whose confidence is tracked; descriptive narrative fields are not. */
export function uploadValues(data: WizardData): Record<string, ConfirmedValue> {
  const values: Record<string, ConfirmedValue> = {
    trade: data.trade,
    "targetJob.title": data.targetJob.title,
    "contact.fullName": data.contact.fullName,
    "contact.email": data.contact.email ?? "",
    "contact.phone": data.contact.phone,
    "contact.cityState": data.contact.cityState,
    "fieldValue.certifications": data.fieldValue.certifications,
    "fieldValue.licenses": data.fieldValue.licenses,
    education: data.education,
  };
  data.roles.forEach((role, index) => {
    for (const key of ["employer", "jobTitle", "location", "startDate", "endDate"] as const) values[`roles.${index}.${key}`] = role[key];
    values[`roles.${index}.current`] = role.current;
  });
  return values;
}

function present(value: ConfirmedValue): boolean {
  return Array.isArray(value) ? value.some((item) => item.trim()) : typeof value === "boolean" ? true : Boolean(value.trim());
}

function sourceSupported(source: string, path: string, value: ConfirmedValue): boolean {
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.every((item) => extractionValueSupported(source, item));
  if (/^roles\.\d+\.(?:startDate|endDate)$/.test(path)) {
    return extractionValueSupported(source, value) || resumeDateInSource(source, value);
  }
  if (path === "trade") return true; // A classification, not a transcribed fact.
  return value.split("\n").filter(Boolean).every((line) => extractionValueSupported(source, line));
}

function requiredPath(data: WizardData, path: string): boolean {
  if (path === "contact.fullName" || path === "contact.cityState") return true;
  if (path === "contact.phone") return !data.contact.email?.trim();
  if (path === "contact.email") return !data.contact.phone.trim();
  if (path === "trade") return !data.targetJob.title.trim();
  if (path === "targetJob.title") return !isTradeTrack(data.trade);
  const role = path.match(/^roles\.(\d+)\.(employer|jobTitle|startDate)$/);
  return Boolean(role && data.roles[Number(role[1])] && roleHasIdentity(data.roles[Number(role[1])]));
}

function conflictingPath(data: WizardData, path: string, value: ConfirmedValue): boolean {
  const roleDate = path.match(/^roles\.(\d+)\.(startDate|endDate)$/);
  if (!roleDate || typeof value !== "string" || !value.trim()) return false;
  const role = data.roles[Number(roleDate[1])];
  if (roleDate[2] === "startDate") return !parseResumeDate(value);
  return (!parseResumeDate(value) && !isCurrentDate(value)) || (!role.current && dateBefore(role.startDate, value));
}

export function fieldStates(data: WizardData): Record<string, UploadFieldState> {
  const values = uploadValues(data);
  const confirmed = data.confirmedFields ?? {};
  return Object.fromEntries(Object.entries(values).map(([path, value]) => {
    const user = Object.hasOwn(confirmed, path) && JSON.stringify(confirmed[path]) === JSON.stringify(value);
    const required = requiredPath(data, path);
    const status: UploadFieldState["status"] = conflictingPath(data, path, value)
      ? "conflicting"
      : !present(value)
        ? "missing"
        : user || sourceSupported(data.sourceResumeText, path, value) ? "confirmed" : "low_confidence";
    return [path, { status, source: user ? "user" : "extraction", required } satisfies UploadFieldState];
  }));
}

/**
 * Blocking questions for an uploaded resume. Required: full name; phone OR email;
 * city/state (asked only when the location is entirely absent); trade OR target
 * job title; and for each job an employer, job title, and a valid start year.
 * Everything else, including an unknown end date, is optional.
 */
export function uploadRequirementIssues(data: WizardData): UploadedResumeIssue[] {
  const issues: UploadedResumeIssue[] = [];
  if (!isTradeTrack(data.trade) && !data.targetJob.title.trim()) {
    issues.push({ id: "trade", kind: "trade", status: "missing", message: "Choose your target trade or enter the job title you want." });
  }
  if (!data.contact.fullName.trim()) {
    issues.push({ id: "contact-fullName", kind: "contact", status: "missing", field: "fullName", message: "We could not find your full name." });
  }
  if (!data.contact.phone.trim() && !data.contact.email?.trim()) {
    issues.push({ id: "contact-phone", kind: "contact", status: "missing", field: "phone", message: "Add a phone number or email employers can use." });
  }
  // One field holds city and state; any part of it (city only or state only) is enough.
  if (!data.contact.cityState.trim()) {
    issues.push({ id: "contact-cityState", kind: "contact", status: "missing", field: "cityState", message: "What city and state are you in?" });
  }
  if (!data.roles.some(roleHasIdentity)
    && buildCanonicalSourceRecord(data.sourceResumeText).coverage.issues.some((issue) => issue.code === "jobs")) {
    issues.push({ id: "work-history", kind: "history", status: "missing", message: "We were not able to pull your work history from your upload." });
  }

  data.roles.forEach((role, roleIndex) => {
    if (!roleHasIdentity(role)) return;
    const job = `Job ${roleIndex + 1}`;
    if (!role.employer.trim()) {
      issues.push({ id: `role-${roleIndex}-employer`, kind: "role", status: "missing", roleIndex, field: "employer", message: `${job}: What company did you work for?` });
    }
    if (!role.jobTitle.trim()) {
      issues.push({ id: `role-${roleIndex}-jobTitle`, kind: "role", status: "missing", roleIndex, field: "jobTitle", message: `${job}: What was your job title?` });
    }
    if (!role.startDate.trim()) {
      issues.push({ id: `role-${roleIndex}-startDate`, kind: "role", status: "missing", roleIndex, field: "startDate", message: `${job}: What year did you start this job?` });
    } else if (!parseResumeDate(role.startDate)) {
      issues.push({ id: `role-${roleIndex}-startDate`, kind: "role", status: "conflicting", roleIndex, field: "startDate", message: `${job}: Enter a valid start year or date.` });
    }
    if (!role.current && dateBefore(role.startDate, role.endDate)) {
      issues.push({ id: `role-${roleIndex}-date-order`, kind: "role", status: "conflicting", roleIndex, field: "endDate", message: `${job} has an end date before its start date. Confirm the dates.` });
    }
  });
  return issues;
}

/** Server-side, authoritative review of a saved uploaded-resume intake. */
export function serverUploadReview(intake: unknown, fallback: { trade: string; title: string }): {
  uploaded: boolean;
  fieldStates: Record<string, UploadFieldState>;
  issues: UploadedResumeIssue[];
} {
  const data = fromIntake(intake, { trade: fallback.trade, title: fallback.title, posting: "", fullName: null });
  if (data.sourceProvenance !== "upload") return { uploaded: false, fieldStates: {}, issues: [] };
  return { uploaded: true, fieldStates: fieldStates(data), issues: uploadRequirementIssues(data) };
}
