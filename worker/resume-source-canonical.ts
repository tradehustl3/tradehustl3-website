import {
  assessResumeExtractionCoverage,
  repairResumeExtractionFromSource,
  type ExtractionCoverageResult,
} from "./resume-extraction-coverage";

type RecordValue = Record<string, unknown>;

export type SourceEvidence = {
  value: string;
  sourceText: string;
  lineStart: number | null;
  lineEnd: number | null;
  immutable: true;
};

export type CanonicalSourceRole = {
  id: string;
  employer: SourceEvidence;
  jobTitle: SourceEvidence;
  location: SourceEvidence | null;
  startDate: SourceEvidence;
  endDate: SourceEvidence;
  current: boolean;
  responsibilities: SourceEvidence[];
};

export type CanonicalSourceRecord = {
  parserVersion: "source-first-v1";
  contact: {
    fullName: SourceEvidence | null;
    email: SourceEvidence | null;
    phone: SourceEvidence | null;
    cityState: SourceEvidence | null;
  };
  roles: CanonicalSourceRole[];
  education: SourceEvidence[];
  credentials: SourceEvidence[];
  immutableFields: readonly [
    "contact.fullName",
    "contact.email",
    "contact.phone",
    "contact.cityState",
    "roles.length",
    "roles.order",
    "roles.employer",
    "roles.jobTitle",
    "roles.location",
    "roles.startDate",
    "roles.endDate",
    "roles.current",
    "education",
    "credentials",
  ];
  prefill: RecordValue;
  coverage: ExtractionCoverageResult;
};

