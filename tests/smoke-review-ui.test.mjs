import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { findChrome } from "../tools/smoke/browser.mjs";
import { checkUnpaidReviewInBrowser, inspectUnpaidReview, isCheckoutButton } from "../tools/smoke/review-ui.mjs";

const RESUME = "/api/resume-builder/resumes/r-1";

// ---------------------------------------------------------------------------
// Pure rules, on snapshots shaped like collectReviewDom() output from the real
// unpaid review page (captured from a local build of the app).
// ---------------------------------------------------------------------------

const control = (overrides) => ({
  tag: "button", role: "button", name: "", href: null, hasDownloadAttribute: false, type: "button",
  disabled: false, visible: true, unlockRegion: false, className: "", ...overrides,
});

function unpaidSnapshot() {
  return {
    url: "https://tradehustl3.com/resume-builder/review?resume_id=r-1",
    title: "Build and review",
    challenge: false,
    controls: [
      control({ tag: "a", role: "link", name: "TRADE HUSTL3 home", href: "https://tradehustl3.com/", type: null }),
      control({ name: "Zoom in" }),
      control({ name: "Fit to width" }),
      control({ name: "Unlock — $9.99", className: "rb-button rb-button-primary" }),
      control({ role: "radio", name: "Field Pro Built for the work." }),
      control({ name: "Unlock full resume + cover letter — $9.99", unlockRegion: true }),
      control({ tag: "a", role: "link", name: "support@tradehustl3.com", href: "mailto:support@tradehustl3.com", unlockRegion: true, type: null }),
      control({ name: "Unlock & download →", unlockRegion: true }),
    ],
    embeds: [],
    downloadsBlocks: 0,
    viewer: { present: true, label: "Watermarked resume preview with locked lines", canvases: 1, drawnCanvases: 1, error: false, toolbar: "Protected watermarked preview Gray lines unlock after purchase" },
    customization: {
      present: true, disabled: false, visible: true,
      selects: ["Font", "Text size", "Spacing", "Accent color"].map((label) => ({ label, disabled: false, options: 3, value: "Standard" })),
    },
    templates: {
      present: true,
      radios: [["Field Pro", true], ["Modern Trade", false], ["Lead / Supervisor", false]].map(([name, checked]) => ({ name, checked, disabled: false, visible: true })),
    },
  };
}

const UNPAID_REQUESTS = [
  { method: "GET", url: `https://tradehustl3.com${RESUME}` },
  { method: "GET", url: `https://tradehustl3.com${RESUME}/files/preview?run=1&style=plain&revision=0` },
  // The cover-letter preview is the watermarked view=1 render, even unpaid.
  { method: "GET", url: `https://tradehustl3.com${RESUME}/cover-letter/files/pdf?view=1&style=plain&revision=0` },
];

test("the real unpaid review page passes: no Download/Print, viewer drawn, free controls enabled", () => {
  assert.deepEqual(inspectUnpaidReview(unpaidSnapshot(), UNPAID_REQUESTS), { regressions: [], broken: [] });
});

test("'Unlock & download' is recognized as checkout by structure, not ignored by text", () => {
  const checkout = unpaidSnapshot().controls.find((item) => item.name.startsWith("Unlock & download"));
  assert.equal(isCheckoutButton(checkout), true);
  // The same words on a link, outside the unlock region, or with a download attribute are real downloads.
  for (const variant of [
    { ...checkout, tag: "a", role: "link", type: null, href: `https://tradehustl3.com${RESUME}/files/pdf` },
    { ...checkout, unlockRegion: false },
    { ...checkout, hasDownloadAttribute: true },
  ]) {
    const snapshot = unpaidSnapshot();
    snapshot.controls.push(variant);
    const { regressions } = inspectUnpaidReview(snapshot);
    assert.equal(regressions.length, 1, JSON.stringify(variant));
    assert.match(regressions[0], /^Download control rendered/);
  }
});

