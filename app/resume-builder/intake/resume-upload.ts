import { EXPERIENCE_LEVELS, isTradeTrack, type TradeTrack } from "../trade-content";
import { type WizardData } from "./wizard-data";
import { buildCanonicalSourceRecord } from "../../../worker/resume-source-canonical";

export const RESUME_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
export const RESUME_UPLOAD_MAX_TEXT_CHARS = 100_000;

export type ResumeUploadKind = "pdf" | "docx";


export type UploadedResumeIssue = {
  id: string;
  kind: "trade" | "contact" | "role" | "history";
  message: string;
  field?: "fullName" | "phone" | "cityState" | "employer" | "jobTitle" | "startDate" | "endDate";
  roleIndex?: number;
};

const TRADE_SIGNALS: Array<{ trade: TradeTrack; terms: Array<[string, number]> }> = [
  {
    trade: "HVAC & Refrigeration",
    terms: [["hvac", 5], ["refrigeration", 5], ["epa 608", 5], ["rooftop unit", 4], ["rtu", 3], ["heat pump", 3], ["refrigerant", 3], ["compressor", 2], ["air handler", 2], ["furnace", 2]],
  },
  {
    trade: "Electrical",
    terms: [["electrician", 5], ["electrical technician", 5], ["nec", 4], ["conduit", 3], ["panelboard", 3], ["switchgear", 3], ["motor control", 3], ["breaker", 2], ["wiring", 2]],
  },
  {
    trade: "Plumbing",
    terms: [["plumber", 5], ["plumbing", 5], ["dwv", 4], ["backflow", 3], ["water heater", 3], ["drain cleaning", 3], ["pex", 2], ["copper pipe", 2]],
  },
  {
    trade: "Welding & Fabrication",
    terms: [["welder", 5], ["welding", 5], ["fabrication", 4], ["mig", 3], ["tig", 3], ["smaw", 3], ["fcaw", 3], ["aws d1.1", 4], ["fit-up", 2]],
  },
  {
    trade: "Construction & Carpentry",
    terms: [["carpenter", 5], ["carpentry", 5], ["framing", 4], ["finish carpentry", 4], ["formwork", 3], ["drywall", 2], ["construction", 2], ["millwork", 3]],
  },
  {
    trade: "Facilities Maintenance",
    terms: [["maintenance supervisor", 5], ["facilities maintenance", 5], ["facility maintenance", 5], ["maintenance technician", 4], ["work order", 2], ["cmms", 3], ["make-ready", 3], ["preventive maintenance", 2], ["vendor coordination", 2]],
  },
  {
    trade: "General Labor / Trade Helper",
    terms: [["general labor", 5], ["laborer", 5], ["trade helper", 5], ["material handling", 3], ["site cleanup", 3], ["demolition", 2], ["pallet jack", 2]],
  },
];

