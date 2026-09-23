import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { handleResumeBuilderRoute, type ResumeBuilderDependencies } from "../worker/resume-builder";
import {
  createResumeDocx,
  createResumePdf,
  type GeneratedResume,
  type ResumeTheme,
} from "../worker/resume-documents";
import { classifyResumeSections } from "../worker/resume-section-classifier";
import { buildCanonicalSourceRecord } from "../worker/resume-source-canonical";
import { canonicalSourceRecord, isResumeIdentityTerm } from "../worker/resume-quality";

const sessionCookie = "tradehustl3_resume_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const encoder = new TextEncoder();

const NAME = "Marcus Reed";
const TARGET_TITLE = "Maintenance Supervisor";
const TRADE = "Facilities Maintenance";
const CITY_STATE = "Tampa, FL";
const PHONE = "(813) 555-0142";
const EMAIL = "marcus.reed@example.com";

// The shape that produced the defect: the header line is pipe-separated like a
// skill row, so it was classified as skills before any section heading.
const SOURCE_TEXT = `${NAME}
${TARGET_TITLE} | ${TRADE} | ${CITY_STATE} | ${PHONE} | ${EMAIL}

PROFESSIONAL SUMMARY
Maintenance supervisor with commercial building, HVAC, and work-order experience.

SKILLS
HVAC diagnostics | Preventive maintenance | Electrical troubleshooting | Plumbing
Work order management | Team leadership | Vendor coordination | Building maintenance | Emergency response

CERTIFICATIONS
EPA 608 Universal Certification
OSHA 10

EXPERIENCE
Maintenance Supervisor
Bayside Properties — Tampa, FL
Jan 2019 - Present
- Led a team of technicians across commercial buildings and managed daily work orders.
- Coordinated vendors for HVAC, plumbing, and electrical repairs.

Maintenance Technician
Gulf Coast Apartments — Clearwater, FL
Mar 2015 - Dec 2018
- Performed preventive maintenance on HVAC, plumbing, and electrical systems.
- Responded to after-hours emergency calls.
`;

const SUPPORTED_SKILLS = [
  "HVAC diagnostics",
  "Preventive maintenance",
  "Electrical troubleshooting",
  "Plumbing",
  "Work order management",
  "Team leadership",
  "Vendor coordination",
  "Building maintenance",
  "Emergency response",
];

const IDENTITY_TERMS = [TARGET_TITLE, TRADE, CITY_STATE, "Tampa", "FL", PHONE, EMAIL];

const ROLES = [
  {
    employer: "Bayside Properties",
    jobTitle: "Maintenance Supervisor",
    location: "Tampa, FL",
    startDate: "Jan 2019",
    endDate: "Present",
    current: true,
    responsibilities: "Led a team of technicians across commercial buildings and managed daily work orders.\nCoordinated vendors for HVAC, plumbing, and electrical repairs.",
  },
  {
    employer: "Gulf Coast Apartments",
    jobTitle: "Maintenance Technician",
    location: "Clearwater, FL",
    startDate: "Mar 2015",
    endDate: "Dec 2018",
    responsibilities: "Performed preventive maintenance on HVAC, plumbing, and electrical systems.\nResponded to after-hours emergency calls.",
  },
];

// A draft saved before the fix, whose technicalSkills already carry the header values.
function uploadedIntake(targetTitle: string): Record<string, unknown> {
  return {
    contact: { fullName: NAME, email: EMAIL, phone: PHONE, cityState: CITY_STATE },
    career: { summaryNotes: "Maintenance supervisor with commercial building, HVAC, and work-order experience." },
    fieldValue: {
      certifications: ["EPA 608 Universal Certification", "OSHA 10"],
      technicalSkills: [...IDENTITY_TERMS, ...SUPPORTED_SKILLS],
    },
    experience: ROLES,
    sourceResumeText: SOURCE_TEXT,
    targetJob: { title: targetTitle, company: "", location: "" },
    meta: { source: "upload", importedResume: true },
  };
}