test("negative: an exposed Download block on an unpaid resume fails", () => {
  const snapshot = unpaidSnapshot();
  snapshot.downloadsBlocks = 3;
  snapshot.controls.push(control({ tag: "a", role: "link", type: null, name: "PDF Clean, ready to send ↓", href: `https://tradehustl3.com${RESUME}/files/pdf`, className: "rb-download" }));
  snapshot.controls.push(control({ tag: "a", role: "link", type: null, name: "DOCX Clean, editable copy ↓", href: `https://tradehustl3.com${RESUME}/files/docx`, className: "rb-download" }));
  const { regressions } = inspectUnpaidReview(snapshot);
  assert.equal(regressions.length, 3);
  assert.match(regressions[0], /3 \.rb-downloads\/\.rb-download element/);
  assert.match(regressions[1], /Download control rendered: a\[role=link\] "PDF Clean, ready to send ↓" → \/api\/resume-builder\/resumes\/r-1\/files\/pdf links to a clean file endpoint/);
  assert.match(regressions[2], /files\/docx links to a clean file endpoint/);
});

test("negative: a Print control fails, even disabled or inside the unlock region", () => {
  for (const variant of [
    control({ name: "Print resume" }),
    control({ name: "Print", disabled: true }),
    control({ name: "Print & unlock", unlockRegion: true }),
    control({ name: "🖨", type: "button" }),
  ]) {
    const snapshot = unpaidSnapshot();
    snapshot.controls.push(variant);
    const { regressions } = inspectUnpaidReview(snapshot);
    assert.equal(regressions.length, 1, variant.name);
    assert.match(regressions[0], /^Print control rendered/);
  }
});

test("negative: a disabled/locked Download control is reported as present, not accepted", () => {
  const snapshot = unpaidSnapshot();
  snapshot.controls.push(control({ name: "Download PDF", disabled: true }));
  const [finding] = inspectUnpaidReview(snapshot).regressions;
  assert.match(finding, /^Download control rendered: button "Download PDF" \(disabled\) — present but disabled; the product removes it until paid$/);
});

test("negative: a print-view link or an embedded native PDF viewer fails", () => {
  const link = unpaidSnapshot();
  link.controls.push(control({ tag: "a", role: "link", type: null, name: "Open", href: `https://tradehustl3.com${RESUME}/files/pdf?view=1` }));
  assert.match(inspectUnpaidReview(link).regressions[0], /^Print control rendered: .*files\/pdf\?view=1 links to a clean file endpoint/);

  for (const embed of [{ tag: "iframe", src: `${RESUME}/files/preview`, type: "" }, { tag: "embed", src: "/x", type: "application/pdf" }, { tag: "object", src: `${RESUME}/files/pdf`, type: "" }]) {
    const snapshot = unpaidSnapshot();
    snapshot.embeds.push(embed);
    assert.match(inspectUnpaidReview(snapshot).regressions[0], /native PDF viewer offers its own Download and Print buttons/);
  }
});

test("negative: the page fetching clean files or starting checkout fails", () => {
  const cases = [
    [`${RESUME}/files/pdf?view=1&run=1`, /requested a clean file/],
    [`${RESUME}/files/docx`, /requested a clean file/],
    [`${RESUME}/cover-letter/files/docx`, /requested a clean file/],
    [`${RESUME}/cover-letter/files/pdf`, /requested a clean file/],
    [`${RESUME}/checkout`, /started checkout without a click/],
  ];
  for (const [path, pattern] of cases) {
    const { regressions } = inspectUnpaidReview(unpaidSnapshot(), [...UNPAID_REQUESTS, { method: "GET", url: `https://tradehustl3.com${path}` }]);
    assert.equal(regressions.length, 1, path);
    assert.match(regressions[0], pattern);
  }
});

