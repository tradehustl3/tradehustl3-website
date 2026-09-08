import type { GeneratedResume, ResumeEducation } from "./resume-documents";
import {
  canonicalSourceRecord,
  scoreResume,
  validateResumeAgainstSource,
} from "./resume-quality";

export type CriticalResumeGateResult = {
  ready: boolean;
  score: number;
  issues: string[];
  resume: GeneratedResume;
};

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalize(value: string): string {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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

  // Resume renderers often reverse "school — credential" into
  // "credential — school". Treat the same factual tokens as equivalent while
  // still rejecting a different school, degree, year, or credential.
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
  let hardened: GeneratedResume = {
    ...generated,
    basics: {
      ...generated.basics,
      fullName: generated.basics.fullName || source.contact.fullName,
      targetTitle: generated.basics.targetTitle || source.targetTitle,
      email: generated.basics.email || source.contact.email || undefined,
      phone: generated.basics.phone || source.contact.phone || undefined,
      location: generated.basics.location || source.contact.location || undefined,
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
  const score = scoreResume(hardened, source);
  const issues = Array.from(new Set([...deterministicIssues, ...criticalIssues, ...score.issues]));

  // The base generation pipeline already enforces unsupported claims, missing
  // source duties, credentials, and correction safety before files are written.
  // This additional gate exists to prevent critical source facts from vanishing
  // from the customer-facing package. User-approved corrections (for example a
  // corrected end date) must not be invalidated by comparing them to the older
  // intake snapshot during this post-generation pass.
  return {
    ready: criticalIssues.length === 0,
    score: score.total,
    issues,
    resume: hardened,
  };
}