function harness(savedIntake: Record<string, unknown>, title: string) {
  const state = { status: "draft", generatedJson: null as string | null };
  const objects = new Map<string, Uint8Array>();
  function statement(sql: string, values: unknown[]) {
    return {
      async first() {
        if (/RETURNING count/i.test(sql)) return { count: 1 };
        if (/FROM sessions s/i.test(sql)) return { user_id: "user-1", email: "member@example.com", full_name: "Member" };
        if (/FROM resumes WHERE/i.test(sql)) {
          return {
            resume_id: "resume-1",
            user_id: "user-1",
            trade: TRADE,
            title,
            intake_json: JSON.stringify(savedIntake),
            generated_json: state.generatedJson,
            target_job_posting: null,
            status: state.status,
            theme: "plain",
          };
        }
        return null;
      },
      async run() {
        if (/UPDATE resumes SET status = 'generating'/i.test(sql)) {
          if (state.status === "generating") return { meta: { changes: 0 } };
          state.status = "generating";
          return { meta: { changes: 1 } };
        }
        if (/UPDATE resumes SET status = \?/i.test(sql)) state.status = String(values[0]);
        return { meta: { changes: 1 } };
      },
    };
  }
  const DB = {
    prepare(sql: string) {
      return { bind: (...values: unknown[]) => ({ sql, values, ...statement(sql, values) }) };
    },
    async batch(statements: Array<{ sql: string; values: unknown[] }>) {
      for (const item of statements) {
        if (/UPDATE resumes SET generated_json/i.test(item.sql)) {
          state.generatedJson = String(item.values[0]);
          state.status = "ready";
        }
      }
      return [];
    },
  };
  const BOOKS = {
    async put(key: string, bytes: Uint8Array) { objects.set(key, bytes); },
    async get(key: string) { return objects.has(key) ? { body: objects.get(key) } : null; },
    async delete(key: string) { objects.delete(key); },
  };
  return { state, DB, BOOKS };
}

// A model draft that repeats the defect: header identity pushed into skills and
// the trade used as the title under the name.
const pollutedModelDraft: GeneratedResume = {
  basics: { fullName: NAME, targetTitle: TRADE, location: CITY_STATE, phone: PHONE, email: EMAIL },
  summary: "Maintenance supervisor with commercial building, HVAC, and work-order experience.",
  skills: [...IDENTITY_TERMS, ...SUPPORTED_SKILLS],
  certifications: [{ name: "EPA 608 Universal Certification" }, { name: "OSHA 10" }],
  experience: [
    {
      jobTitle: "Maintenance Supervisor",
      employer: "Bayside Properties",
      location: "Tampa, FL",
      startDate: "Jan 2019",
      endDate: "Present",
      bullets: [
        "Led a team of technicians across commercial buildings and managed daily work orders.",
        "Coordinated vendors for HVAC, plumbing, and electrical repairs.",
      ],
    },
    {
      jobTitle: "Maintenance Technician",
      employer: "Gulf Coast Apartments",
      location: "Clearwater, FL",
      startDate: "Mar 2015",
      endDate: "Dec 2018",
      bullets: [
        "Performed preventive maintenance on HVAC, plumbing, and electrical systems.",
        "Responded to after-hours emergency calls.",
      ],
    },
  ],
  education: [],
  additionalInformation: [],
};

async function generate(
  savedIntake: Record<string, unknown>,
  title: string,
  modelFetch: typeof fetch,
): Promise<GeneratedResume> {
  const h = harness(savedIntake, title);
  let rendered: GeneratedResume | null = null;
  const dependencies: ResumeBuilderDependencies = {
    geminiFetch: modelFetch,
    createDocx: async (generated) => { rendered = generated; return encoder.encode("DOCX"); },
    createPdf: async () => encoder.encode("PDF"),
  };
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie, Origin: "https://tradehustl3.com" },
      body: "{}",
    }),
    {
      DB: h.DB as unknown as D1Database,
      BOOKS: h.BOOKS as unknown as R2Bucket,
      RESUME_AI_PROVIDER: "gemini",
      RESUME_AI_BRIDGE_URL: "https://resume-ai-bridge.example.run.app",
      RESUME_AI_BRIDGE_SECRET: "bridge-secret",
    },
    dependencies,
  );
  assert.equal(response?.status, 200, await response?.clone().text());
  assert.ok(rendered, "the resume was rendered");
  return rendered;
}

