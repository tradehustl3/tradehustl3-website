import { normalizeResumeValue } from "./resume-section-classifier";
import { isCurrentDate, parseResumeDate, resumeDateInSource } from "./resume-dates";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";

export function extractionValueSupported(source: string, value: unknown): boolean {
  const needle = normalizeResumeValue(text(value));
  return Boolean(needle && ` ${normalizeResumeValue(source)} `.includes(` ${needle} `));
}

function groundedDate(source: string, value: unknown, allowCurrent: boolean): string {
  const date = text(value);
  if (!date) return "";
  if (allowCurrent && isCurrentDate(date)) return extractionValueSupported(source, date) ? date : "";
  return parseResumeDate(date) && (extractionValueSupported(source, date) || resumeDateInSource(source, date)) ? date : "";
}

/**
 * Extraction is transcription, not generation: an unsupported factual claim never
 * becomes an intake fact. Grounding is limited to the facts that must be literally
 * true — employer, job title, employment dates, certifications, licenses, and
 * education. Descriptive fields (responsibilities, workPerformed, leadership, …)
 * are left for the downstream narrative checks instead of being blanked here.
 */
export function groundResumePrefill(source: string, value: unknown): RecordValue {
  const root = record(value);
  const supported = (item: unknown) => extractionValueSupported(source, item) ? text(item) : "";
  const lines = (item: unknown) => text(item).split(/\n+|[•▪◦●]/).map(supported).filter(Boolean).join("\n");
  const field = record(root.fieldValue);
  const roles = (Array.isArray(root.roles) ? root.roles : []).map(record).map((role) => {
    const endDate = groundedDate(source, role.endDate, true);
    return {
      ...role,
      employer: supported(role.employer),
      jobTitle: supported(role.jobTitle),
      startDate: groundedDate(source, role.startDate, false),
      endDate,
      // A current flag requires a literal marker, not merely a model boolean.
      current: isCurrentDate(endDate),
    };
  }).filter((role) => role.employer || role.jobTitle);
  const result: RecordValue = { ...root, roles };
  if ("fieldValue" in root) {
    result.fieldValue = {
      ...field,
      ...("certifications" in field ? { certifications: (Array.isArray(field.certifications) ? field.certifications : []).map(supported).filter(Boolean) } : {}),
      ...("licenses" in field ? { licenses: lines(field.licenses) } : {}),
    };
  }
  if ("education" in root) result.education = lines(root.education);
  return result;
}
