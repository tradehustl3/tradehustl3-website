import { extractContactLocation, locationInLine } from "./resume-location";
import { groundResumePrefill } from "./resume-extraction-grounding";
import { isResumeIdentityTerm } from "./resume-quality";
import { isCurrentDate, parseResumeDate } from "./resume-dates";
import {
  assessResumeExtractionCoverage,
  repairResumeExtractionFromSource,
  type ExtractionCoverageResult,
} from "./resume-extraction-coverage";
import {
  classifyResumeSections,
  dedupeCredentials,
  dedupeSkillTerms,
  isCredentialEntity,
  isRoleIdentityLike,
  normalizeResumeValue,
  semanticDedupe,
  type ResumeSourceSection,
} from "./resume-section-classifier";

type RecordValue = Record<string, unknown>;

export type SourceEvidence = {
  value: string;
  sourceText: string;
  lineStart: number | null;
  lineEnd: number | null;
  section: ResumeSourceSection;
  immutable: boolean;
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

export type CanonicalSourceSkill = {
  id: string;
  canonicalName: string;
  evidence: SourceEvidence[];
};

export type CanonicalSourceRecord = {
  parserVersion: "source-first-v2";
  contact: {
    fullName: SourceEvidence | null;
    email: SourceEvidence | null;
    phone: SourceEvidence | null;
    cityState: SourceEvidence | null;
  };
  roles: CanonicalSourceRole[];
  education: SourceEvidence[];
  credentials: SourceEvidence[];
  skills: CanonicalSourceSkill[];
  summaryFacts: SourceEvidence[];
  sourceSections: Record<ResumeSourceSection, SourceEvidence[]>;
  unclassified: SourceEvidence[];
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
  return normalizeResumeValue(value);
}

function sourceLines(source: string): string[] {
  return source.replace(/\r\n?/g, "\n").split("\n");
}

function sectionForLine(source: string, lineNumber: number | null): ResumeSourceSection {
  if (!lineNumber) return "unclassified";
  const classified = classifyResumeSections(source).lines.find((item) => item.lineNumber === lineNumber);
  return classified?.section ?? "unclassified";
}

function evidence(
  source: string,
  value: unknown,
  options: { immutable?: boolean; section?: ResumeSourceSection } = {},
): SourceEvidence | null {
  const resolved = text(value);
  if (!resolved) return null;
  const lines = sourceLines(source);
  const needle = normalize(resolved);
  let lineStart: number | null = null;
  let lineEnd: number | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const haystack = normalize(lines[index]);
    if (haystack === needle || haystack.includes(needle)) {
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
    section: options.section ?? sectionForLine(source, lineStart),
    immutable: options.immutable ?? true,
  };
}

function splitNarrative(value: unknown): string[] {
  return text(value)
    .split(/\n+|[•▪◦●]/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
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

const firstCityState = extractContactLocation;

function firstFullName(source: string): string {
  const heading = /^(?:resume|curriculum vitae|professional summary|summary|profile|objective|contact|experience|professional experience|work experience|education|skills|certifications?)$/i;
  const lines = sourceLines(source);
  const contactLines = lines.filter((_line, index) => lines.slice(Math.max(0, index - 2), index + 3).some((neighbor) => /@|(?:\d{3}[\s().-]*){2}\d{4}/.test(neighbor)));
  for (const rawLine of [...lines.slice(0, 10), ...contactLines]) {
    const firstSegment = rawLine.split(/\s*(?:\||•|▪|◦|●)\s*/)[0]?.trim() ?? "";
    if (!firstSegment || firstSegment.length > 100 || heading.test(firstSegment)) continue;
    if (/@|https?:\/\/|www\.|\d{3}[\s.()-]*\d{3}/i.test(firstSegment)) continue;
    if (/\b(?:technician|supervisor|manager|mechanic|engineer|maintenance|hvac|refrigeration|electrician|plumber|welder|carpenter)\b/i.test(firstSegment)) continue;
    if (locationInLine(firstSegment)) continue;
    const words = firstSegment.match(/[A-Za-z][A-Za-z'.-]*/g) ?? [];
    if (words.length >= 2 && words.length <= 5) return firstSegment;
  }
  return "";
}

function sourceBacked(source: string, value: string): boolean {
  const candidate = normalize(value);
  return Boolean(candidate && normalize(source).includes(candidate));
}

function significantWords(value: string): string[] {
  const ignored = new Set([
    "and", "the", "for", "with", "from", "into", "that", "this", "work", "worked", "performed",
    "perform", "responsible", "using", "used", "support", "supported", "professional", "experienced",
    "skilled", "experience", "proficient", "maintain", "maintained", "manage", "managed", "complete",
    "completed", "ensure", "ensured", "provide", "provided", "execute", "executed", "assist", "assisted",
    "coordinate", "coordinated", "including", "across", "through", "while", "daily",
  ]);
  return Array.from(new Set(normalize(value).split(" ")
    .filter((word) => word.length > 3 && !ignored.has(word))));
}

function numericClaims(value: string): string[] {
  return Array.from(new Set(value.match(/\b\d[\d,]*(?:\.\d+)?(?:\s*(?:%|percent|years?|tons?|units?|properties|work orders?))?\b/gi) ?? []))
    .map(normalize);
}

function rewriteSupported(candidate: string, sourceFacts: string[]): boolean {
  const cleaned = text(candidate);
  if (!cleaned || !sourceFacts.length) return false;
  const sourceCombined = sourceFacts.join(" ");
  if (numericClaims(cleaned).some((claim) => !normalize(sourceCombined).includes(claim))) return false;
  const words = significantWords(cleaned);
  if (!words.length) return true;
  const sourceWords = new Set(sourceFacts.flatMap(significantWords));
  const shared = words.filter((word) => sourceWords.has(word)).length;
  return shared / words.length >= 0.55;
}

function supportedRewrittenNarrative(
  candidate: unknown,
  sourceFacts: SourceEvidence[],
  identities: string[],
): string[] {
  const sourceValues = sourceFacts.map((item) => item.value);
  return semanticDedupe(splitNarrative(candidate).filter((item) => {
    if (isRoleIdentityLike(item, identities)) return false;
    return rewriteSupported(item, sourceValues);
  }), 0.78).slice(0, 8);
}

function sourceBackedList(source: string, value: unknown): string[] {
  return dedupeSkillTerms(list(value).filter((item) => sourceBacked(source, item)));
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

function classifiedEvidence(source: string, section: ResumeSourceSection): SourceEvidence[] {
  const classification = classifyResumeSections(source);
  return classification.sections[section]
    .filter((item) => item.kind !== "heading")
    .map((item) => ({
      value: item.value,
      sourceText: item.value,
      lineStart: item.lineNumber,
      lineEnd: item.lineNumber,
      section,
      immutable: false,
    }));
}

function canonicalCredentials(sourceResumeText: string): SourceEvidence[] {
  const classification = classifyResumeSections(sourceResumeText);
  return classification.credentialEntities
    .filter(isCredentialEntity)
    .map((item) => evidence(sourceResumeText, item, { immutable: true, section: "credentials" }))
    .filter((item): item is SourceEvidence => Boolean(item));
}

function canonicalEducation(sourceResumeText: string, parsedEducation: unknown): SourceEvidence[] {
  const classified = classifiedEvidence(sourceResumeText, "education");
  const values = classified.length ? classified.map((item) => item.value) : splitNarrative(parsedEducation);
  return semanticDedupe(values, 0.9)
    .map((item) => evidence(sourceResumeText, item, { immutable: true, section: "education" }))
    .filter((item): item is SourceEvidence => Boolean(item));
}

function canonicalSkills(sourceResumeText: string): CanonicalSourceSkill[] {
  const classification = classifyResumeSections(sourceResumeText);
  return classification.skillEntities.map((canonicalName, index) => ({
    id: `source-skill-${index + 1}`,
    canonicalName,
    evidence: classifiedEvidence(sourceResumeText, "skills")
      .filter((item) => normalize(item.value).includes(normalize(canonicalName)) || normalize(canonicalName).includes(normalize(item.value))),
  }));
}

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
    const employer = evidence(sourceResumeText, role.employer, { immutable: true, section: "experience" });
    const jobTitle = evidence(sourceResumeText, role.jobTitle, { immutable: true, section: "experience" });
    const startDate = evidence(sourceResumeText, role.startDate, { immutable: true, section: "experience" });
    const endDate = evidence(sourceResumeText, role.endDate, { immutable: true, section: "experience" });
    if (!employer && !jobTitle) return [];
    const absent: SourceEvidence = { value: "", sourceText: "", lineStart: null, lineEnd: null, section: "experience", immutable: false };

    const identities = [employer?.value ?? "", jobTitle?.value ?? "", startDate?.value ?? "", endDate?.value ?? "", text(role.location)];
    const responsibilities = semanticDedupe(splitNarrative(role.responsibilities)
      .filter((item) => !isRoleIdentityLike(item, identities)), 0.78)
      .map((item) => evidence(sourceResumeText, item, { immutable: false, section: "experience" }))
      .filter((item): item is SourceEvidence => Boolean(item));

    return [{
      id: `source-role-${index + 1}`,
      employer: employer ?? absent,
      jobTitle: jobTitle ?? absent,
      location: evidence(sourceResumeText, role.location, { immutable: true, section: "experience" }),
      startDate: startDate ?? absent,
      endDate: endDate ?? absent,
      current: role.current === true,
      responsibilities,
    }];
  });

  const credentials = canonicalCredentials(sourceResumeText);
  const education = canonicalEducation(sourceResumeText, parsed.education);
  const skills = canonicalSkills(sourceResumeText);
  const summaryFacts = classifiedEvidence(sourceResumeText, "summary");
  const classification = classifyResumeSections(sourceResumeText);
  const sourceSections = {
    header: classifiedEvidence(sourceResumeText, "header"),
    summary: summaryFacts,
    credentials: classifiedEvidence(sourceResumeText, "credentials"),
    skills: classifiedEvidence(sourceResumeText, "skills"),
    experience: classifiedEvidence(sourceResumeText, "experience"),
    education: classifiedEvidence(sourceResumeText, "education"),
    training: classifiedEvidence(sourceResumeText, "training"),
    additional: classifiedEvidence(sourceResumeText, "additional"),
    unclassified: classifiedEvidence(sourceResumeText, "unclassified"),
  } satisfies Record<ResumeSourceSection, SourceEvidence[]>;

  const fullName = evidence(sourceResumeText, firstFullName(sourceResumeText), { immutable: true, section: "header" });
  const email = evidence(sourceResumeText, firstEmail(sourceResumeText), { immutable: true, section: "header" });
  const phone = evidence(sourceResumeText, firstPhone(sourceResumeText), { immutable: true, section: "header" });
  const cityState = evidence(sourceResumeText, firstCityState(sourceResumeText), { immutable: true, section: "header" });

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
    summaryNotes: summaryFacts.map((item) => item.value).join("\n"),
    roles: roles.map(canonicalRoleToPrefill),
    fieldValue: {
      certifications: credentials.map((item) => item.value),
      licenses: "",
      tools: [],
      equipmentSystems: [],
      technicalSkills: skills.map((item) => item.canonicalName),
      software: [],
      safety: [],
    },
    education: education.map((item) => item.value).join("\n"),
    additionalDetails: classification.sections.additional
      .filter((item) => item.kind !== "heading" && !isCredentialEntity(item.value))
      .map((item) => item.value)
      .join("\n"),
  };

  return {
    parserVersion: "source-first-v2",
    contact: { fullName, email, phone, cityState },
    roles,
    education,
    credentials,
    skills,
    summaryFacts,
    sourceSections,
    unclassified: sourceSections.unclassified,
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

function sameDate(left: string, right: string): boolean {
  const a = parseResumeDate(left);
  const b = parseResumeDate(right);
  if (a && b) return a.year === b.year && (!a.month || !b.month || a.month === b.month);
  return normalize(left) === normalize(right);
}

/**
 * True when a job with the same identity is already listed. Blank identity parts
 * are compatible, so a partial parser job and a fuller AI job for the same
 * position never become two jobs; "Jan 2019" and "January 2019" are one date.
 */
export function roleRepresented(existingRoles: RecordValue[], role: RecordValue): boolean {
  const compatible = (left: unknown, right: unknown) => !text(left) || !text(right) || normalize(text(left)) === normalize(text(right));
  const same = (left: unknown, right: unknown) => Boolean(text(left)) && normalize(text(left)) === normalize(text(right));
  return existingRoles.some((existing) =>
    compatible(existing.employer, role.employer)
    && compatible(existing.jobTitle, role.jobTitle)
    && (!text(existing.startDate) || !text(role.startDate) || sameDate(text(existing.startDate), text(role.startDate)))
    && (same(existing.employer, role.employer) || same(existing.jobTitle, role.jobTitle)));
}

function isEducationOnlyCredential(value: string, educationLines: string[]): boolean {
  const key = normalize(value);
  return Boolean(key) && !/\b(?:epa|osha|nccer|journeyman|master|licen[cs]e)\b/.test(key)
    && educationLines.some((line) => normalize(line).includes(key));
}

export function mergeCanonicalWithAiEnrichment(
  sourceResumeText: string,
  canonical: CanonicalSourceRecord,
  aiPrefill: unknown,
): RecordValue {
  const ai = groundResumePrefill(sourceResumeText, aiPrefill);
  const aiContact = record(ai.contact);
  const aiField = record(ai.fieldValue);
  const aiRoles = Array.isArray(ai.roles)
    ? ai.roles.filter((item): item is RecordValue => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];

  const roles = canonical.roles.map((sourceRole) => {
    const aiRole = matchingAiRole(aiRoles, sourceRole);
    const canonicalRole = canonicalRoleToPrefill(sourceRole);
    const identities = [
      sourceRole.employer.value,
      sourceRole.jobTitle.value,
      sourceRole.startDate.value,
      sourceRole.endDate.value,
      sourceRole.location?.value ?? "",
    ];
    const rewritten = supportedRewrittenNarrative(aiRole.responsibilities, sourceRole.responsibilities, identities);
    return {
      ...canonicalRole,
      employer: text(canonicalRole.employer) || text(aiRole.employer),
      jobTitle: text(canonicalRole.jobTitle) || text(aiRole.jobTitle),
      startDate: text(canonicalRole.startDate) || text(aiRole.startDate),
      endDate: text(canonicalRole.endDate) || text(aiRole.endDate),
      current: isCurrentDate(text(canonicalRole.endDate) || text(aiRole.endDate)),
      responsibilities: (rewritten.length ? rewritten : sourceRole.responsibilities.map((item) => item.value)).join("\n"),
      employmentType: sourceBacked(sourceResumeText, text(aiRole.employmentType)) ? text(aiRole.employmentType) : "",
      equipment: sourceBacked(sourceResumeText, text(aiRole.equipment)) ? text(aiRole.equipment) : "",
      systems: sourceBacked(sourceResumeText, text(aiRole.systems)) ? text(aiRole.systems) : "",
      workPerformed: sourceBacked(sourceResumeText, text(aiRole.workPerformed)) ? text(aiRole.workPerformed) : "",
      leadership: sourceBacked(sourceResumeText, text(aiRole.leadership)) ? text(aiRole.leadership) : "",
      workOrders: sourceBacked(sourceResumeText, text(aiRole.workOrders)) ? text(aiRole.workOrders) : "",
      measurable: sourceBacked(sourceResumeText, text(aiRole.measurable)) ? text(aiRole.measurable) : "",
    };
  });

  for (const role of aiRoles) {
    // Preserve supported jobs missed by the canonical layout parser. Both identity
    // fields must be grounded; missing required fields remain explicit questions.
    if (!text(role.employer) && !text(role.jobTitle)) continue;
    if (!roleRepresented(roles, role)) roles.push({ ...role } as typeof roles[number]);
  }

  const contact = {
    ...aiContact,
    fullName: canonical.contact.fullName?.value ?? text(aiContact.fullName),
    email: canonical.contact.email?.value ?? text(aiContact.email),
    phone: canonical.contact.phone?.value ?? text(aiContact.phone),
    cityState: canonical.contact.cityState?.value ?? text(aiContact.cityState),
  };

  const educationLines = [...canonical.education.map((item) => item.value), ...text(ai.education).split("\n").filter(Boolean)];
  const canonicalSkillNames = canonical.skills.map((item) => item.canonicalName);
  const aiSkills = [
    ...sourceBackedList(sourceResumeText, aiField.tools),
    ...sourceBackedList(sourceResumeText, aiField.equipmentSystems),
    ...sourceBackedList(sourceResumeText, aiField.technicalSkills),
    ...sourceBackedList(sourceResumeText, aiField.software),
  ];
  // The AI may echo the header (title, trade, city/state) as skills; identity stays in the header.
  const identity = {
    contact: { fullName: contact.fullName, email: contact.email, phone: contact.phone, location: contact.cityState },
    targetTitle: text(ai.targetJobTitle),
  };
  const technicalSkills = dedupeSkillTerms([...canonicalSkillNames, ...aiSkills])
    .filter((skill) => !isResumeIdentityTerm(skill, identity, text(ai.trade)));
  const aiSummary = text(ai.summaryNotes);
  const summarySource = canonical.summaryFacts.map((item) => item.value);
  const summaryNotes = aiSummary && rewriteSupported(aiSummary, summarySource.length ? summarySource : [sourceResumeText])
    ? aiSummary
    : canonical.summaryFacts.map((item) => item.value).join("\n");

  return {
    ...ai,
    contact,
    summaryNotes,
    roles,
    fieldValue: {
      ...aiField,
      certifications: dedupeCredentials([
        ...canonical.credentials.map((item) => item.value),
        // AI credentials are already grounded; an education program is never a certification.
        ...list(aiField.certifications).filter((item) => isCredentialEntity(item) && !isEducationOnlyCredential(item, educationLines)),
      ]),
      // Licenses are grounded line-by-line against the source before this merge.
      licenses: text(aiField.licenses),
      tools: [],
      equipmentSystems: [],
      technicalSkills,
      software: [],
      safety: [],
    },
    education: [...new Set(educationLines)].join("\n"),
    additionalDetails: text(canonical.prefill.additionalDetails),
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

  if (roles.length < canonical.roles.length) issues.push("roles.length");

  canonical.roles.forEach((sourceRole, index) => {
    const role = roles[index] ?? {};
    if (sourceRole.employer.value && text(role.employer) !== sourceRole.employer.value) issues.push(`roles.${index}.employer`);
    if (sourceRole.jobTitle.value && text(role.jobTitle) !== sourceRole.jobTitle.value) issues.push(`roles.${index}.jobTitle`);
    if (sourceRole.location && text(role.location) !== sourceRole.location.value) issues.push(`roles.${index}.location`);
    if (sourceRole.startDate.value && text(role.startDate) !== sourceRole.startDate.value) issues.push(`roles.${index}.startDate`);
    if (sourceRole.endDate.value && text(role.endDate) !== sourceRole.endDate.value) issues.push(`roles.${index}.endDate`);
    if (sourceRole.endDate.value && (role.current === true) !== sourceRole.current) issues.push(`roles.${index}.current`);

    const identities = [
      sourceRole.employer.value,
      sourceRole.jobTitle.value,
      sourceRole.startDate.value,
      sourceRole.endDate.value,
      sourceRole.location?.value ?? "",
    ];
    if (splitNarrative(role.responsibilities).some((item) => isRoleIdentityLike(item, identities))) {
      issues.push(`roles.${index}.responsibility_identity_contamination`);
    }
  });

  const field = record(root.fieldValue);
  const credentials = list(field.certifications);
  const expectedCredentials = canonical.credentials.map((item) => item.value);
  if (expectedCredentials.some((item) => !credentials.includes(item))) issues.push("credentials");
  if (credentials.some((item) => !isCredentialEntity(item))) issues.push("credential_contamination");
  if (canonical.education.some((item) => !text(root.education).includes(item.value))) issues.push("education");

  const contact = record(root.contact);
  if (canonical.contact.fullName && text(contact.fullName) !== canonical.contact.fullName.value) issues.push("contact.fullName");
  if (canonical.contact.email && text(contact.email) !== canonical.contact.email.value) issues.push("contact.email");
  if (canonical.contact.phone && text(contact.phone) !== canonical.contact.phone.value) issues.push("contact.phone");
  if (canonical.contact.cityState && text(contact.cityState) !== canonical.contact.cityState.value) issues.push("contact.cityState");

  return { valid: issues.length === 0, issues };
}