export function inferResumeTrade(sourceText: string): TradeTrack | "" {
  const source = sourceText.toLowerCase().replace(/\s+/g, " ");
  if (!source.trim()) return "";
  const scored = TRADE_SIGNALS
    .map(({ trade, terms }) => ({
      trade,
      score: terms.reduce((total, [term, weight]) => total + (source.includes(term) ? weight : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);
  const top = scored[0];
  const next = scored[1];
  if (!top || top.score < 4) return "";
  if (next && top.score === next.score) return "";
  return top.trade;
}

function yearFromDate(value: string): number | null {
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

export function uploadedResumeIssues(data: WizardData): UploadedResumeIssue[] {
  const issues: UploadedResumeIssue[] = [];
  if (!isTradeTrack(data.trade)) {
    issues.push({ id: "trade", kind: "trade", message: "We could not confidently identify the trade direction. Choose the closest match." });
  }
  if (!data.contact.fullName.trim()) {
    issues.push({ id: "contact-fullName", kind: "contact", field: "fullName", message: "We could not find your full name." });
  }
  if (!data.contact.phone.trim()) {
    issues.push({ id: "contact-phone", kind: "contact", field: "phone", message: "We could not find a phone number employers can use." });
  }
  if (!data.contact.cityState.trim()) {
    issues.push({ id: "contact-cityState", kind: "contact", field: "cityState", message: "We could not clearly identify your city and state. Add it below so employers know your location." });
  }
  if (!data.roles.some((role) => role.employer.trim() || role.jobTitle.trim() || role.responsibilities.trim())) {
    issues.push({ id: "work-history", kind: "history", message: "We were not able to pull enough work-history detail from your upload." });
  }

  data.roles.forEach((role, roleIndex) => {
    const hasRole = Boolean(role.employer.trim() || role.jobTitle.trim() || role.responsibilities.trim());
    if (!hasRole) return;
    if (!role.employer.trim()) {
      issues.push({ id: `role-${roleIndex}-employer`, kind: "role", roleIndex, field: "employer", message: `Job ${roleIndex + 1} is missing an employer name.` });
    }
    if (!role.jobTitle.trim()) {
      issues.push({ id: `role-${roleIndex}-jobTitle`, kind: "role", roleIndex, field: "jobTitle", message: `Job ${roleIndex + 1} is missing a job title.` });
    }
    if (!role.startDate.trim()) {
      issues.push({ id: `role-${roleIndex}-startDate`, kind: "role", roleIndex, field: "startDate", message: `Job ${roleIndex + 1} is missing a start date.` });
    }
    if (!role.current && !role.endDate.trim()) {
      issues.push({ id: `role-${roleIndex}-endDate`, kind: "role", roleIndex, field: "endDate", message: `Job ${roleIndex + 1} is missing an end date.` });
    }
    const startYear = yearFromDate(role.startDate);
    const endYear = role.current ? null : yearFromDate(role.endDate);
    if (startYear && endYear && endYear < startYear) {
      issues.push({
        id: `role-${roleIndex}-date-order`,
        kind: "role",
        roleIndex,
        field: "endDate",
        message: `Job ${roleIndex + 1} has an end date before its start date. Confirm the dates.`,
      });
    }
  });

  return issues;
}

let lastExtractedResumeText = "";

export function resumeUploadKind(file: Pick<File, "name" | "type">): ResumeUploadKind | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") && (!file.type || file.type === "application/pdf")) return "pdf";
  if (
    name.endsWith(".docx")
    && (!file.type || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
  ) return "docx";
  return null;
}

function normalizeExtractedText(value: string): string {
  return value
    .split(String.fromCharCode(0)).join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, RESUME_UPLOAD_MAX_TEXT_CHARS);
}

/** Older DOCX imports lost soft line breaks between an employer and location. */
function restoreDocxHeaderBreaks(value: string): string {
  return value
    .replace(/([a-z])([A-Z][a-z]+(?: [A-Za-z]+)?,\s*[A-Z]{2}\s*\|)/g, "$1\n$2")
    .replace(/([a-z])((?:Residential|Commercial) Service\s*\|)/g, "$1\n$2");
}

export function recoverImportedResume(data: WizardData): WizardData {
  if (data.sourceProvenance !== "upload" || !data.sourceResumeText.trim()) return data;
  const needsLocation = !data.contact.cityState.trim();
  const needsJobs = !data.roles.some((role) => role.employer.trim() || role.jobTitle.trim() || role.responsibilities.trim());
  if (!needsLocation && !needsJobs) return data;
  const canonical = buildCanonicalSourceRecord(restoreDocxHeaderBreaks(data.sourceResumeText)).prefill;
  const contact = canonical.contact as { cityState?: string };
  const roles = canonical.roles as WizardData["roles"];
  return {
    ...data,
    contact: { ...data.contact, cityState: data.contact.cityState || contact.cityState || "" },
    roles: needsJobs && roles.length ? roles : data.roles,
  };
}

function rememberExtractedText(value: string): string {
  const normalized = normalizeExtractedText(value);
  lastExtractedResumeText = normalized;
  return normalized;
}

export async function extractResumeText(file: File, kind: ResumeUploadKind): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  if (kind === "docx") {
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const document = new DOMParser().parseFromString(result.value, "text/html");
    const paragraphs = Array.from(document.body.querySelectorAll("p"));
    const extracted = paragraphs.map((paragraph) => {
      paragraph.querySelectorAll("br").forEach((breakElement) => breakElement.replaceWith("\n"));
      return paragraph.textContent?.trim() ?? "";
    }).filter(Boolean).join("\n\n");
    if (extracted) return rememberExtractedText(extracted);
    const fallback = await mammoth.extractRawText({ arrayBuffer });
    return rememberExtractedText(fallback.value);
  }

  const { default: pdfWorkerUrl } = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const document = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" "));
  }
  await document.destroy();
  return rememberExtractedText(pages.join("\n\n"));
}

function stringValue(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function stringList(value: unknown, limit = 40): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 160))
    .filter(Boolean)))
    .slice(0, limit);
}

export function extractResumeEmail(text: string): string {
  return text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0]?.trim() ?? "";
}

