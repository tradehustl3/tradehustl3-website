export type AtsGrade = "A" | "B" | "C" | "D" | "F";

export type AtsScore = {
  score: number;
  grade: AtsGrade;
  label: string;
  strengths: string[];
  improvements: string[];
};

type ScoreInput = {
  intake: unknown;
  trade: string;
  title: string;
  targetJobPosting?: string | null;
};

type ResumeTheme = "plain" | "navy";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringList(value: unknown): string[] {
  return list(value).map(text).filter(Boolean);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function grade(score: number): AtsGrade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function labelFor(score: number): string {
  if (score >= 90) return "Excellent ATS readiness";
  if (score >= 80) return "Strong ATS readiness";
  if (score >= 70) return "Good foundation — strengthen a few areas";
  if (score >= 60) return "Usable foundation — more detail will help";
  return "Needs more verified information before applying";
}

function keywordTokens(value: string): Set<string> {
  const stop = new Set([
    "and", "the", "for", "with", "that", "this", "from", "your", "you", "are", "our", "will",
    "have", "has", "job", "work", "role", "team", "years", "year", "skills", "skill", "experience",
    "required", "preferred", "responsibilities", "including", "using", "into", "their", "they", "who",
    "a", "an", "to", "of", "in", "on", "at", "is", "be", "or", "as", "by", "we", "it",
  ]);
  return new Set(
    value.toLowerCase()
      .replace(/[^a-z0-9+#./-]+/g, " ")
      .split(/\s+/)
      .map((item) => item.replace(/^[./-]+|[./-]+$/g, ""))
      .filter((item) => item.length >= 3 && !stop.has(item)),
  );
}

function intakeFacts(input: ScoreInput) {
  const root = record(input.intake);
  const contact = record(root.contact);
  const career = record(root.career);
  const fieldValue = record(root.fieldValue);
  const target = record(root.targetJob);
  const roles = list(root.experience).map(record);

  const certifications = stringList(fieldValue.certifications);
  const tools = stringList(fieldValue.tools);
  const equipment = stringList(fieldValue.equipmentSystems);
  const technicalSkills = stringList(fieldValue.technicalSkills);
  const software = stringList(fieldValue.software);
  const safety = stringList(fieldValue.safety);
  const licenses = text(fieldValue.licenses) || text(career.licensesAndCertifications);
  const summary = text(career.summaryNotes);
  const education = text(root.education);
  const targetTitle = text(target.title) || input.title;
  const posting = text(input.targetJobPosting);

  const roleText = roles.map((role) => [
    text(role.jobTitle), text(role.employer), text(role.location), text(role.dates),
    text(role.responsibilities), text(role.responsibilitiesAndWins), text(role.equipment),
    text(role.systems), text(role.workPerformed), text(role.leadership), text(role.workOrders),
    text(role.measurable),
  ].filter(Boolean).join(" ")).join(" ");

  const candidateText = [
    input.trade, targetTitle, summary, roleText, certifications.join(" "), licenses,
    tools.join(" "), equipment.join(" "), technicalSkills.join(" "), software.join(" "),
    safety.join(" "), education,
  ].join(" ");

  const candidateTokens = keywordTokens(candidateText);
  const postingTokens = keywordTokens(posting);
  let keywordMatch = 0;
  if (postingTokens.size > 0) {
    let matched = 0;
    postingTokens.forEach((token) => {
      if (candidateTokens.has(token)) matched += 1;
    });
    keywordMatch = matched / postingTokens.size;
  }

  return {
    root,
    contact,
    career,
    roles,
    certifications,
    tools,
    equipment,
    technicalSkills,
    software,
    safety,
    licenses,
    summary,
    education,
    targetTitle,
    posting,
    keywordMatch,
  };
}

export function scoreAtsReadiness(input: ScoreInput): AtsScore {
  const facts = intakeFacts(input);
  let score = 0;
  const strengths: string[] = [];
  const improvements: string[] = [];

  const contactComplete = Boolean(text(facts.contact.fullName) && text(facts.contact.phone) && text(facts.contact.cityState));
  score += contactComplete ? 10 : 5;
  if (contactComplete) strengths.push("Core contact information is complete.");
  else improvements.push("Complete name, phone, and city/state so employers can identify and contact you.");

  if (input.trade && facts.targetTitle) {
    score += 10;
    strengths.push("A specific trade and target job title are defined.");
  } else {
    score += 4;
    improvements.push("Choose a specific trade and target title instead of building a generic resume.");
  }

  if (facts.summary.length >= 80) {
    score += 10;
    strengths.push("Your employer-facing summary notes provide useful source material.");
  } else if (facts.summary) {
    score += 6;
    improvements.push("Add more specific detail about the work you handle and the value you bring.");
  } else {
    improvements.push("Add a short factual summary of your strongest trade experience.");
  }

  const substantiveRoles = facts.roles.filter((role) => {
    const details = [text(role.responsibilities), text(role.responsibilitiesAndWins), text(role.workPerformed), text(role.measurable)].join(" ");
    return Boolean(text(role.jobTitle) || text(role.employer) || details);
  });
  if (substantiveRoles.length >= 2) {
    score += 18;
    strengths.push(`${substantiveRoles.length} work-history entries give HUSTL3 BOT strong experience evidence.`);
  } else if (substantiveRoles.length === 1) {
    score += 12;
    improvements.push("One role is usable; add earlier relevant work, side work, apprenticeship, or project experience if applicable.");
  } else {
    score += 5;
    improvements.push("Add verified work, apprenticeship, school-lab, volunteer, military, or side-work experience where applicable.");
  }

  const roleWithDates = substantiveRoles.filter((role) => text(role.dates) || text(role.startDate)).length;
  if (substantiveRoles.length === 0 || roleWithDates === substantiveRoles.length) {
    score += 8;
    if (substantiveRoles.length) strengths.push("Work-history dates are present for the roles supplied.");
  } else {
    score += 4;
    improvements.push("Add dates to each experience entry so ATS systems and recruiters can follow your timeline.");
  }

  const skillCount = facts.tools.length + facts.equipment.length + facts.technicalSkills.length + facts.software.length;
  if (skillCount >= 8) {
    score += 14;
    strengths.push("Your trade-specific tools, systems, software, and technical skills are well represented.");
  } else if (skillCount >= 4) {
    score += 9;
    improvements.push("Add a few more verified trade-specific tools, systems, or technical skills.");
  } else {
    score += 3;
    improvements.push("Add the tools, systems, equipment, software, and technical skills you can actually back up.");
  }

  if (facts.certifications.length || facts.licenses || facts.safety.length) {
    score += 10;
    strengths.push("Credentials and/or safety training are available for ATS keyword matching.");
  } else {
    score += 3;
    improvements.push("Add verified certifications, licenses, or safety training if you have them.");
  }

  const measurableRoles = substantiveRoles.filter((role) => /\d/.test(text(role.measurable))).length;
  if (measurableRoles >= 2) {
    score += 10;
    strengths.push("Multiple roles include measurable results or scope.");
  } else if (measurableRoles === 1) {
    score += 6;
    improvements.push("Add more truthful numbers where you know them: units, work orders, properties, techs, PMs, projects, uptime, or similar scope.");
  } else {
    score += 2;
    improvements.push("Add measurable results or scope only where you can verify the numbers.");
  }

  if (facts.posting.length >= 250) {
    if (facts.keywordMatch >= 0.28) {
      score += 10;
      strengths.push("Your verified experience already overlaps well with the target posting language.");
    } else if (facts.keywordMatch >= 0.14) {
      score += 7;
      improvements.push("The job posting is loaded; add any missing requirements you truly have so HUSTL3 BOT can match them accurately.");
    } else {
      score += 4;
      improvements.push("The posting and your supplied facts have limited keyword overlap. Add relevant experience only if it is true.");
    }
  } else {
    score += 3;
    improvements.push("Paste the full job description for a stronger job-match score.");
  }

  return {
    score: clamp(score),
    grade: grade(clamp(score)),
    label: labelFor(clamp(score)),
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 4),
  };
}

export function scoreCompletedResume(input: ScoreInput & { theme: ResumeTheme; hasPreview: boolean }): AtsScore {
  const readiness = scoreAtsReadiness(input);
  if (!input.hasPreview) return readiness;

  // HUSTL3 BOT uses a known ATS-safe section structure and selectable text.
  // The completed score therefore keeps the factual-content score as the base,
  // then rewards the generated structure without pretending to know a specific
  // employer's private ATS algorithm.
  let score = Math.min(100, readiness.score + 8);
  const strengths = [...readiness.strengths];
  const improvements = [...readiness.improvements];

  strengths.unshift(
    input.theme === "plain"
      ? "Plain ATS-safe template uses simple selectable text and no decorative background."
      : "Styled template keeps selectable resume text while using a restrained header treatment.",
  );
  strengths.unshift("HUSTL3 BOT organized the resume into standard ATS-readable sections.");

  if (readiness.score < 80) {
    improvements.unshift("The resume structure is ATS-safe, but stronger verified source information can still improve the grade.");
  }

  score = clamp(score);
  return {
    score,
    grade: grade(score),
    label: score >= 90 ? "Strong finished ATS profile" : labelFor(score),
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 4),
  };
}