const modelReturns = (draft: GeneratedResume) => (async () => new Response(JSON.stringify({
  candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(draft) }] } }],
  usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, thoughtsTokenCount: 0 },
}), { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch;

const modelFails = (async () => { throw new Error("AI bridge unavailable"); }) as typeof fetch;

const THEMES: ResumeTheme[] = ["plain", "navy", "lead"];
const COMPETENCY_HEADING: Record<ResumeTheme, string> = {
  plain: "CORE SKILLS",
  navy: "AREAS OF EXPERTISE",
  lead: "LEADERSHIP & OPERATIONS COMPETENCIES",
};

function decodeXml(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function docxParagraphs(resume: GeneratedResume, theme: ResumeTheme): Promise<string[]> {
  const zip = await JSZip.loadAsync(await createResumeDocx(resume, theme));
  const xml = await zip.file("word/document.xml")?.async("string");
  assert.ok(xml);
  return xml.split("</w:p>").map(decodeXml).filter(Boolean);
}

function competencyText(paragraphs: string[], theme: ResumeTheme): string {
  const index = paragraphs.indexOf(COMPETENCY_HEADING[theme]);
  assert.ok(index >= 0, `${theme} renders ${COMPETENCY_HEADING[theme]}`);
  return paragraphs[index + 1];
}

async function pdfText(resume: GeneratedResume, theme: ResumeTheme): Promise<string> {
  const loaded = await getDocument({ data: await createResumePdf(resume, false, theme) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= loaded.numPages; pageNumber += 1) {
    const content = await (await loaded.getPage(pageNumber)).getTextContent();
    pages.push(content.items.flatMap((item) => ("str" in item ? [item.str] : [])).join(" "));
  }
  await loaded.destroy();
  return pages.join(" ").replace(/\s+/g, " ");
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

function assertCleanCompetencies(text: string, label: string) {
  for (const term of [PHONE, EMAIL, CITY_STATE, TRADE, TARGET_TITLE]) {
    assert.ok(!text.includes(term), `${label}: competency section must not contain "${term}"`);
  }
  assert.doesNotMatch(text, /@|\(\d{3}\)|\d{3}-\d{4}|\bTampa\b|\bFL\b/, `${label}: no contact fragments`);
  for (const skill of SUPPORTED_SKILLS) {
    assert.ok(text.includes(skill), `${label}: competency section keeps "${skill}"`);
  }
}

test("a pipe-separated header/contact line is never classified as skills", () => {
  const { skillEntities } = classifyResumeSections(SOURCE_TEXT);
  assert.deepEqual(skillEntities, SUPPORTED_SKILLS);

  const prefill = buildCanonicalSourceRecord(SOURCE_TEXT).prefill as { fieldValue: { technicalSkills: string[] } };
  assert.deepEqual(prefill.fieldValue.technicalSkills, SUPPORTED_SKILLS);
});

test("comma-separated skill rows are not mistaken for city/state contact data", () => {
  const { skillEntities } = classifyResumeSections("SKILLS\nBoilers, AC | Chillers | Pumps, PM");
  assert.deepEqual(skillEntities, ["Boilers", "AC", "Chillers", "Pumps", "PM"]);
});

test("identity terms are recognized and supported skills are not", () => {
  const identity = { contact: { fullName: NAME, email: EMAIL, phone: PHONE, location: CITY_STATE }, targetTitle: TARGET_TITLE };
  for (const term of IDENTITY_TERMS) assert.equal(isResumeIdentityTerm(term, identity, TRADE), true, term);
  for (const skill of SUPPORTED_SKILLS) assert.equal(isResumeIdentityTerm(skill, identity, TRADE), false, skill);
});

test("the verified source record keeps header identity out of skill lists", () => {
  const source = canonicalSourceRecord(uploadedIntake(TARGET_TITLE), TARGET_TITLE, TRADE);
  assert.deepEqual(source.technicalSkills, SUPPORTED_SKILLS);
});

for (const [label, fetcher] of [["model draft", modelReturns(pollutedModelDraft)], ["verified-source recovery", modelFails]] as const) {
  test(`${label}: competencies hold only supported skills and the target title sits under the name in all three templates`, async () => {
    const generated = await generate(uploadedIntake(TARGET_TITLE), TARGET_TITLE, fetcher);
    assert.equal(generated.basics.targetTitle, TARGET_TITLE);
    assert.deepEqual(generated.skills.filter((skill) => IDENTITY_TERMS.includes(skill)), []);

    for (const theme of THEMES) {
      const paragraphs = await docxParagraphs(generated, theme);
      assert.equal(paragraphs[0], NAME, `${theme}: name first`);
      assert.equal(paragraphs[1], TARGET_TITLE, `${theme}: target title directly under the name`);
      assert.equal(paragraphs[2], `${CITY_STATE} | ${PHONE} | ${EMAIL}`, `${theme}: contact line in header`);
      assertCleanCompetencies(competencyText(paragraphs, theme), `${theme} DOCX`);

      const all = paragraphs.join("\n");
      assert.equal(occurrences(all, PHONE), 1, `${theme}: phone appears once`);
      assert.equal(occurrences(all, EMAIL), 1, `${theme}: email appears once`);
      assert.equal(occurrences(all, CITY_STATE), 2, `${theme}: city/state only in header and the matching job location`);

      const pdf = await pdfText(generated, theme);
      const start = pdf.indexOf(COMPETENCY_HEADING[theme]) + COMPETENCY_HEADING[theme].length;
      const next = pdf.slice(start).search(/\b(?:CERTIFICATIONS|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE)\b/);
      assertCleanCompetencies(pdf.slice(start, start + next), `${theme} PDF`);
      assert.equal(occurrences(pdf, EMAIL), 1, `${theme} PDF: email appears once`);
    }
  });
}

test("without a target job title the header uses the most recent verified job title, never the trade", async () => {
  const generated = await generate(uploadedIntake(""), `${TRADE} Resume`, modelFails);
  assert.equal(generated.basics.targetTitle, "Maintenance Supervisor");
  const paragraphs = await docxParagraphs(generated, "navy");
  assert.equal(paragraphs[1], "Maintenance Supervisor");
  assert.ok(!paragraphs.some((paragraph) => paragraph.includes(`${TRADE} Resume`)));
});

test("all three templates preserve identical employers, titles, dates, and certifications", async () => {
  const generated = await generate(uploadedIntake(TARGET_TITLE), TARGET_TITLE, modelReturns(pollutedModelDraft));
  const factLines = (paragraphs: string[]) => paragraphs.filter((paragraph) =>
    generated.experience.some((role) => paragraph.startsWith(`${role.jobTitle} |`) || paragraph.startsWith(role.employer ?? "\u0000"))
    || generated.certifications.some((certification) => paragraph === certification.name));

  const [plain, navy, lead] = await Promise.all(THEMES.map(async (theme) => factLines(await docxParagraphs(generated, theme))));
  assert.deepEqual(plain, [
    "EPA 608 Universal Certification",
    "OSHA 10",
    "Maintenance Supervisor | Jan 2019 – Present",
    "Bayside Properties — Tampa, FL",
    "Maintenance Technician | Mar 2015 – Dec 2018",
    "Gulf Coast Apartments — Clearwater, FL",
  ]);
  // Section order differs by design; the facts themselves must not.
  assert.deepEqual([...navy].sort(), [...plain].sort());
  assert.deepEqual([...lead].sort(), [...plain].sort());
});
