import assert from "node:assert/strict";
import test from "node:test";
import { experienceEvidence, unsupportedNumbers } from "../worker/resume-builder-base";
import type { GeneratedResume } from "../worker/resume-documents";
import {
  datedExperienceMonths,
  hasLeadershipEvidence,
  overlappingRoleDates,
  supportedExperienceYears,
  unsupportedExperienceClaims,
  yearsPhrases,
} from "../worker/resume-experience-claims";
import { roleDateOverlapAdvisories, scoreResume, canonicalSourceRecord } from "../worker/resume-quality";

// Fixed clock so "Present" is deterministic.
const NOW = new Date("2026-11-01T12:00:00Z");

function resume(overrides: Partial<GeneratedResume>): GeneratedResume {
  return {
    basics: { fullName: "Test Customer", targetTitle: "Maintenance Supervisor" },
    summary: "HVAC technician focused on preventive maintenance.",
    skills: ["Brazing"],
    certifications: [],
    experience: [],
    education: [],
    additionalInformation: [],
    ...overrides,
  };
}

// Mirrors the Oct 27 defect. The digit-only guard accepts any number that appears
// anywhere in the uploaded resume text, and "Sep" counts as 9, so "9+ years" passed
// even though these jobs cover about 8 years.
const technicianIntake = {
  career: { yearsExperience: "3–5 years", skillsAndTools: "Brazing, recovery machine" },
  sourceResumeText: [
    "HVAC Technician | Sunrise Mechanical | Sep 2021 - Present",
    "Performed preventive maintenance on rooftop units",
    "HVAC Helper | Cooler Air | Jan 2019 - Dec 2021",
    "Assisted technicians with installs",
  ].join("\n"),
  experience: [
    {
      employer: "Sunrise Mechanical",
      jobTitle: "HVAC Technician",
      startDate: "Sep 2021",
      endDate: "Present",
      responsibilitiesAndWins: "Performed preventive maintenance on rooftop units",
    },
    {
      employer: "Cooler Air",
      jobTitle: "HVAC Helper",
      startDate: "Jan 2019",
      endDate: "Dec 2021",
      responsibilitiesAndWins: "Assisted technicians with installs",
    },
  ],
};

test("years phrases: plain, plus, words, ranges, decades and hedges", () => {
  assert.deepEqual(yearsPhrases("9+ years directing HVAC operations").map((p) => p.years), [9]);
  assert.deepEqual(yearsPhrases("ten years of field service").map((p) => p.years), [10]);
  assert.deepEqual(yearsPhrases("forty-five years in the trade").map((p) => p.years), [45]);
  assert.deepEqual(yearsPhrases("12-plus years in facilities").map((p) => p.years), [12]);
  assert.deepEqual(yearsPhrases("6–10 years of experience").map((p) => p.years), [6]);
  assert.deepEqual(yearsPhrases("over a decade on commercial jobs").map((p) => p.years), [10]);
  assert.deepEqual(yearsPhrases("nearly 10 years").map((p) => p.years), [9]);
  assert.deepEqual(yearsPhrases("Less than 1 year"), []);
});

test("an adjective like 3-year apprenticeship is not a tenure claim", () => {
  assert.deepEqual(yearsPhrases("Completed a 3-year apprenticeship"), []);
});

test("dated roles count once when they overlap and never past the current date", () => {
  const months = datedExperienceMonths([
    { startDate: "Jan 2019", endDate: "Dec 2021" },
    { startDate: "Sep 2021", endDate: "Present" },
  ], NOW);
  // Jan 2019 through Nov 2026 = 94 months, not 35 + 62 counted separately.
  assert.equal(months, 94);
});

test("a role without a readable end date adds no tenure", () => {
  assert.equal(datedExperienceMonths([{ startDate: "2015", endDate: "" }], NOW), 0);
});

test("stated bucket counts its lower bound, not its upper bound", () => {
  assert.equal(supportedExperienceYears({ roles: [], statements: ["6–10 years"] }, NOW), 6);
  assert.equal(supportedExperienceYears({ roles: [], statements: ["11+ years"] }, NOW), 11);
});

test("regression: a September date or a year ending in 9 no longer authorizes 9+ years", () => {
  const generated = resume({ summary: "HVAC technician with 9+ years of commercial service." });
  const flags = unsupportedNumbers(generated, technicianIntake, "Maintenance Supervisor", null, NOW);
  assert.deepEqual(flags, [{ section: "career summary", token: "experience years: 9+ years" }]);
});

test("dated roles that cover the claim allow it", () => {
  // Sep 2017 - Present is just over 9 years by Nov 2026, and "Sep" supplies the digit.
  const generated = resume({ summary: "HVAC technician with 9 years of commercial service." });
  const intake = { sourceResumeText: "HVAC Technician | Sunrise Mechanical | Sep 2017 - Present\nRooftop unit service" };
  assert.deepEqual(unsupportedNumbers(generated, intake, "", null, NOW), []);
});

test("the customer's own stated years allow the claim", () => {
  const generated = resume({ summary: "Maintenance technician with 12 years of experience." });
  const intake = { career: { summaryNotes: "I have 12 years of experience in building maintenance." } };
  assert.deepEqual(unsupportedNumbers(generated, intake, "", null, NOW), []);
});

