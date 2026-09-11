export type ResumeSourceSection =
  | "header"
  | "summary"
  | "credentials"
  | "skills"
  | "experience"
  | "education"
  | "training"
  | "additional"
  | "unclassified";

export type ClassifiedResumeLine = {
  lineNumber: number;
  value: string;
  section: ResumeSourceSection;
  kind: "heading" | "role_header" | "education" | "credential" | "skill" | "summary" | "unclassified";
  activeSection: ResumeSourceSection;
};

export type ResumeSectionClassification = {
  lines: ClassifiedResumeLine[];
  sections: Record<ResumeSourceSection, ClassifiedResumeLine[]>;
  credentialEntities: string[];
  skillEntities: string[];
};

const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DATE = `(?:${MONTH}\\s+)?(?:19|20)\\d{2}`;
const DATE_RANGE_RE = new RegExp(`\\b${DATE}\\s*(?:-|to|through|thru)\\s*(?:${DATE}|present|current|now)\\b`, "i");

const HEADING_RULES: Array<[RegExp, ResumeSourceSection]> = [
  [/^(?:professional\s+summary|summary|profile|professional\s+profile|career\s+summary|objective)$/i, "summary"],
  [/^(?:certifications?(?:\s*(?:&|and)\s*licenses?)?|licenses?|credentials)$/i, "credentials"],
  [/^(?:core\s+skills|technical\s+skills(?:\s*(?:&|and)\s*tools?)?|skills(?:\s*(?:&|and)\s*tools?)?|tools|software(?:\s*\/\s*cmms|\s*(?:&|and)\s*cmms)?|cmms)$/i, "skills"],
  [/^(?:professional\s+experience|work\s+experience|employment\s+history|work\s+history|experience)$/i, "experience"],
  [/^(?:education(?:\s*(?:&|and)\s*(?:technical\s+)?training)?|technical\s+education|education\s*&\s*training)$/i, "education"],
  [/^(?:safety\s+training|training|professional\s+training)$/i, "training"],
  [/^(?:additional\s+information|additional\s+details)$/i, "additional"],
];

const TITLE_SIGNAL_RE = /\b(?:technician|supervisor|manager|mechanic|engineer|specialist|foreperson|foreman|lead|director|electrician|plumber|carpenter|welder|installer|operator|maintenance|hvac|refrigeration)\b/i;
const INSTITUTION_RE = /\b(?:university|college|technical\s+school|trade\s+school|high\s+school|institute|academy)\b/i;
const EDUCATION_CREDENTIAL_RE = /\b(?:diploma|associate(?:'s)?(?:\s+degree)?|bachelor(?:'s)?(?:\s+degree)?|master(?:'s)?(?:\s+degree)?|degree|certificate|certification|program)\b/i;
const CREDENTIAL_SIGNAL_RE = /\b(?:epa\s*(?:section\s*)?608(?:\s+universal)?|osha\s*(?:10|30)|nccer|journeyman|master\s+(?:electrician|plumber)|certification|certificate|license)\b/i;
const CREDENTIAL_NARRATIVE_RE = /\b(?:professional|experience|experienced|years?|performed|managed|maintained|responsible|skilled|proficient|specializing|expertise|with\s+experience)\b/i;
const PROMPT_LIKE_RE = /\b(?:ignore|disregard)\b.{0,120}\b(?:instructions?|prompt|invent|fabricate|pretend)\b|\b(?:invent|fabricate)\b.{0,80}\b(?:license|certification|credential|employer|job|date)\b/i;
const CREDENTIAL_SEPARATOR_RE = /\s*(?:\||•|▪|◦|●|;)\s*|\s+\/\s+/;

function cleanLine(value: string): string {
  return value.replace(/[\t ]+/g, " ").replace(/^\s*[•▪◦●*-]\s*/, "").trim();
}

export function normalizeResumeValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2012-\u2015]/g, "-")
    .replace(/&/g, " and ")
    .replace(/\bpreventative\b/g, "preventive")
    .replace(/\ba\s*\/\s*c\b/g, "air conditioning")
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function headingSection(value: string): ResumeSourceSection | null {
  const cleaned = cleanLine(value).replace(/:$/, "").trim();
  for (const [pattern, section] of HEADING_RULES) {
    if (pattern.test(cleaned)) return section;
  }
  return null;
}

function wordCount(value: string): number {
  return normalizeResumeValue(value).split(" ").filter(Boolean).length;
}

