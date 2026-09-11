import type { GeneratedResume, ResumeCertification, ResumeEducation } from "./resume-documents";
import {
  canonicalSourceRecord,
  scoreResume,
  validateResumeAgainstSource,
} from "./resume-quality";
import {
  dedupeSkillTerms,
  isCredentialEntity,
  isRoleIdentityLike,
  normalizeResumeValue,
  semanticDedupe,
} from "./resume-section-classifier";

export type CriticalResumeGateResult = {
  ready: boolean;
  score: number;
  issues: string[];
  resume: GeneratedResume;
};

export type PostStructureIssueCode =
  | "credential_prose"
  | "credential_in_additional"
  | "duplicate_skill"
  | "duplicate_role_bullet"
  | "role_header_in_bullet"
  | "duplicate_summary_sentence";

export type PostStructureIssue = {
  code: PostStructureIssueCode;
  message: string;
  roleIndex?: number;
};

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalize(value: string): string {
  return normalizeResumeValue(clean(value));
}

function sourceEducationItem(value: string): ResumeEducation | null {
  const raw = clean(value);
  if (!raw) return null;

  // Preserve the customer's own wording. A separator is only used to split
  // credential from institution; no school, degree, year, or location is invented.
  const parts = raw.split(/\s+(?:—|–|\|| at )\s+/i).map(clean).filter(Boolean);
  if (parts.length >= 2) {
    return { credential: parts[0], institution: parts.slice(1).join(" — ") };
  }
  return { credential: raw, institution: "" };
}

function wordSet(value: string): Set<string> {
  return new Set(normalize(value).split(" ").filter(Boolean));
}

function sameEducationFacts(sourceEducation: string, candidate: string): boolean {
  const sourceKey = normalize(sourceEducation);
  const candidateKey = normalize(candidate);
  if (!sourceKey) return true;
  if (!candidateKey) return false;
  if (candidateKey.includes(sourceKey) || sourceKey.includes(candidateKey)) return true;

  const sourceWords = wordSet(sourceKey);
  const candidateWords = wordSet(candidateKey);
  if (!sourceWords.size || !candidateWords.size) return false;
  return [...sourceWords].every((word) => candidateWords.has(word))
    && [...candidateWords].every((word) => sourceWords.has(word));
}

function hasSourceEducation(generated: GeneratedResume, sourceEducation: string): boolean {
  return generated.education.some((item) => sameEducationFacts(
    sourceEducation,
    [item.credential, item.institution, item.location, item.year].filter(Boolean).join(" "),
  ));
}

function sameCredential(left: string, right: string): boolean {
  const a = normalize(left);
  const b = normalize(right);
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
}

function expectedCredentialNames(intake: unknown, title: string): string[] {
  const source = canonicalSourceRecord(intake, title);
  const values = [...source.certifications, ...source.licenses, ...source.safety]
    .filter((item) => isCredentialEntity(item));
  const result: string[] = [];
  for (const value of values) {
    if (!result.some((current) => sameCredential(current, value))) result.push(value);
  }
  return result;
}

function splitSummarySentences(value: string): string[] {
  return clean(value)
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(clean)
    .filter(Boolean);
}

function dedupeCertifications(values: ResumeCertification[]): ResumeCertification[] {
  const kept: ResumeCertification[] = [];
  for (const item of values) {
    const name = clean(item.name);
    if (!name || kept.some((current) => sameCredential(current.name, name))) continue;
    kept.push({ ...item, name });
  }
  return kept;
}

function roleIdentities(role: GeneratedResume["experience"][number]): string[] {
  return [
    role.jobTitle,
    role.employer ?? "",
    role.location ?? "",
    role.startDate ?? "",
    role.endDate ?? "",
  ].filter(Boolean);
}

export function validatePostStructure(generated: GeneratedResume): PostStructureIssue[] {
  const issues: PostStructureIssue[] = [];

  if (generated.certifications.some((item) => !isCredentialEntity(item.name))) {
    issues.push({ code: "credential_prose", message: "Certification section contains narrative text instead of a credential entity." });
  }
  if (generated.additionalInformation.some((item) => isCredentialEntity(item))) {
    issues.push({ code: "credential_in_additional", message: "A verified credential is stranded in Additional Information." });
  }

  if (dedupeSkillTerms(generated.skills).length !== generated.skills.length) {
    issues.push({ code: "duplicate_skill", message: "Core Skills contains duplicate or equivalent skills." });
  }

  const summarySentences = splitSummarySentences(generated.summary);
  if (semanticDedupe(summarySentences, 0.86).length !== summarySentences.length) {
    issues.push({ code: "duplicate_summary_sentence", message: "Professional Summary repeats the same supported point." });
  }

  generated.experience.forEach((role, roleIndex) => {
    const identities = roleIdentities(role);
    if (role.bullets.some((bullet) => isRoleIdentityLike(bullet, identities))) {
      issues.push({ code: "role_header_in_bullet", roleIndex, message: `Work experience role ${roleIndex + 1} repeats its header as a bullet.` });
    }
    if (semanticDedupe(role.bullets, 0.84).length !== role.bullets.length) {
      issues.push({ code: "duplicate_role_bullet", roleIndex, message: `Work experience role ${roleIndex + 1} contains duplicate responsibilities.` });
    }
  });

  return issues;
}