test("a target supervisor title is not leadership evidence", () => {
  const generated = resume({ summary: "HVAC technician who supervised crews on rooftop work." });
  const flags = unsupportedNumbers(generated, technicianIntake, "Maintenance Supervisor", null, NOW);
  assert.deepEqual(flags, [{ section: "career summary", token: "leadership: supervised" }]);
});

test("directing operations without leadership evidence is flagged in bullets", () => {
  const generated = resume({
    experience: [{
      jobTitle: "HVAC Technician",
      employer: "Sunrise Mechanical",
      bullets: ["Directed daily maintenance operations for the building"],
    }],
  });
  const flags = unsupportedNumbers(generated, technicianIntake, "", null, NOW);
  assert.ok(flags.some((flag) => flag.section === "work history" && flag.token.startsWith("leadership:")));
});

test("HVAC terms with direct, lead and supervision are not leadership claims", () => {
  const text = "Serviced direct-drive blowers and direct expansion systems; replaced test leads; worked under supervision of a licensed technician.";
  assert.deepEqual(unsupportedExperienceClaims(text, { roles: [], statements: [] }, NOW), []);
});

test("a leadership job title, leadership note, or own wording is evidence", () => {
  assert.equal(hasLeadershipEvidence({ roles: [{ jobTitle: "Lead HVAC Technician" }], statements: [] }), true);
  assert.equal(hasLeadershipEvidence({ roles: [], statements: [], leadershipNotes: ["Ran a two-person crew"] }), true);
  assert.equal(hasLeadershipEvidence({ roles: [], statements: ["Supervised two apprentices on installs"] }), true);
  assert.equal(hasLeadershipEvidence({ roles: [], statements: ["Used lead-free solder and test leads"] }), false);
});

test("supported leadership passes through the generator guard", () => {
  const intake = {
    ...technicianIntake,
    experience: [{ ...technicianIntake.experience[0], jobTitle: "Lead HVAC Technician", leadership: "Led a three-person crew" }],
  };
  const generated = resume({ summary: "Lead HVAC technician who supervised crews on rooftop work." });
  assert.deepEqual(unsupportedNumbers(generated, intake, "", null, NOW), []);
});

test("combined intake dates and uploaded-resume dates count as tenure evidence", () => {
  const combined = experienceEvidence({
    experience: [{ jobTitle: "Facilities Technician", dates: "Aug 2018 - Present", responsibilitiesAndWins: "Building maintenance" }],
  });
  assert.equal(supportedExperienceYears(combined, NOW), 8);

  const generated = resume({ summary: "Facilities technician with 8 years of experience." });
  // "Aug" supplies the digit 8 that the digit-only guard also requires.
  const uploadOnly = { sourceResumeText: "Facilities Technician\nAcme Properties | Aug 2018 - Present\nBuilding maintenance" };
  assert.deepEqual(unsupportedNumbers(generated, uploadOnly, "", null, NOW), []);
});

test("overlapping job dates are reported, adjacent ones are not", () => {
  assert.deepEqual(overlappingRoleDates([
    { startDate: "Jan 2019", endDate: "Dec 2021" },
    { startDate: "Sep 2021", endDate: "Present" },
  ], NOW), [{ first: 0, second: 1 }]);
  assert.deepEqual(overlappingRoleDates([
    { startDate: "Jan 2019", endDate: "Jan 2021" },
    { startDate: "Jan 2021", endDate: "Present" },
  ], NOW), []);
});

test("overlap advisory reaches the quality score without changing the score", () => {
  const experience = [
    { jobTitle: "HVAC Technician", employer: "Sunrise Mechanical", startDate: "Sep 2021", endDate: "Present", bullets: ["Performed preventive maintenance on rooftop units"] },
    { jobTitle: "HVAC Helper", employer: "Cooler Air", startDate: "Jan 2019", endDate: "Dec 2021", bullets: ["Assisted technicians with installs"] },
  ];
  const advisories = roleDateOverlapAdvisories(experience);
  assert.equal(advisories.length, 1);
  assert.match(advisories[0], /Sunrise Mechanical and Cooler Air overlap/);

  const generated = resume({ experience });
  const source = canonicalSourceRecord(technicianIntake, "Maintenance Supervisor");
  const withOverlap = scoreResume(generated, source);
  assert.ok(withOverlap.issues.some((issue) => issue.includes("overlap")));
  // Dates match the customer's intake, so chronology is not scored down for overlapping.
  assert.equal(withOverlap.dimensions.chronologyIntegrity, 100);
});

test("cover letter: a job posting's years requirement is not the customer's experience", async () => {
  const { unsupportedCoverLetterClaims } = await import("../worker/cover-letter");
  const verifiedResume = resume({
    summary: "HVAC technician focused on preventive maintenance.",
    experience: [{ jobTitle: "HVAC Technician", employer: "Sunrise Mechanical", startDate: "Sep 2021", endDate: "Present", bullets: ["Serviced rooftop units"] }],
  });
  const supportedSource = JSON.stringify({ verifiedResume, targetJobContext: { jobDescription: "Requires 9+ years and experience supervising crews." } });
  const claims = unsupportedCoverLetterClaims("I bring 9+ years of experience and have supervised crews.", supportedSource, NOW);
  assert.deepEqual(claims.map((claim) => claim.kind).sort(), ["leadership", "years"]);
  assert.deepEqual(unsupportedCoverLetterClaims("I bring 5 years of hands-on HVAC service.", supportedSource, NOW), []);
});
