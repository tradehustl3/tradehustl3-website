import type { GeneratedResume, ResumeCertification, ResumeExperience } from "./resume-documents";

export type FactProvenance = "upload" | "guided_intake" | "user_edit";

export type CanonicalSourceRole = {
  sourceIndex: number;
  employer: string;
  jobTitle: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: string[];
  provenance: FactProvenance;
};

export type CanonicalSourceRecord = {
  contact: { fullName: string; email: string; phone: string; location: string };
  targetTitle: string;
  roles: CanonicalSourceRole[];
  certifications: string[];
  licenses: string[];
  tools: string[];
  equipmentSystems: string[];
  technicalSkills: string[];
  software: string[];
  safety: string[];
  narrativeFacts: string[];
  education: string;
  sourceResumeText: string;
  metrics: string[];
  provenance: FactProvenance;
  factProvenance: Record<string, FactProvenance>;
};

export type QualityIssueCode =
  | "missing_job"
  | "changed_job_identity"
  | "changed_job_dates"
  | "missing_source_duties"
  | "missing_credential"
  | "unsupported_credential"
  | "unsupported_skill"
  | "unsupported_summary"
  | "unsupported_duty"
  | "unsupported_education"
  | "unsupported_additional_information"
  | "unsupported_number"
  | "thin_work_history";

export type QualityIssue = {
  code: QualityIssueCode;
  message: string;
  sourceIndex?: number;
};

export type ResumeQualityScore = {
  total: number;
  label: "Needs work" | "Getting stronger" | "Ready to review";
  dimensions: {
    completeness: number;
    workHistory: number;
    bulletStrength: number;
    tradeRelevance: number;
    atsReadability: number;
    chronologyIntegrity: number;
    contactInformation: number;
    credentials: number;
    truthfulness: number;
  };
  issues: string[];
};

type EditorialSelection = {
  jobIndex: number;
  bulletIndex: number;
  choice: "suggestion" | "original" | "edited";
  suggestion?: string;
  provenance?: FactProvenance;
};

export type StoredGeneratedResume = GeneratedResume & {
  editorial?: { selections?: EditorialSelection[] };
  grounding?: ResumeGroundingAudit;
};

export type SourceFact = {
  id: string;
  value: string;
  roleIndex?: number;
};

export type ModelClaimSource = {
  claimPath: string;
  sourceFactIds: string[];
};

export type ResumeGroundingAudit = {
  version: 1;
  repaired: boolean;
  claims: ModelClaimSource[];
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown, maxLength = 4_000): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function textList(value: unknown, maxItems = 80): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => text(item, 240)).filter(Boolean))).slice(0, maxItems);
}

function normalized(value: string): string {
  return value.toLowerCase()
    .replace(/\bten\b/g, "10")
    .replace(/\bthirty\b/g, "30")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function roleKey(role: { employer?: string; jobTitle: string }): string {
  return `${normalized(role.employer ?? "")}::${normalized(role.jobTitle)}`;
}

function splitClaims(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/\r?\n|[•●▪◦]|(?<=[.!?])\s+(?=[A-Z])/)
    .map((item) => text(item, 500).replace(/^[-–—*]\s*/, ""))
    .filter((item) => item.length >= 3);
}

function splitListClaims(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value.split(/\r?\n|[,;]|[•●▪◦]/)
    .map((item) => text(item.replace(/^[^:]{1,40}:\s*/, ""), 240))
    .filter(Boolean);
}

function roleBullets(role: Record<string, unknown>): string[] {
  const fields = [
    role.responsibilities,
    role.equipment,
    role.systems,
    role.workPerformed,
    role.leadership,
    role.workOrders,
    role.measurable,
  ];
  const bullets = fields.flatMap(splitClaims);
  if (!bullets.length) bullets.push(...splitClaims(role.responsibilitiesAndWins));
  return Array.from(new Set(bullets.map((item) => normalized(item)).filter(Boolean)))
    .map((key) => bullets.find((item) => normalized(item) === key)!)
    .slice(0, 10);
}

function numericClaims(value: unknown): string[] {
  const source = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return Array.from(new Set(source.match(/\b\d[\d,]*(?:\.\d+)?(?:\s*(?:%|percent|years?|tons?|units?|properties|work orders?))?\b/gi) ?? []));
}

