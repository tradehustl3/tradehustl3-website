import assert from "node:assert/strict";
import test from "node:test";
import {
  unsupportedNumbers,
  validateGeneratedResume,
} from "../worker/resume-builder";
import type { GeneratedResume } from "../worker/resume-documents";

const entryLevelResume: GeneratedResume = {
  basics: { fullName: "Devon Price", targetTitle: "HVAC Apprentice" },
  summary: "Trade-school graduate with lab training and a strong safety mindset.",
  skills: ["Brazing", "Multimeter"],
  certifications: [{ name: "OSHA 10" }],
  experience: [],
  education: [{ credential: "HVAC Certificate", institution: "Akron Career Center" }],
  additionalInformation: [],
};

test("entry-level output can pass without employment history", () => {
  const result = validateGeneratedResume(entryLevelResume);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.resume.experience, []);
});

test("self-employed experience passes without a named employer", () => {
  const result = validateGeneratedResume({
    ...entryLevelResume,
    certifications: [],
    education: [],
    experience: [{
      jobTitle: "Self-Employed Handyman",
      bullets: ["Completed residential drywall and fixture repairs for local homeowners"],
    }],
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.resume.experience[0].employer, undefined);
});

test("an experience item still needs a title and a substantive bullet", () => {
  const result = validateGeneratedResume({
    ...entryLevelResume,
    certifications: [],
    education: [],
    experience: [{ employer: "Apex Mechanical", jobTitle: "Helper", bullets: [] }],
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.missing.includes("work history, training, certifications, or skills"));
});

test("empty output reports fixed intake section labels", () => {
  const result = validateGeneratedResume({
    basics: {}, summary: "", skills: [], certifications: [], experience: [], education: [], additionalInformation: [],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(result.missing, [
      "contact information",
      "target job title",
      "career summary",
      "work history, training, certifications, or skills",
    ]);
  }
});

test("summary plus a skills list alone remains too thin", () => {
  const result = validateGeneratedResume({
    ...entryLevelResume,
    certifications: [],
    education: [],
  });
  assert.equal(result.ok, false);
});

test("skills plus substantive additional information can pass", () => {
  const result = validateGeneratedResume({
    ...entryLevelResume,
    certifications: [],
    education: [],
    additionalInformation: ["Completed a non-union pre-apprenticeship program"],
  });
  assert.equal(result.ok, true);
});

test("OSHA ten authorizes OSHA 10 inside certifications", () => {
  const flags = unsupportedNumbers(entryLevelResume, {
    career: { licensesAndCertifications: "OSHA ten" },
    education: "Akron Career Center HVAC Certificate",
  });
  assert.deepEqual(flags, []);
});

test("a certification number cannot authorize an experience claim", () => {
  const resume = { ...entryLevelResume, summary: "HVAC apprentice with 10 years of experience." };
  const flags = unsupportedNumbers(resume, {
    career: { licensesAndCertifications: "OSHA ten" },
    education: "Akron Career Center HVAC Certificate",
  });
  assert.deepEqual(flags, [{ section: "career summary", token: "10" }]);
});

test("06/23 and June 2023 normalize within the work-date section", () => {
  const resume: GeneratedResume = {
    ...entryLevelResume,
    certifications: [],
    education: [],
    experience: [{
      jobTitle: "Maintenance Helper",
      employer: "Apex Mechanical",
      startDate: "June 2023",
      bullets: ["Assisted with preventive maintenance"],
    }],
  };
  const flags = unsupportedNumbers(resume, {
    career: { skillsAndTools: "Brazing, multimeter" },
    experience: [{ employer: "Apex Mechanical", jobTitle: "Maintenance Helper", dates: "06/23", responsibilitiesAndWins: "Assisted with preventive maintenance" }],
  });
  assert.deepEqual(flags, []);
});

test("a date month cannot authorize years-of-experience inflation", () => {
  const resume = { ...entryLevelResume, summary: "HVAC apprentice with 6 years of experience." };
  const flags = unsupportedNumbers(resume, {
    career: { licensesAndCertifications: "OSHA ten" },
    education: "Akron Career Center HVAC Certificate",
    experience: [{ dates: "06/23" }],
  });
  assert.deepEqual(flags, [{ section: "career summary", token: "6" }]);
});

test("apostrophe years and four-digit years normalize within work dates", () => {
  const resume: GeneratedResume = {
    ...entryLevelResume,
    certifications: [],
    education: [],
    experience: [{
      jobTitle: "Maintenance Helper",
      startDate: "2025",
      bullets: ["Assisted with preventive maintenance"],
    }],
  };
  const flags = unsupportedNumbers(resume, {
    career: { skillsAndTools: "Brazing, multimeter" },
    experience: [{ jobTitle: "Maintenance Helper", dates: "'25", responsibilitiesAndWins: "Assisted with preventive maintenance" }],
  });
  assert.deepEqual(flags, []);
});

test("full time does not authorize a fabricated 40-hour claim", () => {
  const resume: GeneratedResume = {
    ...entryLevelResume,
    certifications: [],
    education: [],
    experience: [{
      jobTitle: "Maintenance Helper",
      bullets: ["Worked 40 hours each week on preventive maintenance"],
    }],
  };
  const flags = unsupportedNumbers(resume, {
    career: { skillsAndTools: "Brazing, multimeter" },
    experience: [{ jobTitle: "Maintenance Helper", responsibilitiesAndWins: "Worked full time on preventive maintenance" }],
  });
  assert.deepEqual(flags, [{ section: "work history", token: "40" }]);
});

test("a customer correction can explicitly support a corrected number", () => {
  const resume: GeneratedResume = {
    ...entryLevelResume,
    certifications: [],
    education: [],
    experience: [{
      jobTitle: "Maintenance Helper",
      endDate: "June 2025",
      bullets: ["Assisted with preventive maintenance"],
    }],
  };
  const flags = unsupportedNumbers(
    resume,
    { career: { skillsAndTools: "Brazing, multimeter" }, experience: [{ jobTitle: "Maintenance Helper", responsibilitiesAndWins: "Assisted with preventive maintenance" }] },
    "HVAC Apprentice",
    "Change my end date to June 2025",
  );
  assert.deepEqual(flags, []);
});
