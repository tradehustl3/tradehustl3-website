import assert from "node:assert/strict";
import test from "node:test";
import { scoreAtsReadiness, scoreCompletedResume } from "../app/resume-builder/ats-score";

const strongIntake = {
  contact: { fullName: "Jordan Tech", phone: "404-555-0100", cityState: "Atlanta, GA" },
  career: {
    summaryNotes: "Commercial HVAC technician experienced with rooftop units, heat pumps, preventive maintenance, electrical troubleshooting, and documented service work.",
  },
  fieldValue: {
    certifications: ["EPA 608 Universal", "OSHA 10"],
    licenses: "",
    tools: ["Multimeter", "Manifold gauges", "Vacuum pump"],
    equipmentSystems: ["Rooftop units", "Heat pumps", "Split systems"],
    technicalSkills: ["Electrical troubleshooting", "Refrigerant diagnostics", "Preventive maintenance"],
    software: ["Salesforce"],
    safety: ["Lockout/tagout"],
  },
  experience: [
    {
      employer: "Apex Mechanical",
      jobTitle: "HVAC Technician",
      dates: "2022 – Present",
      responsibilities: "Diagnose and repair commercial HVAC systems and complete preventive maintenance.",
      measurable: "Completed 25 preventive maintenance work orders weekly.",
    },
    {
      employer: "Metro Facilities",
      jobTitle: "Maintenance Technician",
      dates: "2019 – 2022",
      responsibilities: "Maintained split systems and electrical controls across occupied facilities.",
      measurable: "Supported 12 buildings.",
    },
  ],
  education: "HVAC Technical Certificate",
  targetJob: { title: "Commercial HVAC Technician" },
};

const posting = `Commercial HVAC Technician needed to troubleshoot rooftop units, heat pumps, electrical controls,
perform preventive maintenance, document work orders, and use multimeters and refrigerant gauges. EPA 608 required.`;

test("strong verified intake receives a high readiness score", () => {
  const result = scoreAtsReadiness({
    intake: strongIntake,
    trade: "HVAC & Refrigeration",
    title: "Commercial HVAC Technician",
    targetJobPosting: posting,
  });
  assert.ok(result.score >= 80);
  assert.ok(["A", "B"].includes(result.grade));
  assert.ok(result.strengths.length > 0);
});

test("sparse intake explains what should be improved", () => {
  const result = scoreAtsReadiness({
    intake: { contact: { fullName: "Jordan Tech" }, career: {}, fieldValue: {}, experience: [], targetJob: {} },
    trade: "HVAC & Refrigeration",
    title: "HVAC Technician",
  });
  assert.ok(result.score < 70);
  assert.ok(result.improvements.some((item) => /job description|tools|experience|contact/i.test(item)));
});

test("finished ATS-safe resume gets a structure lift without exceeding 100", () => {
  const readiness = scoreAtsReadiness({
    intake: strongIntake,
    trade: "HVAC & Refrigeration",
    title: "Commercial HVAC Technician",
    targetJobPosting: posting,
  });
  const completed = scoreCompletedResume({
    intake: strongIntake,
    trade: "HVAC & Refrigeration",
    title: "Commercial HVAC Technician",
    targetJobPosting: posting,
    theme: "plain",
    hasPreview: true,
  });
  assert.ok(completed.score >= readiness.score);
  assert.ok(completed.score <= 100);
  assert.ok(completed.strengths.some((item) => /ATS-safe|ATS-readable/i.test(item)));
});
