import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { createResumeDocx, createResumePdf } from "../worker/resume-documents";
import type { GeneratedResume } from "../worker/resume-documents";

const resumeWithoutEmployers: GeneratedResume = {
  basics: {
    fullName: "Rosa Delgado",
    targetTitle: "Maintenance Technician",
    location: "Akron, OH",
  },
  summary: "Hands-on maintenance candidate with supported side-work and trade-school lab experience.",
  skills: ["Drywall repair", "Basic plumbing"],
  certifications: [],
  experience: [
    {
      jobTitle: "Self-Employed Handyman",
      bullets: ["Completed residential drywall and fixture repairs for local homeowners"],
    },
    {
      jobTitle: "Trade School Lab Assistant",
      location: "Akron, OH",
      bullets: ["Organized tools and maintained a clean training workspace"],
    },
  ],
  education: [{ credential: "Facilities Maintenance Certificate", institution: "Akron Career Center" }],
  additionalInformation: [],
};

function decodeXmlText(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

test("DOCX and clean/watermarked PDFs render experience without an employer", async () => {
  const [docx, pdf, preview] = await Promise.all([
    createResumeDocx(resumeWithoutEmployers),
    createResumePdf(resumeWithoutEmployers, false),
    createResumePdf(resumeWithoutEmployers, true),
  ]);

  assert.equal(new TextDecoder().decode(docx.slice(0, 2)), "PK");
  assert.equal(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
  assert.equal(new TextDecoder().decode(preview.slice(0, 5)), "%PDF-");
  assert.ok((await PDFDocument.load(pdf)).getPageCount() >= 1);
  assert.ok((await PDFDocument.load(preview)).getPageCount() >= 1);
  assert.ok(preview.byteLength > pdf.byteLength);

  const zip = await JSZip.loadAsync(docx);
  const xml = await zip.file("word/document.xml")?.async("string");
  assert.ok(xml);
  const paragraphs = Array.from(xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g))
    .map((paragraph) => Array.from(paragraph[1].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g))
      .map((run) => decodeXmlText(run[1])).join(""))
    .filter(Boolean);

  const selfEmployedIndex = paragraphs.indexOf("Self-Employed Handyman");
  assert.ok(selfEmployedIndex >= 0);
  assert.equal(
    paragraphs[selfEmployedIndex + 1],
    "Completed residential drywall and fixture repairs for local homeowners",
    "a missing employer and location must not create a blank organization line",
  );

  const labIndex = paragraphs.indexOf("Trade School Lab Assistant");
  assert.ok(labIndex >= 0);
  assert.equal(paragraphs[labIndex + 1], "Akron, OH");
  assert.doesNotMatch(paragraphs[labIndex + 1], /—|\|/);

  const visibleText = paragraphs.join("\n");
  assert.doesNotMatch(visibleText, /\b(?:N\/A|Unknown|Independent)\b/i);
  assert.doesNotMatch(visibleText, /—\s*(?:—|$)|\|\s*\||^\s*[—|]|[—|]\s*$/m);
});
