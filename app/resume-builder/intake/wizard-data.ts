/**
 * Wizard state <-> intake JSON mapping.
 *
 * The intake JSON persisted through `POST/PUT /api/resume-builder/resumes` keeps
 * every legacy key (`career.*`, `experience[].responsibilitiesAndWins`,
 * `experience[].dates`, `education`, `additionalDetails`) populated so the
 * existing generation prompt, numeric guard, and review screen keep working with
 * no backend change. New structured fields are additive.
 */

import type { ExperienceLevel, TradeTrack } from "../trade-content";

export type RoleEntry = {
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

export type WizardData = {
  trade: TradeTrack | "";
  experienceLevel: ExperienceLevel | "";
  contact: { fullName: string; email?: string; phone: string; cityState: string };
  summaryNotes: string;
  roles: RoleEntry[];
  fieldValue: {
    certifications: string[];
    licenses: string;
    tools: string[];
    equipmentSystems: string[];
    technicalSkills: string[];
    software: string[];
    safety: string[];
  };
  education: string;
  additionalDetails: string;
  targetJob: { title: string; company: string; location: string; posting: string };
  lastStep: number;
};

export function emptyRole(): RoleEntry {
  return {
    employer: "",
    jobTitle: "",
    location: "",
    employmentType: "",
    startDate: "",
    endDate: "",
    current: false,
    responsibilities: "",
    equipment: "",
    systems: "",
    workPerformed: "",
    leadership: "",
    workOrders: "",
    measurable: "",
  };
}

export function emptyWizardData(): WizardData {
  return {
    trade: "",
    experienceLevel: "",
    contact: { fullName: "", email: "", phone: "", cityState: "" },
    summaryNotes: "",
    roles: [emptyRole()],
    fieldValue: {
      certifications: [],
      licenses: "",
      tools: [],
      equipmentSystems: [],
      technicalSkills: [],
      software: [],
      safety: [],
    },
    education: "",
    additionalDetails: "",
    targetJob: { title: "", company: "", location: "", posting: "" },
    lastStep: 0,
  };
}

function joinLines(parts: Array<string | undefined>): string {
  return parts.map((part) => (part ?? "").trim()).filter(Boolean).join("\n");
}

function labelledBlock(label: string, value: string): string {
  const trimmed = value.trim();
  return trimmed ? `${label}: ${trimmed}` : "";
}

export function roleDates(role: RoleEntry): string {
  const end = role.current ? "Present" : role.endDate.trim();
  return [role.startDate.trim(), end].filter(Boolean).join(" – ");
}

/** A single role's structured detail flattened for the legacy `responsibilitiesAndWins` field. */
export function roleNarrative(role: RoleEntry): string {
  return joinLines([
    role.responsibilities,
    labelledBlock("Equipment", role.equipment),
    labelledBlock("Systems", role.systems),
    labelledBlock("Installs / repairs / maintenance", role.workPerformed),
    labelledBlock("Leadership", role.leadership),
    labelledBlock("Work orders / CMMS", role.workOrders),
    labelledBlock("Measurable results", role.measurable),
  ]);
}

function chips(values: string[]): string {
  return values.map((value) => value.trim()).filter(Boolean).join(", ");
}

export function roleHasContent(role: RoleEntry): boolean {
  return Boolean(
    role.employer || role.jobTitle || role.location || role.employmentType
    || role.startDate || role.endDate || role.responsibilities || role.equipment
    || role.systems || role.workPerformed || role.leadership || role.workOrders || role.measurable,
  );
}

export function fieldValueHasContent(fieldValue: WizardData["fieldValue"]): boolean {
  return Boolean(
    fieldValue.certifications.length || fieldValue.licenses.trim() || fieldValue.tools.length
    || fieldValue.equipmentSystems.length || fieldValue.technicalSkills.length
    || fieldValue.software.length || fieldValue.safety.length,
  );
}

/** Build the intake JSON payload (legacy-compatible + structured). */
export function toIntake(data: WizardData, accountEmail: string): Record<string, unknown> {
  const skillsAndTools = joinLines([
    labelledBlock("Tools", chips(data.fieldValue.tools)),
    labelledBlock("Equipment & systems", chips(data.fieldValue.equipmentSystems)),
    labelledBlock("Technical skills", chips(data.fieldValue.technicalSkills)),
    labelledBlock("Software / CMMS", chips(data.fieldValue.software)),
  ]);
  const licensesAndCertifications = joinLines([
    chips(data.fieldValue.certifications),
    data.fieldValue.licenses,
  ]);
  const safetyTraining = chips(data.fieldValue.safety);

  const experience = data.roles.filter(roleHasContent).map((role) => ({
    employer: role.employer.trim(),
    jobTitle: role.jobTitle.trim(),
    location: role.location.trim(),
    employmentType: role.employmentType.trim(),
    startDate: role.startDate.trim(),
    endDate: role.current ? "Present" : role.endDate.trim(),
    current: role.current,
    dates: roleDates(role),
    responsibilities: role.responsibilities.trim(),
    equipment: role.equipment.trim(),
    systems: role.systems.trim(),
    workPerformed: role.workPerformed.trim(),
    leadership: role.leadership.trim(),
    workOrders: role.workOrders.trim(),
    measurable: role.measurable.trim(),
    responsibilitiesAndWins: roleNarrative(role),
  }));

  return {
    contact: {
      fullName: data.contact.fullName.trim(),
      email: data.contact.email?.trim() || accountEmail,
      phone: data.contact.phone.trim(),
      cityState: data.contact.cityState.trim(),
    },
    career: {
      yearsExperience: data.experienceLevel,
      summaryNotes: data.summaryNotes.trim(),
      skillsAndTools,
      licensesAndCertifications,
      safetyTraining,
    },
    fieldValue: {
      certifications: data.fieldValue.certifications,
      licenses: data.fieldValue.licenses.trim(),
      tools: data.fieldValue.tools,
      equipmentSystems: data.fieldValue.equipmentSystems,
      technicalSkills: data.fieldValue.technicalSkills,
      software: data.fieldValue.software,
      safety: data.fieldValue.safety,
    },
    experience,
    education: data.education.trim(),
    additionalDetails: data.additionalDetails.trim(),
    targetJob: {
      title: data.targetJob.title.trim(),
      company: data.targetJob.company.trim(),
      location: data.targetJob.location.trim(),
    },
    meta: { wizardVersion: 2, lastStep: data.lastStep },
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Hydrate wizard state from a persisted resume, tolerating the legacy shape. */
export function fromIntake(
  intake: unknown,
  fallback: { trade: string; title: string; posting: string; fullName: string | null; email?: string | null },
): WizardData {
  const data = emptyWizardData();
  const root = (intake && typeof intake === "object" ? intake : {}) as Record<string, unknown>;
  const contact = (root.contact ?? {}) as Record<string, unknown>;
  const career = (root.career ?? {}) as Record<string, unknown>;
  const fieldValue = (root.fieldValue ?? {}) as Record<string, unknown>;
  const targetJob = (root.targetJob ?? {}) as Record<string, unknown>;
  const meta = (root.meta ?? {}) as Record<string, unknown>;

  data.trade = (fallback.trade || "") as WizardData["trade"];
  data.experienceLevel = asString(career.yearsExperience) as WizardData["experienceLevel"];
  data.contact = {
    fullName: asString(contact.fullName) || fallback.fullName || "",
    email: asString(contact.email) || fallback.email || "",
    phone: asString(contact.phone),
    cityState: asString(contact.cityState),
  };
  data.summaryNotes = asString(career.summaryNotes);
  data.education = asString(root.education);
  data.additionalDetails = asString(root.additionalDetails);
  data.targetJob = {
    title: asString(targetJob.title) || fallback.title || "",
    company: asString(targetJob.company),
    location: asString(targetJob.location),
    posting: fallback.posting || "",
  };

  const structuredFieldValue = Object.keys(fieldValue).length > 0;
  if (structuredFieldValue) {
    data.fieldValue = {
      certifications: asStringArray(fieldValue.certifications),
      licenses: asString(fieldValue.licenses),
      tools: asStringArray(fieldValue.tools),
      equipmentSystems: asStringArray(fieldValue.equipmentSystems),
      technicalSkills: asStringArray(fieldValue.technicalSkills),
      software: asStringArray(fieldValue.software),
      safety: asStringArray(fieldValue.safety),
    };
  } else {
    // Legacy resume: keep the free-text values visible as custom entries.
    data.fieldValue.licenses = asString(career.licensesAndCertifications);
    data.fieldValue.safety = asString(career.safetyTraining)
      ? asString(career.safetyTraining).split(/[,\n]/).map((item) => item.trim()).filter(Boolean)
      : [];
    if (asString(career.skillsAndTools)) {
      data.fieldValue.technicalSkills = asString(career.skillsAndTools)
        .split(/[,\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 40);
    }
  }

  const roles = Array.isArray(root.experience) ? (root.experience as Record<string, unknown>[]) : [];
  data.roles = roles.length
    ? roles.map((role) => {
        const next = emptyRole();
        next.employer = asString(role.employer);
        next.jobTitle = asString(role.jobTitle);
        next.location = asString(role.location);
        next.employmentType = asString(role.employmentType);
        let startDate = asString(role.startDate);
        let endDate = asString(role.endDate);
        // Legacy resumes stored one free-text `dates` string ("2023 – Present").
        if (!startDate && !endDate && asString(role.dates)) {
          const [start, ...rest] = asString(role.dates).split(/\s*[–—-]\s*|\s+to\s+/i);
          startDate = (start ?? "").trim();
          endDate = rest.join(" ").trim();
        }
        next.startDate = startDate;
        next.current = /^(present|current|now)$/i.test(endDate.trim()) || role.current === true;
        next.endDate = next.current ? "" : endDate;
        next.responsibilities = asString(role.responsibilities) || asString(role.responsibilitiesAndWins);
        next.equipment = asString(role.equipment);
        next.systems = asString(role.systems);
        next.workPerformed = asString(role.workPerformed);
        next.leadership = asString(role.leadership);
        next.workOrders = asString(role.workOrders);
        next.measurable = asString(role.measurable);
        return next;
      })
    : [emptyRole()];

  const lastStep = Number(meta.lastStep);
  data.lastStep = Number.isInteger(lastStep) && lastStep >= 0 && lastStep <= 6 ? lastStep : 0;
  return data;
}