function sourceProvenance(root: Record<string, unknown>): FactProvenance {
  const meta = record(root.meta);
  return meta.importedResume === true || text(meta.source) === "upload" ? "upload" : "guided_intake";
}

export function canonicalSourceRecord(intake: unknown, targetTitle = ""): CanonicalSourceRecord {
  const root = record(intake);
  const contact = record(root.contact);
  const targetJob = record(root.targetJob);
  const fieldValue = record(root.fieldValue);
  const provenance = sourceProvenance(root);
  const roles = Array.isArray(root.experience)
    ? root.experience.map(record).flatMap((role, sourceIndex) => {
      const jobTitle = text(role.jobTitle, 160);
      const bullets = roleBullets(role);
      if (!jobTitle && !bullets.length) return [];
      return [{
        sourceIndex,
        employer: text(role.employer, 160),
        jobTitle,
        location: text(role.location, 120),
        startDate: text(role.startDate, 50),
        endDate: text(role.current === true ? "Present" : role.endDate, 50),
        bullets,
        provenance,
      }];
    })
    : [];
  const career = record(root.career);
  const licenses = splitClaims(fieldValue.licenses);
  const certifications = Array.from(new Set([
    ...textList(fieldValue.certifications, 24),
    ...splitClaims(career.licensesAndCertifications),
  ]));
  const metricSource = {
    career: record(root.career),
    roles: Array.isArray(root.experience) ? root.experience : [],
    fieldValue,
    education: root.education,
    additionalDetails: root.additionalDetails,
  };
  const source: Omit<CanonicalSourceRecord, "factProvenance"> = {
    contact: {
      fullName: text(contact.fullName, 120),
      email: text(contact.email, 254).toLowerCase(),
      phone: text(contact.phone, 80),
      location: text(contact.cityState, 160),
    },
    targetTitle: text(targetJob.title, 120) || text(targetTitle, 120),
    roles,
    certifications,
    licenses,
    tools: textList(fieldValue.tools),
    equipmentSystems: textList(fieldValue.equipmentSystems),
    technicalSkills: Array.from(new Set([
      ...textList(fieldValue.technicalSkills),
      ...splitListClaims(career.skillsAndTools),
    ])),
    software: textList(fieldValue.software),
    safety: textList(fieldValue.safety),
    narrativeFacts: Array.from(new Set([
      ...splitClaims(career.summaryNotes),
      ...splitClaims(career.yearsExperience),
      ...splitClaims(root.additionalDetails),
    ])),
    education: text(root.education, 2_500),
    sourceResumeText: typeof root.sourceResumeText === "string" ? root.sourceResumeText.trim().slice(0, 100_000) : "",
    metrics: numericClaims(metricSource),
    provenance,
  };
  const factProvenance: Record<string, FactProvenance> = {};
  const mark = (path: string, value: unknown) => {
    if (Array.isArray(value) ? value.length > 0 : Boolean(value)) factProvenance[path] = provenance;
  };
  for (const [key, value] of Object.entries(source.contact)) mark(`contact.${key}`, value);
  mark("targetTitle", source.targetTitle);
  source.roles.forEach((role, index) => {
    for (const [key, value] of Object.entries(role)) {
      if (key !== "provenance" && key !== "sourceIndex" && key !== "bullets") mark(`roles.${index}.${key}`, value);
    }
    role.bullets.forEach((value, bulletIndex) => mark(`roles.${index}.bullets.${bulletIndex}`, value));
  });
  for (const group of ["certifications", "licenses", "tools", "equipmentSystems", "technicalSkills", "software", "safety", "narrativeFacts", "metrics"] as const) {
    source[group].forEach((value, index) => mark(`${group}.${index}`, value));
  }
  mark("education", source.education);
  mark("sourceResumeText", source.sourceResumeText);
  return { ...source, factProvenance };
}

