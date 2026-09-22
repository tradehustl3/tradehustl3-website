import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { createResumeDocx, createResumePdf, type GeneratedResume, type ResumeTheme } from "../worker/resume-documents";

const resume: GeneratedResume = {
  basics: {
    fullName: "Taylor Morgan",
    targetTitle: "Maintenance Supervisor",
    location: "Atlanta, GA",
    phone: "(404) 555-0111",
    email: "taylor@example.com",
  },
  summary: "Skilled-trades professional with verified HVAC, facilities maintenance, work-order, and team-lead experience.",
  skills: ["HVAC diagnostics", "Preventive maintenance", "Team supervision", "Work-order management"],
  certifications: [{ name: "EPA Section 608 Universal" }],
  experience: [{
    jobTitle: "Maintenance Supervisor",
    employer: "Metro Facilities",
    location: "Atlanta, GA",
    startDate: "2023",
    endDate: "Present",
    bullets: [
      "Supervised technicians while coordinating preventive maintenance, work orders, and escalated HVAC repairs.",
      "Diagnosed electrical and mechanical failures across occupied commercial facilities.",
    ],
  }],
  education: [{ credential: "HVAC Technical Certificate", institution: "Metro Technical College" }],
  additionalInformation: ["OSHA 10 safety training", "Salesforce work-order documentation"],
};

async function docxVisibleText(theme: ResumeTheme): Promise<string> {
  const zip = await JSZip.loadAsync(await createResumeDocx(resume, theme));
  const xml = await zip.file("word/document.xml")?.async("string");
  assert.ok(xml);
  return xml
    .replace(/<w:tab\/?\s*>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expectOrder(text: string, labels: string[]) {
  let previous = -1;
  for (const label of labels) {
    const index = text.indexOf(label);
    assert.ok(index >= 0, `missing section: ${label}`);
    assert.ok(index > previous, `section out of order: ${label}`);
    previous = index;
  }
}

test("Field Pro uses the field-first production section order", async () => {
  const text = await docxVisibleText("plain");
  expectOrder(text, [
    "PROFESSIONAL SUMMARY",
    "CORE SKILLS",
    "CERTIFICATIONS & LICENSES",
    "WORK EXPERIENCE",
    "EDUCATION & TRAINING",
    "ADDITIONAL INFORMATION",
  ]);
});

test("Modern Trade uses the polished technical section order", async () => {
  const text = await docxVisibleText("navy");
  expectOrder(text, [
    "PROFESSIONAL PROFILE",
    "AREAS OF EXPERTISE",
    "WORK EXPERIENCE",
    "CERTIFICATIONS & LICENSES",
    "TECHNICAL TOOLS, SYSTEMS & TRAINING",
    "EDUCATION & TRAINING",
  ]);
});

test("Lead Supervisor uses the leadership-first section order", async () => {
  const text = await docxVisibleText("lead");
  expectOrder(text, [
    "LEADERSHIP PROFILE",
    "LEADERSHIP & OPERATIONS COMPETENCIES",
    "PROFESSIONAL EXPERIENCE",
    "TECHNICAL EXPERTISE & ADDITIONAL QUALIFICATIONS",
    "CERTIFICATIONS & LICENSES",
    "EDUCATION & TRAINING",
  ]);
});

test("all three resume systems render valid clean PDF and DOCX files", async () => {
  for (const theme of ["plain", "navy", "lead"] as const) {
    const [docx, pdf] = await Promise.all([
      createResumeDocx(resume, theme),
      createResumePdf(resume, false, theme),
    ]);
    assert.equal(new TextDecoder().decode(docx.slice(0, 2)), "PK");
    assert.equal(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
    assert.ok((await PDFDocument.load(pdf)).getPageCount() >= 1);
  }
});
