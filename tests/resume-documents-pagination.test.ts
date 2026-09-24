import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createResumeDocx, createResumePdf } from "../worker/resume-documents";
import type { GeneratedResume, ResumeTheme } from "../worker/resume-documents";
import { fixtureModelDraft } from "./helpers/production-resume-fixture";

const compactFitResume: GeneratedResume = {
  basics: {
    fullName: "Jordan Williams",
    targetTitle: "HVAC & Facilities Maintenance Technician",
    location: "Atlanta, GA",
    phone: "(404) 555-0142",
    email: "jordan@example.com",
  },
  summary: "Facilities maintenance technician with hands-on experience supporting HVAC service, preventive maintenance, work orders, building repairs, and safe daily operations in occupied properties.",
  skills: [
    "HVAC diagnostics", "Preventive maintenance", "Electrical troubleshooting", "Plumbing repair",
    "Work-order documentation", "Multimeter", "Manifold gauges", "Equipment inspections",
  ],
  certifications: [
    { name: "EPA Section 608 Universal" },
    { name: "OSHA 10-Hour Construction" },
  ],
  experience: [
    {
      jobTitle: "Maintenance Supervisor",
      employer: "Campus Residential Services",
      location: "Atlanta, GA",
      startDate: "2023",
      endDate: "2026",
      bullets: [
        "Coordinated preventive maintenance and daily service requests across occupied residential buildings.",
        "Diagnosed HVAC, electrical, plumbing, appliance, and general building maintenance concerns.",
        "Documented completed work and communicated repair status to residents and property leadership.",
      ],
    },
    {
      jobTitle: "HVAC Service Technician",
      employer: "Metro Heating & Air",
      location: "Decatur, GA",
      startDate: "2019",
      endDate: "2023",
      bullets: [
        "Serviced split systems, heat pumps, condensers, air handlers, thermostats, and control circuits.",
        "Used meters and gauges to evaluate voltage, capacitance, temperature split, and refrigerant conditions.",
        "Completed equipment inspections and explained verified repair needs to customers.",
      ],
    },
    {
      jobTitle: "Maintenance Technician",
      employer: "Peachtree Property Group",
      location: "Atlanta, GA",
      startDate: "2016",
      endDate: "2019",
      bullets: [
        "Completed apartment turns, service requests, filter changes, inspections, and routine repairs.",
        "Responded to after-hours maintenance calls and helped keep mechanical spaces clean and organized.",
      ],
    },
  ],
  education: [{ credential: "HVAC Technical Certificate", institution: "Atlanta Technical College", location: "Atlanta, GA" }],
  additionalInformation: [],
};

async function pdfPageText(pdf: Uint8Array): Promise<string[]> {
  const loaded = await getDocument({ data: pdf }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= loaded.numPages; pageNumber += 1) {
    const content = await (await loaded.getPage(pageNumber)).getTextContent();
    pages.push(content.items.flatMap((item) => ("str" in item ? [item.str] : [])).join(" "));
  }
  await loaded.destroy();
  return pages;
}

test("PDF keeps a naturally one-page resume together with education", async () => {
  const pages = await pdfPageText(await createResumePdf(compactFitResume));
  assert.equal(pages.length, 1);
  assert.match(pages[0], /EDUCATION & TRAINING/);
  assert.match(pages[0], /HVAC Technical Certificate/);
});

test("PDF and DOCX omit the Core Skills heading when there are no skills", async () => {
  const noSkillsResume = { ...compactFitResume, skills: [] };
  const pdfText = (await pdfPageText(await createResumePdf(noSkillsResume))).join(" ");
  assert.doesNotMatch(pdfText, /CORE SKILLS/);

  const zip = await JSZip.loadAsync(await createResumeDocx(noSkillsResume));
  const xml = await zip.file("word/document.xml")?.async("string");
  assert.ok(xml);
  assert.doesNotMatch(xml, /CORE SKILLS/);
});

test("PDF applies the measured compact profile before allowing a nearly fitting resume onto page two", async () => {
  const nearlyOnePageResume: GeneratedResume = {
    ...compactFitResume,
    experience: [{
      ...compactFitResume.experience[0],
      bullets: Array.from({ length: 13 }, (_, index) =>
        `Completed preventive maintenance, HVAC troubleshooting, building repairs, work-order documentation, and follow-up communication for service request ${index + 1}.`,
      ),
    }],
  };
  const pages = await pdfPageText(await createResumePdf(nearlyOnePageResume));
  assert.equal(pages.length, 1);
  assert.match(pages[0], /EDUCATION & TRAINING/);
});

test("PDF never starts a continuation page with job bullets lacking their job heading", async () => {
  const longResume: GeneratedResume = {
    ...compactFitResume,
    experience: compactFitResume.experience.map((job, jobIndex) => ({
      ...job,
      bullets: Array.from({ length: 8 }, (_, bulletIndex) =>
        `JOB${jobIndex + 1} BULLET${bulletIndex + 1}: Completed detailed preventive maintenance, troubleshooting, repair documentation, equipment checks, and follow-up communication for occupied facilities.`,
      ),
    })),
  };
  const pages = await pdfPageText(await createResumePdf(longResume));
  assert.ok(pages.length >= 2);

  for (const page of pages.slice(1)) {
    for (const [jobIndex, job] of longResume.experience.entries()) {
      const firstBullet = page.indexOf(`JOB${jobIndex + 1} BULLET`);
      if (firstBullet < 0) continue;
      const heading = page.indexOf(job.jobTitle);
      assert.ok(heading >= 0 && heading < firstBullet, `${job.jobTitle} must be repeated before its continued bullets`);
    }
  }
});