export function extractResumePhone(text: string): string {
  const match = text.match(/(?:\+?1[\s.()-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/);
  return match?.[0]?.replace(/\s+/g, " ").trim() ?? "";
}

/**
 * Merge an uploaded resume as the source of truth. Existing wizard values are
 * used only when the uploaded resume did not provide that fact. The normalized
 * source text is retained with the intake so downstream generation always has
 * the original uploaded facts available even if the extraction model produces
 * a thinner structured prefill.
 */
export function mergeResumePrefill(current: WizardData, prefill: unknown, sourceText = ""): WizardData {
  if (!prefill || typeof prefill !== "object") return current;
  const root = prefill as Record<string, unknown>;
  const effectiveSourceText = stringValue(
    sourceText || root.sourceResumeText || lastExtractedResumeText,
    RESUME_UPLOAD_MAX_TEXT_CHARS,
  );
  const contact = root.contact && typeof root.contact === "object"
    ? root.contact as Record<string, unknown>
    : {};
  const field = root.fieldValue && typeof root.fieldValue === "object"
    ? root.fieldValue as Record<string, unknown>
    : {};
  const importedRoles = Array.isArray(root.roles)
    ? root.roles.filter((role): role is Record<string, unknown> => Boolean(role && typeof role === "object"))
    : [];
  const recovered = buildCanonicalSourceRecord(restoreDocxHeaderBreaks(effectiveSourceText)).prefill;
  const recoveredContact = recovered.contact as Record<string, unknown>;
  const sourceRoles = importedRoles.length >= (recovered.roles as Record<string, unknown>[]).length
    && importedRoles.some((role) => stringValue(role.employer, 200) || stringValue(role.jobTitle, 200))
    ? importedRoles
    : recovered.roles as Record<string, unknown>[];
  const roles = sourceRoles.slice(0, 12).map((role) => ({
    employer: stringValue(role.employer, 200),
    jobTitle: stringValue(role.jobTitle, 200),
    location: stringValue(role.location, 200),
    employmentType: stringValue(role.employmentType, 100),
    startDate: stringValue(role.startDate, 40),
    endDate: stringValue(role.endDate, 40),
    current: role.current === true,
    responsibilities: stringValue(role.responsibilities, 4000),
    equipment: stringValue(role.equipment, 2000),
    systems: stringValue(role.systems, 2000),
    workPerformed: stringValue(role.workPerformed, 2000),
    leadership: stringValue(role.leadership, 2000),
    workOrders: stringValue(role.workOrders, 2000),
    measurable: stringValue(role.measurable, 2000),
  }));
  const importedCertifications = stringList(field.certifications);
  const importedTools = stringList(field.tools);
  const importedEquipmentSystems = stringList(field.equipmentSystems);
  const importedTechnicalSkills = stringList(field.technicalSkills);
  const importedSoftware = stringList(field.software);
  const importedSafety = stringList(field.safety);
  const importedEmail = stringValue(contact.email, 254) || extractResumeEmail(effectiveSourceText);
  const importedPhone = stringValue(contact.phone, 100) || extractResumePhone(effectiveSourceText);
  const targetJobTitle = stringValue(root.targetJobTitle, 200) || roles[0]?.jobTitle || current.targetJob.title;
  const importedTrade = stringValue(root.trade, 100);
  const inferredTrade = inferResumeTrade(effectiveSourceText);
  const importedExperience = stringValue(root.experienceLevel, 40);

  return {
    ...current,
    sourceProvenance: "upload",
    sourceResumeText: effectiveSourceText || current.sourceResumeText,
    trade: isTradeTrack(importedTrade) ? importedTrade : inferredTrade || current.trade,
    experienceLevel: (EXPERIENCE_LEVELS as readonly string[]).includes(importedExperience)
      ? importedExperience as WizardData["experienceLevel"]
      : current.experienceLevel,
    contact: {
      fullName: stringValue(contact.fullName, 200) || current.contact.fullName,
      email: importedEmail || current.contact.email,
      phone: importedPhone || current.contact.phone,
      cityState: stringValue(contact.cityState, 200) || stringValue(recoveredContact.cityState, 200) || current.contact.cityState,
    },
    summaryNotes: stringValue(root.summaryNotes, 3000) || current.summaryNotes,
    roles: roles.length ? roles : current.roles,
    fieldValue: {
      certifications: importedCertifications.length ? importedCertifications : current.fieldValue.certifications,
      licenses: stringValue(field.licenses, 1500) || current.fieldValue.licenses,
      tools: importedTools.length ? importedTools : current.fieldValue.tools,
      equipmentSystems: importedEquipmentSystems.length ? importedEquipmentSystems : current.fieldValue.equipmentSystems,
      technicalSkills: importedTechnicalSkills.length ? importedTechnicalSkills : current.fieldValue.technicalSkills,
      software: importedSoftware.length ? importedSoftware : current.fieldValue.software,
      safety: importedSafety.length ? importedSafety : current.fieldValue.safety,
    },
    education: stringValue(root.education, 2500) || current.education,
    additionalDetails: stringValue(root.additionalDetails, 2500) || current.additionalDetails,
    targetJob: {
      ...current.targetJob,
      title: targetJobTitle,
    },
  };
}