function record(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue
    : {};
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
  return value
    .toLowerCase()
    .replace(/[\u2012-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceLines(source: string): string[] {
  return source.replace(/\r\n?/g, "\n").split("\n");
}

function evidence(source: string, value: unknown): SourceEvidence | null {
  const resolved = text(value);
  if (!resolved) return null;
  const lines = sourceLines(source);
  const needle = normalize(resolved);
  let lineStart: number | null = null;
  let lineEnd: number | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    if (normalize(lines[index]).includes(needle)) {
      lineStart = index + 1;
      lineEnd = index + 1;
      break;
    }
  }

  return {
    value: resolved,
    sourceText: resolved,
    lineStart,
    lineEnd,
    immutable: true,
  };
}

function splitNarrative(value: unknown): string[] {
  return text(value)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstEmail(source: string): string {
  return source.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0]?.trim() ?? "";
}

function firstPhone(source: string): string {
  return source.match(/(?:\+?1[\s.()-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/)?.[0]
    ?.replace(/\s+/g, " ")
    .trim() ?? "";
}

function firstCityState(source: string): string {
  for (const rawLine of sourceLines(source).slice(0, 12)) {
    const line = rawLine.trim();
    const match = line.match(/\b([A-Za-z][A-Za-z .'-]{1,60},\s*[A-Z]{2})\b/);
    if (match) return match[1].trim();
  }
  return "";
}

function firstFullName(source: string): string {
  const heading = /^(?:resume|curriculum vitae|professional summary|summary|profile|objective|contact|experience|professional experience|work experience|education|skills|certifications?)$/i;
  for (const rawLine of sourceLines(source).slice(0, 10)) {
    const firstSegment = rawLine.split(/\s*(?:\||•|▪|◦|●)\s*/)[0]?.trim() ?? "";
    if (!firstSegment || firstSegment.length > 100 || heading.test(firstSegment)) continue;
    if (/@|https?:\/\/|www\.|\d{3}[\s.()-]*\d{3}/i.test(firstSegment)) continue;
    if (/\b(?:technician|supervisor|manager|mechanic|engineer|maintenance|hvac|refrigeration|electrician|plumber|welder|carpenter)\b/i.test(firstSegment)) continue;
    if (/\b[A-Za-z .'-]+,\s*[A-Z]{2}\b/.test(firstSegment)) continue;
    const words = firstSegment.match(/[A-Za-z][A-Za-z'.-]*/g) ?? [];
    if (words.length >= 2 && words.length <= 5) return firstSegment;
  }
  return "";
}

function sourceBacked(source: string, value: string): boolean {
  const candidate = normalize(value);
  return Boolean(candidate && normalize(source).includes(candidate));
}

function sourceBackedList(source: string, value: unknown): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of list(value)) {
    const key = normalize(item);
    if (!key || seen.has(key) || !sourceBacked(source, item)) continue;
    seen.add(key);
    result.push(item.trim());
  }
  return result;
}

function roleIdentityKey(role: RecordValue): string {
  return [
    text(role.employer),
    text(role.jobTitle),
    text(role.startDate),
    text(role.endDate),
  ].map(normalize).join("|");
}

function matchingAiRole(aiRoles: RecordValue[], canonicalRole: CanonicalSourceRole): RecordValue {
  const key = [
    canonicalRole.employer.value,
    canonicalRole.jobTitle.value,
    canonicalRole.startDate.value,
    canonicalRole.endDate.value,
  ].map(normalize).join("|");

  const exact = aiRoles.find((role) => roleIdentityKey(role) === key);
  if (exact) return exact;

  const employerTitle = aiRoles.find((role) =>
    normalize(text(role.employer)) === normalize(canonicalRole.employer.value)
    && normalize(text(role.jobTitle)) === normalize(canonicalRole.jobTitle.value));
  return employerTitle ?? {};
}

function canonicalRoleToPrefill(role: CanonicalSourceRole): RecordValue {
  return {
    employer: role.employer.value,
    jobTitle: role.jobTitle.value,
    location: role.location?.value ?? "",
    employmentType: "",
    startDate: role.startDate.value,
    endDate: role.endDate.value,
    current: role.current,
    responsibilities: role.responsibilities.map((item) => item.value).join("\n"),
    equipment: "",
    systems: "",
    workPerformed: "",
    leadership: "",
    workOrders: "",
    measurable: "",
  };
}

/**
 * Builds the authoritative structure from the source document before AI is
 * allowed to influence the import. The existing deterministic parser is used
 * with an empty structured seed so no model value can participate in identity.
 */
export function buildCanonicalSourceRecord(sourceResumeText: string): CanonicalSourceRecord {
  const seed = {
    roles: [],
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
  };

  const parsed = repairResumeExtractionFromSource(sourceResumeText, seed).structured;
  const parsedRoles = Array.isArray(parsed.roles)
    ? parsed.roles.filter((item): item is RecordValue => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];

  const roles: CanonicalSourceRole[] = parsedRoles.flatMap((role, index) => {
    const employer = evidence(sourceResumeText, role.employer);
    const jobTitle = evidence(sourceResumeText, role.jobTitle);
    const startDate = evidence(sourceResumeText, role.startDate);
    const endDate = evidence(sourceResumeText, role.endDate);
    if (!employer || !jobTitle || !startDate || !endDate) return [];
    return [{
      id: `source-role-${index + 1}`,
      employer,
      jobTitle,
      location: evidence(sourceResumeText, role.location),
      startDate,
      endDate,
      current: role.current === true,
      responsibilities: splitNarrative(role.responsibilities)
        .map((item) => evidence(sourceResumeText, item))
        .filter((item): item is SourceEvidence => Boolean(item)),
    }];
  });

  const field = record(parsed.fieldValue);
  const credentials = list(field.certifications)
    .map((item) => evidence(sourceResumeText, item))
    .filter((item): item is SourceEvidence => Boolean(item));
  const license = evidence(sourceResumeText, field.licenses);
  if (license && !credentials.some((item) => normalize(item.value) === normalize(license.value))) {
    credentials.push(license);
  }

  const education = splitNarrative(parsed.education)
    .map((item) => evidence(sourceResumeText, item))
    .filter((item): item is SourceEvidence => Boolean(item));

  const fullName = evidence(sourceResumeText, firstFullName(sourceResumeText));
  const email = evidence(sourceResumeText, firstEmail(sourceResumeText));
  const phone = evidence(sourceResumeText, firstPhone(sourceResumeText));
  const cityState = evidence(sourceResumeText, firstCityState(sourceResumeText));

  const prefill: RecordValue = {
    trade: "",
    experienceLevel: "",
    targetJobTitle: "",
    contact: {
      fullName: fullName?.value ?? "",
      email: email?.value ?? "",
      phone: phone?.value ?? "",
      cityState: cityState?.value ?? "",
    },
    summaryNotes: "",
    roles: roles.map(canonicalRoleToPrefill),
    fieldValue: {
      certifications: credentials.map((item) => item.value),
      licenses: "",
      tools: [],
      equipmentSystems: [],
      technicalSkills: [],
      software: [],
      safety: [],
    },
    education: education.map((item) => item.value).join("\n"),
    additionalDetails: "",
  };

  return {
    parserVersion: "source-first-v1",
    contact: { fullName, email, phone, cityState },
    roles,
    education,
    credentials,
    immutableFields: [
      "contact.fullName",
      "contact.email",
      "contact.phone",
      "contact.cityState",
      "roles.length",
      "roles.order",
      "roles.employer",
      "roles.jobTitle",
      "roles.location",
      "roles.startDate",
      "roles.endDate",
      "roles.current",
      "education",
      "credentials",
    ],
    prefill,
    coverage: assessResumeExtractionCoverage(sourceResumeText, prefill),
  };
}

/**
 * AI may enrich classifications and optional descriptive fields, but source
 * identity is always reconstructed from the canonical record. AI cannot add,
 * delete, merge, reorder, or rename roles, education, credentials, or contact.
 */
export function mergeCanonicalWithAiEnrichment(
  sourceResumeText: string,
  canonical: CanonicalSourceRecord,
  aiPrefill: unknown,
): RecordValue {
  const ai = record(aiPrefill);
  const aiContact = record(ai.contact);
  const aiField = record(ai.fieldValue);
  const aiRoles = Array.isArray(ai.roles)
    ? ai.roles.filter((item): item is RecordValue => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];

  const roles = canonical.roles.map((sourceRole) => {
    const aiRole = matchingAiRole(aiRoles, sourceRole);
    const canonicalRole = canonicalRoleToPrefill(sourceRole);
    return {
      ...canonicalRole,
      employmentType: sourceBacked(sourceResumeText, text(aiRole.employmentType)) ? text(aiRole.employmentType) : "",
      equipment: sourceBacked(sourceResumeText, text(aiRole.equipment)) ? text(aiRole.equipment) : "",
      systems: sourceBacked(sourceResumeText, text(aiRole.systems)) ? text(aiRole.systems) : "",
      workPerformed: sourceBacked(sourceResumeText, text(aiRole.workPerformed)) ? text(aiRole.workPerformed) : "",
      leadership: sourceBacked(sourceResumeText, text(aiRole.leadership)) ? text(aiRole.leadership) : "",
      workOrders: sourceBacked(sourceResumeText, text(aiRole.workOrders)) ? text(aiRole.workOrders) : "",
      measurable: sourceBacked(sourceResumeText, text(aiRole.measurable)) ? text(aiRole.measurable) : "",
    };
  });

  const contact = {
    ...aiContact,
    fullName: canonical.contact.fullName?.value ?? text(aiContact.fullName),
    email: canonical.contact.email?.value ?? text(aiContact.email),
    phone: canonical.contact.phone?.value ?? text(aiContact.phone),
    cityState: canonical.contact.cityState?.value ?? text(aiContact.cityState),
  };

  return {
    ...ai,
    contact,
    roles,
    fieldValue: {
      ...aiField,
      certifications: canonical.credentials.map((item) => item.value),
      licenses: "",
      tools: sourceBackedList(sourceResumeText, aiField.tools),
      equipmentSystems: sourceBackedList(sourceResumeText, aiField.equipmentSystems),
      technicalSkills: sourceBackedList(sourceResumeText, aiField.technicalSkills),
      software: sourceBackedList(sourceResumeText, aiField.software),
      safety: sourceBackedList(sourceResumeText, aiField.safety),
    },
    education: canonical.education.map((item) => item.value).join("\n"),
  };
}

export function validateCanonicalImmutability(
  canonical: CanonicalSourceRecord,
  merged: unknown,
): { valid: boolean; issues: string[] } {
  const root = record(merged);
  const roles = Array.isArray(root.roles)
    ? root.roles.filter((item): item is RecordValue => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
  const issues: string[] = [];

  if (roles.length !== canonical.roles.length) issues.push("roles.length");

  canonical.roles.forEach((sourceRole, index) => {
    const role = roles[index] ?? {};
    if (text(role.employer) !== sourceRole.employer.value) issues.push(`roles.${index}.employer`);
    if (text(role.jobTitle) !== sourceRole.jobTitle.value) issues.push(`roles.${index}.jobTitle`);
    if (text(role.location) !== (sourceRole.location?.value ?? "")) issues.push(`roles.${index}.location`);
    if (text(role.startDate) !== sourceRole.startDate.value) issues.push(`roles.${index}.startDate`);
    if (text(role.endDate) !== sourceRole.endDate.value) issues.push(`roles.${index}.endDate`);
    if ((role.current === true) !== sourceRole.current) issues.push(`roles.${index}.current`);
  });

  const field = record(root.fieldValue);
  const credentials = list(field.certifications);
  const expectedCredentials = canonical.credentials.map((item) => item.value);
  if (JSON.stringify(credentials) !== JSON.stringify(expectedCredentials)) issues.push("credentials");
  if (text(root.education) !== canonical.education.map((item) => item.value).join("\n")) issues.push("education");

  const contact = record(root.contact);
  if (canonical.contact.fullName && text(contact.fullName) !== canonical.contact.fullName.value) issues.push("contact.fullName");
  if (canonical.contact.email && text(contact.email) !== canonical.contact.email.value) issues.push("contact.email");
  if (canonical.contact.phone && text(contact.phone) !== canonical.contact.phone.value) issues.push("contact.phone");
  if (canonical.contact.cityState && text(contact.cityState) !== canonical.contact.cityState.value) issues.push("contact.cityState");

  return { valid: issues.length === 0, issues };
}