test("a broken viewer or unusable free controls are reported separately from Download/Print", () => {
  const cases = [
    [(s) => { s.viewer.drawnCanvases = 0; }, /drew no pages/],
    [(s) => { s.viewer.error = true; }, /error state/],
    [(s) => { s.viewer.present = false; }, /preview not rendered/],
    [(s) => { s.viewer.label = "Clean paid resume"; }, /not the watermarked unpaid resume preview/],
    [(s) => { s.customization.disabled = true; }, /customization fieldset is disabled/],
    [(s) => { s.customization.selects.pop(); }, /expected 4 customization selects/],
    [(s) => { s.customization.selects[0].disabled = true; }, /"Font" is disabled/],
    [(s) => { s.templates.radios[1].disabled = true; }, /template "Modern Trade" is disabled/],
    [(s) => { s.templates.radios[0].checked = false; }, /exactly one selected template/],
    [(s) => { s.templates.present = false; }, /template \(resume system\) picker not rendered/],
  ];
  for (const [mutate, pattern] of cases) {
    const snapshot = unpaidSnapshot();
    mutate(snapshot);
    const { regressions, broken } = inspectUnpaidReview(snapshot);
    assert.deepEqual(regressions, []);
    assert.ok(broken.some((message) => pattern.test(message)), `${pattern} not in ${JSON.stringify(broken)}`);
  }
});

// ---------------------------------------------------------------------------
// Real headless Chrome against a local page with the review page's markup, so
// the DOM collection, cookie, header and network handling are exercised too.
// ---------------------------------------------------------------------------

const chrome = findChrome();
const SESSION = "tradehustl3_resume_session=fixture-session";

function fixturePage(variant) {
  const exposed = {
    clean: "",
    download: `<div class="rb-downloads"><p>Resume files</p><a class="rb-download" href="${RESUME}/files/pdf"><span><strong>PDF</strong><small>Clean, ready to send</small></span><b>↓</b></a></div>`,
    print: `<button type="button" class="rb-button">Print resume</button>`,
    "locked-download": `<button type="button" class="rb-button" disabled aria-label="Download PDF">↓</button>`,
    "native-viewer": `<iframe src="${RESUME}/files/preview" title="Resume"></iframe>`,
    "fetches-clean-file": `<script>fetch("${RESUME}/files/pdf").catch(() => {});</script>`,
  }[variant];
  return `<!doctype html><html><head><title>Build and review</title>
<script src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script></head><body>
<main class="rb-page rb-review-page">
  <section class="rb-review-grid">
    <div class="rb-preview-panel">
      <div class="rb-preview-toolbar"><div>Protected watermarked preview</div><small>Gray lines unlock after purchase</small></div>
      <div class="rb-pdf-controls" role="toolbar" aria-label="Preview controls"><button type="button" aria-label="Zoom in">+</button><button type="button">Fit to width</button></div>
      <div class="rb-pdf-pages" role="group" aria-label="Watermarked resume preview with locked lines"><canvas role="img" data-drawn="false" style="width:300px;height:400px"></canvas></div>
      <p class="rb-lock-note"><span>Unlock the package to see every line and download clean files.</span><button class="rb-button" type="button">Unlock — $9.99</button></p>
    </div>
    <aside>
      <div class="rb-theme-picker" role="radiogroup" aria-label="Resume system">
        <button type="button" role="radio" aria-checked="true"><span class="rb-trade-card-name">Field Pro</span></button>
        <button type="button" role="radio" aria-checked="false"><span class="rb-trade-card-name">Modern Trade</span></button>
        <button type="button" role="radio" aria-checked="false"><span class="rb-trade-card-name">Lead / Supervisor</span></button>
      </div>
      <fieldset class="rb-style-controls"><legend>Customize your document</legend>
        ${["Font", "Text size", "Spacing", "Accent color"].map((label) => `<label>${label}<select><option>A</option><option>B</option></select></label>`).join("")}
      </fieldset>
      <div class="rb-unpaid-card" id="unlock-package"><button class="rb-button" type="button">Unlock full resume + cover letter — $9.99 ↗</button></div>
      ${exposed}
    </aside>
  </section>
  <div class="rb-unlock-bar" role="region" aria-label="Unlock your resume package"><button class="rb-button" type="button">Unlock &amp; download →</button></div>
</main>
<script>
  // Same signal the real ProtectedPdfPreview sets once pdf.js has drawn a page.
  setTimeout(() => { const c = document.querySelector("canvas"); c.width = 300; c.height = 400; c.getContext("2d").fillRect(0, 0, 10, 10); c.dataset.drawn = "true"; }, 150);
</script></body></html>`;
}