export function sourceFactCatalog(source: CanonicalSourceRecord, correctionRequest: string | null = null): SourceFact[] {
  const facts: SourceFact[] = [];
  const add = (id: string, value: string, roleIndex?: number) => {
    if (value) facts.push({ id, value, ...(roleIndex === undefined ? {} : { roleIndex }) });
  };
  for (const [key, value] of Object.entries(source.contact)) add(`contact.${key}`, value);
  add("targetTitle", source.targetTitle);
  source.roles.forEach((role, index) => {
    add(`roles.${index}.jobTitle`, role.jobTitle, index);
    add(`roles.${index}.employer`, role.employer, index);
    add(`roles.${index}.location`, role.location, index);
    add(`roles.${index}.startDate`, role.startDate, index);
    add(`roles.${index}.endDate`, role.endDate, index);
    role.bullets.forEach((value, bulletIndex) => add(`roles.${index}.bullets.${bulletIndex}`, value, index));
  });
  for (const group of ["certifications", "licenses", "tools", "equipmentSystems", "technicalSkills", "software", "safety", "narrativeFacts", "metrics"] as const) {
    source[group].forEach((value, index) => add(`${group}.${index}`, value));
  }
  add("education", source.education);
  if (source.sourceResumeText) {
    splitClaims(source.sourceResumeText).slice(0, 160).forEach((value, index) => {
      add(`upload.raw.${index}`, value);
    });
  }
  add("customerCorrection", text(correctionRequest, 2_000));
  return facts;
}

function findGeneratedRole(source: CanonicalSourceRole, generated: GeneratedResume): ResumeExperience | undefined {
  const exact = generated.experience.find((role) => roleKey(role) === roleKey(source));
  if (exact) return exact;
  return generated.experience.find((role) => normalized(role.jobTitle) === normalized(source.jobTitle));
}

function certSupported(name: string, source: CanonicalSourceRecord): boolean {
  const key = normalized(name);
  return [...source.certifications, ...source.licenses, ...source.safety, source.sourceResumeText]
    .filter(Boolean)
    .some((item) => {
      const sourceKey = normalized(item);
      return sourceKey === key || sourceKey.includes(key) || key.includes(sourceKey);
    });
}

function overlap(source: string, candidate: string): number {
  const stop = new Set(["and", "the", "for", "with", "from", "into", "that", "this", "work", "worked", "performed"]);
  const sourceWords = new Set(normalized(source).split(" ").filter((word) => word.length > 3 && !stop.has(word)));
  const candidateWords = new Set(normalized(candidate).split(" ").filter((word) => word.length > 3 && !stop.has(word)));
  if (!sourceWords.size) return 1;
  let shared = 0;
  for (const word of sourceWords) if (candidateWords.has(word)) shared += 1;
  return shared / sourceWords.size;
}

const GENERIC_CLAIM_WORDS = new Set([
  "and", "the", "for", "with", "from", "into", "that", "this", "work", "worked", "performed",
  "perform", "responsible", "using", "use", "used", "support", "supported", "professional", "experienced",
  "skilled", "trades", "verified", "experience", "proficient", "maintain", "maintained", "manage", "managed", "complete", "completed", "ensure",
  "ensured", "provide", "provided", "execute", "executed", "assist", "assisted", "coordinate", "coordinated",
]);

function significantWords(value: string): string[] {
  return Array.from(new Set(normalized(value).split(" ")
    .filter((word) => word.length > 3 && !GENERIC_CLAIM_WORDS.has(word))));
}

function claimSupported(candidate: string, sources: string[]): boolean {
  const candidateWords = significantWords(candidate);
  if (!candidateWords.length) return true;
  const sourceWords = new Set(sources.flatMap(significantWords));
  const shared = candidateWords.filter((word) => sourceWords.has(word)).length;
  return shared / candidateWords.length >= 2 / 3;
}

function skillSupported(skill: string, source: CanonicalSourceRecord): boolean {
  return [
    ...source.tools,
    ...source.equipmentSystems,
    ...source.technicalSkills,
    ...source.software,
    ...source.safety,
    ...source.roles.flatMap((role) => role.bullets),
    source.sourceResumeText,
  ].filter(Boolean).some((claim) => normalized(claim).includes(normalized(skill))
    || normalized(skill).includes(normalized(claim))
    || (overlap(skill, claim) >= 0.5 && claimSupported(skill, [claim])));
}