test("DOCX binds a job heading to its employer and first bullet only; later bullets paginate normally", async () => {
  const zip = await JSZip.loadAsync(await createResumeDocx(compactFitResume));
  const xml = await zip.file("word/document.xml")?.async("string");
  assert.ok(xml);

  const paragraphs = Array.from(xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g));
  const jobParagraphs = paragraphs.filter((paragraph) => /Coordinated preventive maintenance|Diagnosed HVAC|Documented completed work/.test(paragraph[1]));
  assert.equal(jobParagraphs.length, 3);
  assert.ok(jobParagraphs.every((paragraph) => /<w:keepLines\/?\s*>/.test(paragraph[1])), "a single bullet never splits across pages");
  assert.ok(jobParagraphs.every((paragraph) => !/<w:keepNext\/?\s*>/.test(paragraph[1])), "bullets are not chained together");
});

const THEMES: ResumeTheme[] = ["plain", "navy", "lead"];

const productionLikeResume: GeneratedResume = {
  ...fixtureModelDraft(),
  skills: [
    "HVAC Diagnostics", "Preventive Maintenance", "Electrical Troubleshooting", "Plumbing / Building Maintenance",
    "Refrigerant Service", "Equipment Installation", "Emergency Response", "Facility Maintenance",
    "Work Order Management", "Vendor Coordination", "Team Leadership", "Safety Compliance",
  ],
};

function pagesContaining(pages: string[], needle: string): number[] {
  return pages.flatMap((page, index) => page.includes(needle) ? [index + 1] : []);
}

for (const theme of THEMES) {
  test(`${theme} PDF: a later job splits after its first bullet instead of moving whole to page two`, async () => {
    const pages = (await pdfPageText(await createResumePdf(productionLikeResume, false, theme)))
      .map((page) => page.replace(/\s+/g, " "));
    assert.equal(pages.length, 2, "substantial experience renders as a balanced two-page resume");
    const all = pages.join(" ");

    let splitJobs = 0;
    for (const job of productionLikeResume.experience) {
      assert.ok(all.includes(job.employer!), `${job.employer} is present`);
      for (const item of job.bullets) assert.ok(all.includes(item), `bullet preserved: ${item.slice(0, 50)}`);

      const headingPage = pagesContaining(pages, `${job.employer} — ${job.location}`)[0];
      const bulletPages = job.bullets.map((item) => pagesContaining(pages, item)[0]);
      assert.equal(bulletPages[0], headingPage, `${job.employer}: heading, employer, and first bullet stay together`);
      if (new Set(bulletPages).size > 1) {
        splitJobs += 1;
        const continuedPage = pages[bulletPages[bulletPages.length - 1] - 1];
        const continued = continuedPage.indexOf(`${job.jobTitle} | ${job.startDate} – ${job.endDate} (continued)`);
        const firstContinuedBullet = continuedPage.indexOf(job.bullets[bulletPages.indexOf(bulletPages[bulletPages.length - 1])]);
        assert.ok(continued >= 0 && continued < firstContinuedBullet, `${job.employer}: continued heading precedes its bullets on the next page`);
      }
    }
    assert.equal(splitJobs, 1, "the job crossing the page break starts on page one and continues on page two");

    const [, , thirdJob] = productionLikeResume.experience;
    assert.equal(pagesContaining(pages, thirdJob.bullets[0])[0], 1, "the third job is not pushed whole to page two");
    assert.equal(pagesContaining(pages, thirdJob.bullets[thirdJob.bullets.length - 1])[0], 2);
  });

  test(`${theme} DOCX: only heading → employer → first bullet use keepNext for every job`, async () => {
    const zip = await JSZip.loadAsync(await createResumeDocx(productionLikeResume, theme));
    const xml = await zip.file("word/document.xml")?.async("string");
    assert.ok(xml);
    const paragraphs = Array.from(xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)).map((match) => match[1]);
    const textOf = (paragraph: string) => Array.from(paragraph.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)).map((match) => match[1]).join("");
    const keepNext = (paragraph: string) => /<w:keepNext\/?\s*>/.test(paragraph);

    for (const job of productionLikeResume.experience) {
      const headingIndex = paragraphs.findIndex((paragraph) => textOf(paragraph).startsWith(`${job.jobTitle}  |  ${job.startDate}`)
        && textOf(paragraphs[paragraphs.indexOf(paragraph) + 1]).startsWith(job.employer!));
      assert.ok(headingIndex >= 0, `${job.employer} heading rendered`);
      assert.ok(keepNext(paragraphs[headingIndex]), `${job.employer}: heading keeps with employer`);
      assert.ok(keepNext(paragraphs[headingIndex + 1]), `${job.employer}: employer keeps with first bullet`);
      const bullets = paragraphs.slice(headingIndex + 2, headingIndex + 2 + job.bullets.length);
      assert.deepEqual(bullets.map(textOf), job.bullets, `${job.employer}: every bullet preserved in order`);
      assert.ok(bullets.every((paragraph) => /<w:keepLines\/?\s*>/.test(paragraph)), `${job.employer}: bullets never split mid-line`);
      assert.ok(bullets.every((paragraph) => !keepNext(paragraph)), `${job.employer}: bullets are free to paginate`);
    }
  });
}
