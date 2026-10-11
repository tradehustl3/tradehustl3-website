import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { presentableSkill, presentableSkills } from "../worker/resume-skill-casing";
import { createResumeDocx, createResumePdf } from "../worker/resume-documents";
import { defaultStyle } from "../worker/resume-templates";
import { sampleResume } from "../docs/pr186/sample-resume";

test("all-caps skills are re-cased; trade acronyms and codes stay uppercase", () => {
  assert.equal(presentableSkill("FACILITIES OPERATIONS"), "Facilities Operations");
  assert.equal(presentableSkill("HVAC & BUILDING SYSTEMS LEADERSHIP"), "HVAC & Building Systems Leadership");
  assert.equal(presentableSkill("EPA 608 UNIVERSAL"), "EPA 608 Universal");
  assert.equal(presentableSkill("PLUMBING AND PIPEFITTING"), "Plumbing and Pipefitting");
  assert.equal(presentableSkill("R-410A SYSTEMS"), "R-410A Systems");
  assert.equal(presentableSkill("RTU / VAV TROUBLESHOOTING"), "RTU / VAV Troubleshooting");
  assert.equal(presentableSkill("TEAM LEAD"), "Team Lead");
});

test("customer casing is preserved whenever the skill is not shouted", () => {
  for (const skill of ["OSHA 30", "EPA 608", "HVAC", "BAS / controls", "Preventive Maintenance", "iPad work orders", "NFPA 70E"]) {
    assert.equal(presentableSkill(skill), skill);
  }
  assert.equal(presentableSkill("  Brazing   &  soldering "), "Brazing & soldering");
});

test("the rendered list drops case-only duplicates and empty values", () => {
  assert.deepEqual(
    presentableSkills(["Facilities Operations", "FACILITIES OPERATIONS", "", "Work order systems"]),
    ["Facilities Operations", "Work order systems"],
  );
});

test("PDF and DOCX render the same re-cased skills (v1 and v2)", async () => {
  const resume = { ...sampleResume, skills: [...sampleResume.skills.slice(0, 6), "FACILITIES OPERATIONS"] };
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  for (const style of [undefined, defaultStyle("plain")]) {
    const task = getDocument({ data: Uint8Array.from(await createResumePdf(resume, false, "plain", "plain", style)), isEvalSupported: false });
    try {
      const pdf = await task.promise;
      let text = "";
      for (let n = 1; n <= pdf.numPages; n++) text += (await (await pdf.getPage(n)).getTextContent()).items.map((item) => ("str" in item ? item.str : "")).join(" ");
      assert.match(text.replace(/\s+/g, " "), /Facilities Operations/);
      assert.doesNotMatch(text, /FACILITIES OPERATIONS/);
    } finally {
      await task.destroy();
    }
    const zip = await JSZip.loadAsync(await createResumeDocx(resume, "plain", "plain", style));
    const xml = await zip.file("word/document.xml")!.async("string");
    assert.match(xml, /Facilities Operations/);
    assert.doesNotMatch(xml, /FACILITIES OPERATIONS/);
  }
});