function splitCredentialLine(value: string): string[] {
  return cleanLine(value)
    .split(CREDENTIAL_SEPARATOR_RE)
    .map((part) => cleanLine(part))
    .filter(Boolean);
}

export function isCredentialEntity(value: string): boolean {
  const cleaned = cleanLine(value);
  if (!cleaned || headingSection(cleaned) || PROMPT_LIKE_RE.test(cleaned)) return false;
  if (splitCredentialLine(cleaned).length > 1) return false;
  if (!CREDENTIAL_SIGNAL_RE.test(cleaned)) return false;
  if (wordCount(cleaned) > 12) return false;
  if (/[.!?]$/.test(cleaned) && wordCount(cleaned) > 7) return false;
  if (CREDENTIAL_NARRATIVE_RE.test(cleaned)) return false;
  return true;
}

function credentialEntitiesInLine(value: string): string[] {
  return splitCredentialLine(value).filter((part) => isCredentialEntity(part));
}

function credentialCanonicalName(value: string): string {
  const cleaned = cleanLine(value);
  if (/\bepa\s*(?:section\s*)?608\b/i.test(cleaned)) {
    return /\buniversal\b/i.test(cleaned) ? "EPA 608 Universal Certification" : "EPA 608 Certification";
  }
  const osha = cleaned.match(/\bosha\s*(10|30)\b/i);
  if (osha) return `OSHA ${osha[1]}`;
  if (/\bhvac\s+technical\s+certificat(?:e|ion)\b/i.test(cleaned)) return "HVAC Technical Certificate";
  return cleaned.replace(/[.;:,]+$/, "").trim();
}

function isEducationLine(value: string, activeSection: ResumeSourceSection): boolean {
  const cleaned = cleanLine(value);
  if (!cleaned || DATE_RANGE_RE.test(cleaned)) return false;
  if (activeSection === "education") return INSTITUTION_RE.test(cleaned) || EDUCATION_CREDENTIAL_RE.test(cleaned) || /^[A-Za-z .'-]+,\s*[A-Z]{2}$/.test(cleaned);
  return INSTITUTION_RE.test(cleaned) && EDUCATION_CREDENTIAL_RE.test(cleaned);
}

function splitSkillLine(value: string): string[] {
  const cleaned = cleanLine(value).replace(/^[^:]{1,36}:\s*/, "");
  return cleaned
    .split(/\s*[|•▪◦●;]\s*|\s{2,}|,(?=\s*[A-Za-z])/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && item.length <= 80);
}

function looksLikeSkillLine(value: string, activeSection: ResumeSourceSection): boolean {
  const cleaned = cleanLine(value);
  if (!cleaned || credentialEntitiesInLine(cleaned).length > 0 || DATE_RANGE_RE.test(cleaned)) return false;
  const parts = splitSkillLine(cleaned);
  if (activeSection === "skills") return parts.length >= 1 && !/[.!?]$/.test(cleaned);
  return parts.length >= 3 && !/[.!?]$/.test(cleaned) && wordCount(cleaned) <= 24;
}

function skillKey(value: string): string {
  let key = normalizeResumeValue(value)
    .replace(/^core\s+/, "")
    .replace(/^technical\s+/, "");
  if (/^(?:pm|preventive maintenance|preventive maintenance programs?)$/.test(key)) key = "preventive maintenance";
  if (/^(?:hvac diagnostics?|hvac troubleshooting)$/.test(key)) key = "hvac diagnostics";
  if (/^(?:heat pumps?|heat pump systems?)$/.test(key)) key = "heat pumps";
  if (/^(?:air conditioners?|air conditioning systems?|ac systems?)$/.test(key)) key = "air conditioning";
  if (/^(?:work orders?|work order management)$/.test(key)) key = "work order management";
  return key;
}

export function dedupeSkillTerms(values: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const raw of values) {
    for (const part of splitSkillLine(raw)) {
      const key = skillKey(part);
      if (!key || key.length < 2) continue;
      if (!byKey.has(key)) byKey.set(key, cleanLine(part));
    }
  }
  return Array.from(byKey.values());
}