function educationSupported(item: GeneratedResume["education"][number], source: CanonicalSourceRecord): boolean {
  const educationSources = [source.education, source.sourceResumeText].filter(Boolean);
  return educationSources.length > 0 && claimSupported(Object.values(item).filter(Boolean).join(" "), educationSources);
}

function summarySources(source: CanonicalSourceRecord): string[] {
  return [
    source.targetTitle,
    ...source.roles.flatMap((role) => [role.jobTitle, ...role.bullets]),
    ...source.tools,
    ...source.equipmentSystems,
    ...source.technicalSkills,
    ...source.software,
    ...source.safety,
    ...source.certifications,
    ...source.licenses,
    ...source.narrativeFacts,
    source.education,
    source.sourceResumeText,
  ].filter(Boolean);
}

export function validateResumeAgainstSource(
  generated: GeneratedResume,
  source: CanonicalSourceRecord,
  unsupportedNumberCount = 0,
  allowDateChanges = false,
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const role of source.roles) {
    const match = findGeneratedRole(role, generated);
    if (!match) {
      issues.push({ code: "missing_job", sourceIndex: role.sourceIndex, message: `Missing source job: ${role.jobTitle || role.employer}.` });
      continue;
    }
    if (role.employer && normalized(match.employer ?? "") !== normalized(role.employer)) {
      issues.push({ code: "changed_job_identity", sourceIndex: role.sourceIndex, message: `Employer changed for ${role.jobTitle}.` });
    }
    if (!allowDateChanges && role.startDate && normalized(match.startDate ?? "") !== normalized(role.startDate)) {
      issues.push({ code: "changed_job_dates", sourceIndex: role.sourceIndex, message: `Start date changed for ${role.jobTitle}.` });
    }
    if (!allowDateChanges && role.endDate && normalized(match.endDate ?? "") !== normalized(role.endDate)) {
      issues.push({ code: "changed_job_dates", sourceIndex: role.sourceIndex, message: `End date changed for ${role.jobTitle}.` });
    }
    const generatedText = match.bullets.join(" ");
    if (role.bullets.length && role.bullets.filter((bullet) => overlap(bullet, generatedText) >= 0.25).length < role.bullets.length) {
      issues.push({ code: "missing_source_duties", sourceIndex: role.sourceIndex, message: `Supported duties were dropped from ${role.jobTitle}.` });
    }
    const supportClaims = [
      ...role.bullets,
      ...source.tools,
      ...source.equipmentSystems,
      ...source.technicalSkills,
      ...source.software,
      ...source.safety,
      source.sourceResumeText,
    ].filter(Boolean);
    if (match.bullets.some((bullet) => !claimSupported(bullet, supportClaims))) {
      issues.push({ code: "unsupported_duty", sourceIndex: role.sourceIndex, message: `An experience claim is not supported for ${role.jobTitle}.` });
    }
  }
  for (const credential of [...source.certifications, ...source.licenses]) {
    if (!generated.certifications.some((item) => normalized(item.name).includes(normalized(credential)) || normalized(credential).includes(normalized(item.name)))) {
      issues.push({ code: "missing_credential", message: `Missing verified credential: ${credential}.` });
    }
  }
  if (generated.certifications.some((item) => !certSupported(item.name, source))) {
    issues.push({ code: "unsupported_credential", message: "The draft contains an unverified credential." });
  }
  if (generated.skills.some((skill) => !skillSupported(skill, source))) {
    issues.push({ code: "unsupported_skill", message: "The draft contains an unsupported skill." });
  }
  if (generated.summary && !claimSupported(generated.summary, summarySources(source))) {
    issues.push({ code: "unsupported_summary", message: "The draft summary contains an unsupported claim." });
  }
  if (generated.education.some((item) => !educationSupported(item, source))) {
    issues.push({ code: "unsupported_education", message: "The draft contains unsupported education." });
  }
  const additionalSources = [...source.safety, ...source.certifications, ...source.licenses, source.education, source.sourceResumeText].filter(Boolean);
  if (generated.additionalInformation.some((item) => !claimSupported(item, additionalSources))) {
    issues.push({ code: "unsupported_additional_information", message: "The draft contains unsupported additional information." });
  }
  if (source.roles.length >= 2 && generated.experience.length < source.roles.length) {
    issues.push({ code: "thin_work_history", message: "Substantial source work history collapsed into an incomplete resume." });
  }
  if (unsupportedNumberCount) {
    issues.push({ code: "unsupported_number", message: "The draft contains a number that is not supported by the source." });
  }
  return issues;
}

