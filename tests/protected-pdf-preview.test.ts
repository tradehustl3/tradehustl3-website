import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { OPS, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  MAX_CANVAS_PIXELS,
  MAX_PREVIEW_PAGES,
  ProtectedPdfError,
  choosePreviewRenderer,
  fetchProtectedPdf,
  pageRenderScale,
} from "../app/resume-builder/review/protected-pdf";
import { createResumePdf, type GeneratedResume } from "../worker/resume-documents";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("phones, tablets, and browsers without a PDF viewer get the in-workspace canvas renderer", () => {
  const cases: Array<[string, Parameters<typeof choosePreviewRenderer>[0], "frame" | "canvas"]> = [
    ["desktop Chrome/Edge/Firefox/Safari with a built-in viewer", { pdfViewerEnabled: true, narrowViewport: false, coarsePointer: false }, "frame"],
    ["Android Chrome (no inline PDF viewer, blank iframe)", { pdfViewerEnabled: false, narrowViewport: true, coarsePointer: true }, "canvas"],
    ["iPhone Safari (reports a viewer, shows one unscrollable page)", { pdfViewerEnabled: true, narrowViewport: true, coarsePointer: true }, "canvas"],
    ["iPad Safari (wide but touch)", { pdfViewerEnabled: true, narrowViewport: false, coarsePointer: true }, "canvas"],
    ["narrow desktop window", { pdfViewerEnabled: true, narrowViewport: true, coarsePointer: false }, "canvas"],
    ["desktop with the PDF viewer disabled", { pdfViewerEnabled: false, narrowViewport: false, coarsePointer: false }, "canvas"],
    ["older browser that does not report pdfViewerEnabled", { pdfViewerEnabled: undefined, narrowViewport: false, coarsePointer: false }, "canvas"],
  ];
  for (const [name, env, expected] of cases) assert.equal(choosePreviewRenderer(env), expected, name);
});

const PDF_BYTES = new TextEncoder().encode("%PDF-1.7\n%fixture\n");

function fakeFetch(response: Response) {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const impl = async (input: string, init?: RequestInit) => { calls.push({ input, init }); return response; };
  return { impl, calls };
}

test("the canvas renderer loads the same owner-authenticated route with the session cookie and no cache", async () => {
  const { impl, calls } = fakeFetch(new Response(PDF_BYTES, { headers: { "Content-Type": "application/pdf" } }));
  const bytes = await fetchProtectedPdf("/api/resume-builder/resumes/r1/files/preview?run=2&style=navy", impl);
  assert.deepEqual([...bytes], [...PDF_BYTES]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, "/api/resume-builder/resumes/r1/files/preview?run=2&style=navy");
  assert.equal(calls[0].init?.credentials, "same-origin");
  assert.equal(calls[0].init?.cache, "no-store");
});

test("preview load failures are classified instead of drawing a blank or foreign document", async () => {
  const cases: Array<[Response, string]> = [
    [new Response('{"message":"Sign in to continue."}', { status: 401, headers: { "Content-Type": "application/json" } }), "unauthorized"],
    [new Response('{"message":"File not found."}', { status: 404, headers: { "Content-Type": "application/json" } }), "unavailable"],
    [new Response('{"message":"temporarily unavailable"}', { status: 503, headers: { "Content-Type": "application/json" } }), "unavailable"],
    [new Response("<!doctype html><p>sign in</p>", { status: 200, headers: { "Content-Type": "text/html" } }), "not_pdf"],
    [new Response("not a pdf", { status: 200, headers: { "Content-Type": "application/pdf" } }), "not_pdf"],
    [new Response(new Uint8Array(0), { status: 200, headers: { "Content-Type": "application/pdf" } }), "not_pdf"],
  ];
  for (const [response, code] of cases) {
    await assert.rejects(fetchProtectedPdf("/x", fakeFetch(response).impl), (error: unknown) => {
      assert.ok(error instanceof ProtectedPdfError);
      assert.equal(error.code, code);
      return true;
    });
  }
});

test("pages render sharp on high-density phones but within mobile canvas memory limits", () => {
  // US Letter (612 x 792 pt) in a 342px-wide phone panel at 3x density: capped at 2x.
  const phone = pageRenderScale(612, 792, 342, 3);
  assert.ok(Math.abs(phone - (342 / 612) * 2) < 1e-9);
  // A wide tablet at 2x would exceed the per-page pixel budget; the scale is capped.
  const tablet = pageRenderScale(612, 792, 2400, 2);
  assert.ok(612 * 792 * tablet * tablet <= MAX_CANVAS_PIXELS + 1);
  assert.ok(tablet > 0);
  // Low-density screens never render below the CSS size.
  assert.ok(Math.abs(pageRenderScale(612, 792, 612, 0.5) - 1) < 1e-9);
  for (const [w, h, c] of [[0, 792, 342], [612, 0, 342], [612, 792, 0], [Number.NaN, 792, 342]]) {
    assert.equal(pageRenderScale(w, h, c, 2), 0);
  }
});