/**
 * Deterministic post-structure repair. This never invents content. It only
 * removes contamination/duplicates and moves source-verified credentials into
 * the credential section before the final source-grounding gate runs.
 */
export function hardenResumeStructure(
  generated: GeneratedResume,
  intake: unknown,
  title: string,
): GeneratedResume {
  const expectedCredentials = expectedCredentialNames(intake, title);
  const certifications = dedupeCertifications(generated.certifications
    .filter((item) => isCredentialEntity(item.name)));

  for (const expected of expectedCredentials) {
    if (!certifications.some((item) => sameCredential(item.name, expected))) {
      certifications.push({ name: expected });
    }
  }

  const experience = generated.experience.map((role) => {
    const identities = roleIdentities(role);
    return {
      ...role,
      bullets: semanticDedupe(
        role.bullets.map(clean).filter((bullet) => bullet && !isRoleIdentityLike(bullet, identities)),
        0.84,
      ),
    };
  });

  const summary = semanticDedupe(splitSummarySentences(generated.summary), 0.86).join(" ");
  const skills = dedupeSkillTerms(generated.skills).slice(0, 24);
  const additionalInformation = semanticDedupe(
    generated.additionalInformation.map(clean).filter((item) => item && !isCredentialEntity(item)),
    0.88,
  );

  return {
    ...generated,
    summary,
    skills,
    certifications,
    experience,
    additionalInformation,
  };
}

function missingCriticalFacts(generated: GeneratedResume, intake: unknown, title: string): string[] {
  const source = canonicalSourceRecord(intake, title);
  const issues: string[] = [];

  if (source.education && !hasSourceEducation(generated, source.education)) {
    issues.push("Verified education or training from the intake is missing from the resume.");
  }

  const contactPairs: Array<[string, string | undefined]> = [
    [source.contact.fullName, generated.basics.fullName],
    [source.contact.email, generated.basics.email],
    [source.contact.phone, generated.basics.phone],
    [source.contact.location, generated.basics.location],
  ];
  if (contactPairs.some(([expected, actual]) => expected && !clean(actual))) {
    issues.push("Verified contact information from the intake is missing from the resume.");
  }

  if (source.roles.length && generated.experience.length < source.roles.length) {
    issues.push("Verified work history from the intake is missing from the resume.");
  }

  return issues;
}

export function hardenResumeCriticalFacts(
  generated: GeneratedResume,
  intake: unknown,
  title: string,
): GeneratedResume {
  const source = canonicalSourceRecord(intake, title);
  let hardened = hardenResumeStructure(generated, intake, title);
  hardened = {
    ...hardened,
    basics: {
      ...hardened.basics,
      fullName: source.contact.fullName || hardened.basics.fullName,
      targetTitle: hardened.basics.targetTitle || source.targetTitle,
      email: source.contact.email || undefined,
      phone: source.contact.phone || undefined,
      location: source.contact.location || undefined,
    },
  };

  if (source.education) {
    const education = sourceEducationItem(source.education);
    if (education && !hasSourceEducation(hardened, source.education)) {
      hardened = { ...hardened, education: [education] };
    }
  }

  return hardened;
}

export function evaluateCriticalResumeGate(
  generated: GeneratedResume,
  intake: unknown,
  title: string,
): CriticalResumeGateResult {
  const source = canonicalSourceRecord(intake, title);
  const hardened = hardenResumeCriticalFacts(generated, intake, title);
  const deterministicIssues = validateResumeAgainstSource(hardened, source)
    .map((issue) => issue.message);
  const criticalIssues = missingCriticalFacts(hardened, intake, title);
  const postStructureIssues = validatePostStructure(hardened).map((issue) => issue.message);
  const score = scoreResume(hardened, source);
  const issues = Array.from(new Set([
    ...deterministicIssues,
    ...criticalIssues,
    ...postStructureIssues,
    ...score.issues,
  ]));

  return {
    ready: criticalIssues.length === 0 && postStructureIssues.length === 0,
    score: score.total,
    issues,
    resume: hardened,
  };
}