function sourceCertification(name: string): ResumeCertification {
  return { name };
}

/** One deterministic, bounded repair using only source facts. */
export function repairResumeFromSource(
  generated: GeneratedResume,
  source: CanonicalSourceRecord,
  preserveGeneratedDates = false,
): GeneratedResume {
  const experience = source.roles.map((sourceRole) => {
    const existing = findGeneratedRole(sourceRole, generated);
    const supportClaims = [
      ...sourceRole.bullets,
      ...source.tools,
      ...source.equipmentSystems,
      ...source.technicalSkills,
      ...source.software,
      ...source.safety,
      source.sourceResumeText,
    ].filter(Boolean);
    const supportedGeneratedBullets = existing?.bullets.filter((bullet) => {
      const generatedNumbers = numericClaims(bullet).map(normalized);
      const allowedNumbers = source.metrics.map(normalized);
      const factSupported = !supportClaims.length || claimSupported(bullet, supportClaims);
      return factSupported && generatedNumbers.every((number) => allowedNumbers.includes(number));
    }) ?? [];
    const preserved = [...supportedGeneratedBullets];
    for (const sourceBullet of sourceRole.bullets) {
      if (!preserved.some((bullet) => overlap(sourceBullet, bullet) >= 0.25)) preserved.push(sourceBullet);
    }
    return {
      jobTitle: sourceRole.jobTitle || existing?.jobTitle || "Skilled Trades Professional",
      employer: sourceRole.employer || undefined,
      location: sourceRole.location || undefined,
      startDate: preserveGeneratedDates ? existing?.startDate : sourceRole.startDate || undefined,
      endDate: preserveGeneratedDates ? existing?.endDate : sourceRole.endDate || undefined,
      bullets: preserved.slice(0, 10),
    };
  });
  const supportedCertifications = generated.certifications.filter((item) => certSupported(item.name, source));
  for (const credential of [...source.certifications, ...source.licenses]) {
    if (!supportedCertifications.some((item) => normalized(item.name).includes(normalized(credential)) || normalized(credential).includes(normalized(item.name)))) {
      supportedCertifications.push(sourceCertification(credential));
    }
  }
  const supportedSkills = generated.skills.filter((skill) => skillSupported(skill, source));
  for (const skill of [...source.technicalSkills, ...source.tools, ...source.equipmentSystems, ...source.software]) {
    if (!supportedSkills.some((item) => normalized(item) === normalized(skill))) supportedSkills.push(skill);
  }
  const summaryFacts = [
    ...source.technicalSkills,
    ...source.tools,
    ...source.equipmentSystems,
    ...source.roles.map((role) => role.jobTitle),
  ].filter(Boolean).slice(0, 4);
  const safeSummary = summaryFacts.length
    ? `Skilled trades professional with verified experience in ${summaryFacts.join(", ")}.`
    : "Skilled trades professional with verified work experience.";
  return {
    ...generated,
    basics: {
      ...generated.basics,
      fullName: source.contact.fullName || generated.basics.fullName,
      targetTitle: source.targetTitle || generated.basics.targetTitle,
      location: source.contact.location || generated.basics.location,
      phone: source.contact.phone || generated.basics.phone,
      email: source.contact.email || generated.basics.email,
    },
    certifications: supportedCertifications,
    skills: supportedSkills.slice(0, 24),
    experience: source.roles.length ? experience : generated.experience,
    summary: generated.summary && claimSupported(generated.summary, summarySources(source)) ? generated.summary : safeSummary,
    education: generated.education.filter((item) => educationSupported(item, source)),
    additionalInformation: generated.additionalInformation.filter((item) => claimSupported(item, [
      ...source.safety,
      ...source.certifications,
      ...source.licenses,
      source.education,
      source.sourceResumeText,
    ].filter(Boolean))),
  };
}