async function withFixtureServer(run) {
  const seen = [];
  const server = createServer((request, response) => {
    seen.push({ url: request.url, cookie: request.headers.cookie || "", token: request.headers["x-smoke-token"] || "" });
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/resume-builder/review") {
      // Like the real page, nothing useful renders without the session cookie.
      if (!(request.headers.cookie || "").includes(SESSION)) {
        response.writeHead(401, { "content-type": "text/html" }).end("<title>Sign in</title>");
        return;
      }
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(fixturePage((url.searchParams.get("resume_id") || "").split("~")[1] || "clean"));
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    return await run(origin, seen);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function runVariant(origin, variant) {
  // The fixture picks its variant from the resume_id the checker opens ("r-1~print").
  return checkUnpaidReviewInBrowser({
    origin, resumeId: `r-1~${variant}`, sessionCookie: SESSION, bypassToken: "fixture-bypass-token", timeoutMs: 15_000,
  });
}

const browserTest = (name, fn) => test(name, { skip: chrome ? false : "no Chrome/Chromium binary found (set SMOKE_CHROME_PATH)", timeout: 90_000 }, fn);

browserTest("browser: the unpaid review markup passes on desktop and mobile, with only first-party requests", async () => {
  await withFixtureServer(async (origin, seen) => {
    const results = await runVariant(origin, "clean");
    assert.deepEqual(results.map((result) => result.viewport), ["desktop", "mobile"]);
    for (const result of results) {
      assert.deepEqual(result.regressions, [], result.viewport);
      assert.deepEqual(result.broken, [], result.viewport);
      assert.equal(result.snapshot.viewer.drawnCanvases, 1);
      assert.deepEqual(result.blockedHosts, ["www.googletagmanager.com"]);
    }
    const page = seen.filter((request) => request.url.startsWith("/resume-builder/review"));
    assert.equal(page.length, 2);
    for (const request of page) {
      assert.match(request.cookie, /tradehustl3_resume_session=fixture-session/);
      assert.equal(request.token, "fixture-bypass-token");
    }
  });
});

browserTest("browser negative: deliberately exposed Download, Print, locked Download, native viewer and clean-file fetch all fail", async () => {
  await withFixtureServer(async (origin) => {
    const expectations = {
      download: /^Download control rendered: 2 \.rb-downloads\/\.rb-download element/,
      print: /^Print control rendered: button "Print resume"/,
      "locked-download": /^Download control rendered: button "Download PDF" \(disabled\) — present but disabled/,
      "native-viewer": /native PDF viewer offers its own Download and Print buttons/,
      "fetches-clean-file": /page requested a clean file on an unpaid resume: GET \/api\/resume-builder\/resumes\/r-1\/files\/pdf/,
    };
    for (const [variant, pattern] of Object.entries(expectations)) {
      const results = await runVariant(origin, variant);
      for (const result of results) {
        assert.ok(result.regressions.length > 0, `${variant}/${result.viewport} passed but must fail`);
        assert.match(result.regressions[0], pattern, `${variant}/${result.viewport}`);
        assert.deepEqual(result.broken, [], `${variant}/${result.viewport}`);
      }
    }
  });
});

browserTest("browser: a missing session cookie is reported as a page that never rendered, not a pass", async () => {
  await withFixtureServer(async (origin) => {
    const results = await checkUnpaidReviewInBrowser({ origin, resumeId: "r-1", sessionCookie: "tradehustl3_resume_session=wrong", timeoutMs: 2_000, viewports: [{ name: "desktop", width: 1280, height: 900, mobile: false, deviceScaleFactor: 1 }] });
    assert.match(results[0].broken[0], /did not finish rendering within 2000 ms/);
    assert.ok(results[0].broken.includes("protected resume preview not rendered"));
  });
});