const previewResume: GeneratedResume = {
  basics: { fullName: "Jordan Williams", targetTitle: "HVAC Service Technician", location: "Atlanta, GA", phone: "(404) 555-0142", email: "jordan@example.com" },
  summary: "HVAC service technician with hands-on experience in diagnostics, preventive maintenance, and customer communication.",
  skills: ["HVAC diagnostics", "Preventive maintenance", "Electrical troubleshooting", "Manifold gauges"],
  certifications: [{ name: "EPA Section 608 Universal" }],
  experience: [{
    jobTitle: "HVAC Service Technician",
    employer: "Metro Heating & Air",
    location: "Decatur, GA",
    startDate: "2019",
    endDate: "2023",
    bullets: ["Serviced split systems, heat pumps, condensers, and control circuits."],
  }],
  education: [{ credential: "HVAC Technical Certificate", institution: "Atlanta Technical College", location: "Atlanta, GA" }],
  additionalInformation: [],
};

test("the canvas renderer draws the real server-watermarked preview, watermark included", async () => {
  const pdf = await createResumePdf(previewResume, true);
  const { impl } = fakeFetch(new Response(pdf, { headers: { "Content-Type": "application/pdf" } }));
  const data = await fetchProtectedPdf("/api/resume-builder/resumes/r1/files/preview", impl);
  // Same options the component uses: no eval (the site CSP has no 'unsafe-eval').
  const loaded = await getDocument({ data, isEvalSupported: false }).promise;
  try {
    assert.ok(loaded.numPages >= 1 && loaded.numPages <= MAX_PREVIEW_PAGES);
    for (let pageNumber = 1; pageNumber <= loaded.numPages; pageNumber += 1) {
      const page = await loaded.getPage(pageNumber);
      const text = (await page.getTextContent()).items.flatMap((item) => ("str" in item ? [item.str] : [])).join(" ");
      assert.match(text, /PREVIEW — PAY \$9\.99 TO REMOVE WATERMARK/, `page ${pageNumber} text watermark`);
      const operators = await page.getOperatorList();
      assert.ok(operators.fnArray.includes(OPS.paintImageXObject), `page ${pageNumber} watermark logo is painted`);
    }
  } finally {
    await loaded.destroy();
  }
});

test("the review page renders both tabs through the in-workspace renderer and keeps every control in the workspace", async () => {
  const [review, preview, page] = await Promise.all([
    read("app/resume-builder/review/resume-review.tsx"),
    read("app/resume-builder/review/protected-pdf-preview.tsx"),
    read("app/resume-builder/review/page.tsx"),
  ]);
  assert.doesNotMatch(review, /<iframe/, "the review page no longer embeds a raw PDF iframe directly");
  assert.equal(review.match(/<ProtectedPdfPreview /g)?.length, 2, "resume and cover-letter tabs");
  assert.match(review, /src=\{resumePreviewSrc\}/);
  assert.match(review, /src=\{`\$\{coverLetter\.previewUrl\}&style=\$\{resume\.theme\}`\}/);
  assert.match(review, /role="tablist" aria-label="Package preview"/);
  assert.match(review, /className="rb-review-grid"/);
  assert.equal(review.match(/\{renderThemePicker\(\)\}/g)?.length, 2, "first-build and sidebar theme pickers");
  for (const label of ["Field Pro", "Modern Trade", "Lead / Supervisor"]) assert.ok(review.includes(label), label);
  assert.doesNotMatch(page, /ResumePreviewFallback/);

  // The renderer never navigates the workspace to the PDF: the only navigation is the
  // existing sign-in redirect, and the last-resort link opens a separate tab.
  assert.match(preview, /window\.location\.assign\("\/resume-builder"\)/);
  assert.equal(preview.match(/window\.location/g)?.length, 1);
  assert.match(preview, /href=\{src\} target="_blank" rel="noopener noreferrer"/);
  assert.match(preview, /isEvalSupported: false/);
  assert.match(preview, /if \(renderer === "frame"\) return <iframe src=\{src\} title=\{title\} \/>/);
});

test("the mobile canvas preview has layout rules and the old raw-PDF fallback is gone", async () => {
  const css = await read("app/resume-builder/resume-builder.css");
  assert.match(css, /\.rb-pdf-pages canvas \{ display: block; width: 100%; height: auto;/);
  assert.match(css, /\.rb-pdf-error \.rb-button \{[^}]*min-height: 44px/);
  await assert.rejects(read("app/resume-builder/review/preview-fallback.tsx"), { code: "ENOENT" });
});