function generatedClaimPaths(generated: GeneratedResume): string[] {
  return [
    ...(generated.summary ? ["summary"] : []),
    ...generated.skills.map((_, index) => `skills.${index}`),
    ...generated.certifications.map((_, index) => `certifications.${index}`),
    ...generated.experience.flatMap((role, roleIndex) => role.bullets.map((_, bulletIndex) => `experience.${roleIndex}.bullets.${bulletIndex}`)),
    ...generated.education.map((_, index) => `education.${index}`),
    ...generated.additionalInformation.map((_, index) => `additionalInformation.${index}`),
  ];
}

function generatedClaimText(generated: GeneratedResume, path: string): string {
  if (path === "summary") return generated.summary;
  let match = /^skills\.(\d+)$/.exec(path);
  if (match) return generated.skills[Number(match[1])] ?? "";
  match = /^certifications\.(\d+)$/.exec(path);
  if (match) return Object.values(generated.certifications[Number(match[1])] ?? {}).filter(Boolean).join(" ");
  match = /^experience\.(\d+)\.bullets\.(\d+)$/.exec(path);
  if (match) return generated.experience[Number(match[1])]?.bullets[Number(match[2])] ?? "";
  match = /^education\.(\d+)$/.exec(path);
  if (match) return Object.values(generated.education[Number(match[1])] ?? {}).filter(Boolean).join(" ");
  match = /^additionalInformation\.(\d+)$/.exec(path);
  return match ? generated.additionalInformation[Number(match[1])] ?? "" : "";
}

export function validateClaimSources(
  generated: GeneratedResume,
  source: CanonicalSourceRecord,
  claims: ModelClaimSource[],
  correctionRequest: string | null = null,
): boolean {
  const catalog = new Map(sourceFactCatalog(source, correctionRequest).map((fact) => [fact.id, fact]));
  const byPath = new Map(claims.map((claim) => [claim.claimPath, claim.sourceFactIds]));
  return generatedClaimPaths(generated).every((path) => {
    const ids = byPath.get(path);
    if (!ids?.length || ids.length > 8 || ids.some((id) => !catalog.has(id))) return false;
    if (path.startsWith("experience.")) {
      const roleIndex = Number(path.split(".")[1]);
      if (!ids.some((id) => catalog.get(id)?.roleIndex === roleIndex)) return false;
    }
    const citedValues = ids.map((id) => catalog.get(id)?.value ?? "");
    return claimSupported(generatedClaimText(generated, path), citedValues);
  });
}

function evidenceIdsForClaim(path: string, generated: GeneratedResume, catalog: SourceFact[]): string[] {
  const claim = generatedClaimText(generated, path);
  const roleMatch = /^experience\.(\d+)\./.exec(path);
  const eligible = roleMatch
    ? catalog.filter((fact) => fact.roleIndex === Number(roleMatch[1]) || fact.roleIndex === undefined)
    : catalog;
  const direct = eligible.filter((fact) => claimSupported(claim, [fact.value]));
  if (direct.length) return direct.slice(0, 8).map((fact) => fact.id);
  const combined: SourceFact[] = [];
  for (const fact of eligible) {
    combined.push(fact);
    if (claimSupported(claim, combined.map((item) => item.value))) break;
  }
  return combined.slice(-8).map((fact) => fact.id);
}

export function groundingAuditFromSource(
  generated: GeneratedResume,
  source: CanonicalSourceRecord,
  claims: ModelClaimSource[],
  repaired: boolean,
  correctionRequest: string | null = null,
): ResumeGroundingAudit {
  const catalog = sourceFactCatalog(source, correctionRequest);
  if (!repaired && validateClaimSources(generated, source, claims, correctionRequest)) {
    return { version: 1, repaired: false, claims };
  }
  const safeClaims = generatedClaimPaths(generated).map((claimPath) => {
    return { claimPath, sourceFactIds: evidenceIdsForClaim(claimPath, generated, catalog) };
  });
  return { version: 1, repaired: true, claims: safeClaims };
}

function actionVerbScore(bullets: string[]): number {
  const verbs = /^(diagnos|repair|install|maintain|manage|lead|direct|coordinate|inspect|service|troubleshoot|perform|complete|operate|fabricate|weld|build|replace|restore|execute|support)/i;
  if (!bullets.length) return 0;
  return Math.round(10 * bullets.filter((bullet) => verbs.test(bullet.trim())).length / bullets.length);
}