function roleHeaderIndexes(lines: string[]): Set<number> {
  const indexes = new Set<number>();
  for (let index = 0; index < lines.length; index += 1) {
    if (!DATE_RANGE_RE.test(cleanLine(lines[index]))) continue;
    indexes.add(index);
    let captured = 0;
    for (let cursor = index - 1; cursor >= 0 && captured < 3; cursor -= 1) {
      const previous = cleanLine(lines[cursor]);
      if (!previous) continue;
      if (headingSection(previous) || DATE_RANGE_RE.test(previous) || /[.!?]$/.test(previous)) break;
      indexes.add(cursor);
      captured += 1;
      if (TITLE_SIGNAL_RE.test(previous)) continue;
      if (/[|—–]/.test(previous)) break;
    }
  }
  return indexes;
}

function emptySections(): Record<ResumeSourceSection, ClassifiedResumeLine[]> {
  return {
    header: [],
    summary: [],
    credentials: [],
    skills: [],
    experience: [],
    education: [],
    training: [],
    additional: [],
    unclassified: [],
  };
}

export function classifyResumeSections(source: string): ResumeSectionClassification {
  const rawLines = source.replace(/\r\n?/g, "\n").split("\n");
  const headerIndexes = roleHeaderIndexes(rawLines);
  const classified: ClassifiedResumeLine[] = [];
  const sections = emptySections();
  const credentials: string[] = [];
  const skillValues: string[] = [];
  let activeSection: ResumeSourceSection = "header";

  for (let index = 0; index < rawLines.length; index += 1) {
    const value = cleanLine(rawLines[index]);
    if (!value) continue;

    const heading = headingSection(value);
    if (heading) {
      activeSection = heading;
      const item: ClassifiedResumeLine = {
        lineNumber: index + 1,
        value,
        section: heading,
        kind: "heading",
        activeSection: heading,
      };
      classified.push(item);
      sections[heading].push(item);
      continue;
    }

    const credentialParts = credentialEntitiesInLine(value);
    let kind: ClassifiedResumeLine["kind"] = "unclassified";
    let section: ResumeSourceSection = "unclassified";

    // Exact precedence: role header > education > credential > skill > summary > unclassified.
    if (headerIndexes.has(index)) {
      kind = "role_header";
      section = "experience";
    } else if (isEducationLine(value, activeSection)) {
      kind = "education";
      section = "education";
    } else if (credentialParts.length > 0) {
      kind = "credential";
      section = "credentials";
    } else if (looksLikeSkillLine(value, activeSection)) {
      kind = "skill";
      section = "skills";
    } else if (activeSection === "summary" || (activeSection === "header" && /[.!?]$/.test(value))) {
      kind = "summary";
      section = "summary";
    } else if (activeSection !== "header") {
      section = activeSection;
      kind = activeSection === "experience" ? "unclassified" : activeSection === "additional" ? "unclassified" : "summary";
    }

    const item: ClassifiedResumeLine = {
      lineNumber: index + 1,
      value,
      section,
      kind,
      activeSection,
    };
    classified.push(item);
    sections[section].push(item);

    // Split combined credential rows before canonicalization. This prevents a
    // row such as "EPA 608 | OSHA 10 | HVAC Technical Certificate" from being
    // collapsed into the first credential only.
    for (const credential of credentialParts) credentials.push(credentialCanonicalName(credential));
    if (kind === "skill") skillValues.push(...splitSkillLine(value));
  }

  return {
    lines: classified,
    sections,
    credentialEntities: Array.from(new Map(credentials.map((value) => [normalizeResumeValue(value), value])).values()),
    skillEntities: dedupeSkillTerms(skillValues),
  };
}

export function isRoleIdentityLike(value: string, identities: string[]): boolean {
  const candidate = normalizeResumeValue(value);
  if (!candidate) return false;
  return identities.some((identity) => {
    const key = normalizeResumeValue(identity);
    return Boolean(key && (candidate === key || candidate === `${key} present`));
  });
}

export function semanticDedupe(values: string[], threshold = 0.82): string[] {
  const kept: string[] = [];
  const tokens = (value: string) => new Set(normalizeResumeValue(value).split(" ").filter((word) => word.length > 2));
  const similarity = (left: string, right: string) => {
    const a = tokens(left);
    const b = tokens(right);
    if (!a.size || !b.size) return normalizeResumeValue(left) === normalizeResumeValue(right) ? 1 : 0;
    let shared = 0;
    for (const token of a) if (b.has(token)) shared += 1;
    return shared / Math.max(a.size, b.size);
  };
  for (const value of values.map(cleanLine).filter(Boolean)) {
    if (kept.some((current) => similarity(current, value) >= threshold)) continue;
    kept.push(value);
  }
  return kept;
}
