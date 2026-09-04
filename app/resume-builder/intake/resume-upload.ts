import { EXPERIENCE_LEVELS, isTradeTrack } from "../trade-content";
import { roleHasContent, type WizardData } from "./wizard-data";

export const RESUME_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
export const RESUME_UPLOAD_MAX_TEXT_CHARS = 100_000;

export type ResumeUploadKind = "pdf" | "docx";

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

export async function extractResumeText(file: File, kind: ResumeUploadKind): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  if (kind === "docx") {
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ arrayBuffer });
    return normalizeExtractedText(result.value);
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
  return normalizeExtractedText(pages.join("\n\n"));
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

export function mergeResumePrefill(current: WizardData, prefill: unknown): WizardData {
  if (!prefill || typeof prefill !== "object") return current;
  const root = prefill as Record<string, unknown>;
  const contact = root.contact && typeof root.contact === "object"
    ? root.contact as Record<string, unknown>
    : {};
  const field = root.fieldValue && typeof root.fieldValue === "object"
    ? root.fieldValue as Record<string, unknown>
    : {};
  const importedRoles = Array.isArray(root.roles)
    ? root.roles.filter((role): role is Record<string, unknown> => Boolean(role && typeof role === "object"))
    : [];
  const roles = importedRoles.slice(0, 12).map((role) => ({
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
  const targetJobTitle = stringValue(root.targetJobTitle, 200) || roles[0]?.jobTitle || "";

  return {
    ...current,
    trade: !current.trade && isTradeTrack(stringValue(root.trade, 100))
      ? stringValue(root.trade, 100) as WizardData["trade"]
      : current.trade,
    experienceLevel: !current.experienceLevel
      && (EXPERIENCE_LEVELS as readonly string[]).includes(stringValue(root.experienceLevel, 40))
      ? stringValue(root.experienceLevel, 40) as WizardData["experienceLevel"]
      : current.experienceLevel,
    contact: {
      fullName: current.contact.fullName || stringValue(contact.fullName, 200),
      phone: current.contact.phone || stringValue(contact.phone, 100),
      cityState: current.contact.cityState || stringValue(contact.cityState, 200),
    },
    summaryNotes: current.summaryNotes || stringValue(root.summaryNotes, 3000),
    roles: current.roles.some(roleHasContent) || !roles.length ? current.roles : roles,
    fieldValue: {
      certifications: current.fieldValue.certifications.length ? current.fieldValue.certifications : stringList(field.certifications),
      licenses: current.fieldValue.licenses || stringValue(field.licenses, 1500),
      tools: current.fieldValue.tools.length ? current.fieldValue.tools : stringList(field.tools),
      equipmentSystems: current.fieldValue.equipmentSystems.length ? current.fieldValue.equipmentSystems : stringList(field.equipmentSystems),
      technicalSkills: current.fieldValue.technicalSkills.length ? current.fieldValue.technicalSkills : stringList(field.technicalSkills),
      software: current.fieldValue.software.length ? current.fieldValue.software : stringList(field.software),
      safety: current.fieldValue.safety.length ? current.fieldValue.safety : stringList(field.safety),
    },
    education: current.education || stringValue(root.education, 2500),
    additionalDetails: current.additionalDetails || stringValue(root.additionalDetails, 2500),
    targetJob: {
      ...current.targetJob,
      title: current.targetJob.title || targetJobTitle,
    },
  };
}