export function scoreResume(
  generated: GeneratedResume | null,
  source: CanonicalSourceRecord,
  unsupportedNumberCount = 0,
): ResumeQualityScore {
  if (!generated) {
    const readiness = Math.min(100, 15
      + (source.contact.fullName ? 10 : 0)
      + (source.targetTitle ? 10 : 0)
      + Math.min(30, source.roles.length * 10)
      + (source.certifications.length ? 10 : 0)
      + (source.technicalSkills.length + source.tools.length + source.equipmentSystems.length ? 15 : 0));
    return {
      total: readiness,
      label: readiness >= 80 ? "Ready to review" : readiness >= 55 ? "Getting stronger" : "Needs work",
      dimensions: { completeness: readiness, workHistory: readiness, bulletStrength: 0, tradeRelevance: readiness, atsReadability: 100, chronologyIntegrity: readiness, contactInformation: readiness, credentials: readiness, truthfulness: 100 },
      issues: source.roles.length ? [] : ["Add at least one job or training role with duties."],
    };
  }
  const issues = validateResumeAgainstSource(generated, source, unsupportedNumberCount);
  const bullets = generated.experience.flatMap((role) => role.bullets);
  const missingJobs = issues.filter((issue) => issue.code === "missing_job" || issue.code === "thin_work_history").length;
  const dateIssues = issues.filter((issue) => issue.code === "changed_job_dates").length;
  const credentialIssues = issues.filter((issue) => issue.code === "missing_credential").length;
  const dutyIssues = issues.filter((issue) => issue.code === "missing_source_duties").length;
  const truthIssues = unsupportedNumberCount + issues.filter((issue) => issue.code === "changed_job_identity").length;
  const dimensions = {
    completeness: Math.max(0, 100 - missingJobs * 40 - credentialIssues * 15),
    workHistory: Math.max(0, 100 - missingJobs * 50 - dutyIssues * 20),
    bulletStrength: Math.min(100, actionVerbScore(bullets) * 10),
    tradeRelevance: Math.min(100, 55 + Math.min(45, (source.tools.length + source.equipmentSystems.length + source.technicalSkills.length) * 3)),
    atsReadability: 100,
    chronologyIntegrity: Math.max(0, 100 - dateIssues * 35),
    contactInformation: [generated.basics.fullName, generated.basics.email, generated.basics.phone, generated.basics.location].filter(Boolean).length * 25,
    credentials: Math.max(0, 100 - credentialIssues * 30),
    truthfulness: truthIssues ? 0 : 100,
  };
  let total = Math.round(Object.values(dimensions).reduce((sum, value) => sum + value, 0) / Object.keys(dimensions).length);
  if (missingJobs || truthIssues) total = Math.min(total, 59);
  return {
    total,
    label: total >= 80 ? "Ready to review" : total >= 55 ? "Getting stronger" : "Needs work",
    dimensions,
    issues: Array.from(new Set(issues.map((issue) => issue.message))).slice(0, 8),
  };
}

export function editorialSelection(
  stored: StoredGeneratedResume,
  jobIndex: number,
  bulletIndex: number,
): EditorialSelection["choice"] {
  return stored.editorial?.selections?.find((item) => item.jobIndex === jobIndex && item.bulletIndex === bulletIndex)?.choice
    ?? "suggestion";
}

export function editorialSuggestion(
  stored: StoredGeneratedResume,
  jobIndex: number,
  bulletIndex: number,
  fallback: string,
): string {
  return stored.editorial?.selections?.find((item) => item.jobIndex === jobIndex && item.bulletIndex === bulletIndex)?.suggestion
    ?? fallback;
}

export function withEditorialSelection(
  stored: StoredGeneratedResume,
  selection: EditorialSelection,
): StoredGeneratedResume {
  const current = stored.editorial?.selections ?? [];
  return {
    ...stored,
    editorial: {
      selections: [
        ...current.filter((item) => item.jobIndex !== selection.jobIndex || item.bulletIndex !== selection.bulletIndex),
        { ...selection, provenance: "user_edit" },
      ],
    },
  };
}
