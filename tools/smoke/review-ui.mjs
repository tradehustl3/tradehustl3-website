/**
 * Browser-level check of the unpaid Resume Builder review page.
 *
 * Opens /resume-builder/review?resume_id=… in headless Chrome as the signed-in
 * smoke account, waits for the protected canvas preview to draw, then inspects
 * the rendered DOM and every request the page made.
 *
 * Product behavior this asserts (app/resume-builder/review/resume-review.tsx):
 * - Download: the `.rb-downloads` block and its `a.rb-download` links render
 *   only when the API returns `downloads`. Unpaid, they are removed, not disabled.
 * - Print: there is no Print button. The paid view loads the clean file
 *   (`/files/pdf?view=1`); the unpaid view draws the watermarked
 *   `/files/preview` into <canvas> through pdf.js, so no native PDF viewer (with
 *   its own Download / Print buttons) is ever embedded.
 * - The checkout buttons "Unlock & download" (fixed bar) and "Unlock full resume
 *   + cover letter — $9.99" (purchase card) start Stripe checkout. They are not
 *   downloads; they are recognized by structure (a type="button" <button> in the
 *   unlock region, no href, no download attribute) and never clicked.
 */
import { BrowserUnavailable, launchChrome } from "./browser.mjs";

export { BrowserUnavailable };
export class CloudflareChallenge extends Error {}

export const SESSION_COOKIE = "tradehustl3_resume_session";
export const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900, mobile: false, deviceScaleFactor: 1 },
  { name: "mobile", width: 390, height: 844, mobile: true, deviceScaleFactor: 2 },
];

/** Clean resume/cover-letter file endpoints. Only a paid package may link to or load these. */
const CLEAN_RESUME_FILE = /\/api\/resume-builder\/resumes\/[^/?#]+\/files\/(?:pdf|docx)(?:[?#]|$)/;
const COVER_LETTER_FILE = /\/api\/resume-builder\/resumes\/[^/?#]+\/cover-letter\/files\/(pdf|docx)(?:\?([^#]*))?/;
const CHECKOUT = /\/api\/resume-builder\/resumes\/[^/?#]+\/checkout(?:[?#]|$)/;
const DOWNLOAD_OR_PRINT_NAME = /\b(download|downloads|print|printable)\b|⎙|🖨/i;
const FILE_FORMAT_NAME = /^(pdf|docx|word)\b/i;

/**
 * Runs in the page. Self-contained: no closures, no imports.
 * Returns a plain, serializable description of what a customer can see and use.
 */
export function collectReviewDom() {
  const text = (value) => (value || "").replace(/\s+/g, " ").trim();
  const visible = (el) => {
    if (el.closest("[hidden]") || el.closest("[aria-hidden='true']")) return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  };
  const accessibleName = (el) => {
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const label = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ");
      if (text(label)) return text(label);
    }
    // innerText keeps the visual word breaks ("PDF Clean, ready to send"); textContent runs them together.
    return text(el.getAttribute("aria-label") || el.innerText || el.textContent || el.getAttribute("title") || el.getAttribute("value") || el.getAttribute("alt") || "");
  };
  const roleOf = (el) => {
    const explicit = el.getAttribute("role");
    if (explicit) return explicit;
    const tag = el.tagName.toLowerCase();
    if (tag === "a" && el.hasAttribute("href")) return "link";
    if (tag === "button" || (tag === "input" && /^(button|submit|reset|image)$/i.test(el.type))) return "button";
    if (tag === "select") return "combobox";
    return tag;
  };
  const disabledOf = (el) => el.disabled === true || el.getAttribute("aria-disabled") === "true" || Boolean(el.closest("fieldset:disabled"));

  const interactive = document.querySelectorAll(
    "a[href], area[href], button, input[type=button], input[type=submit], input[type=image], [role=button], [role=link], [role=menuitem], [download], [onclick], form[action]",
  );
  const controls = [...interactive].map((el) => ({
    tag: el.tagName.toLowerCase(),
    role: roleOf(el),
    name: accessibleName(el),
    href: el.tagName === "FORM" ? el.action || null : el.getAttribute("href") ? el.href : null,
    hasDownloadAttribute: el.hasAttribute("download"),
    type: el.getAttribute("type"),
    disabled: disabledOf(el),
    visible: visible(el),
    unlockRegion: Boolean(el.closest(".rb-unlock-bar, .rb-unpaid-card")),
    className: typeof el.className === "string" ? el.className : "",
  }));

  const embeds = [...document.querySelectorAll("iframe, embed, object, frame")].map((el) => ({
    tag: el.tagName.toLowerCase(),
    src: el.getAttribute("src") || el.getAttribute("data") || "",
    type: el.getAttribute("type") || "",
  }));

  // The review page mounts one preview at a time (resume tab by default).
  const previewGroup = document.querySelector(".rb-preview-panel .rb-pdf-pages[role=group]");
  const canvases = previewGroup ? [...previewGroup.querySelectorAll("canvas")] : [];
  const drawn = canvases.filter((canvas) => canvas.dataset.drawn === "true" && canvas.width > 0 && canvas.height > 0);

  const styleFieldset = document.querySelector("fieldset.rb-style-controls");
  const selects = styleFieldset ? [...styleFieldset.querySelectorAll("select")] : [];
  const themeGroup = document.querySelector("[role=radiogroup][aria-label='Resume system']");
  const radios = themeGroup ? [...themeGroup.querySelectorAll("[role=radio]")] : [];

  return {
    url: location.href,
    title: document.title,
    challenge: /Just a moment\.\.\.|Attention Required! \| Cloudflare/i.test(document.title)
      || Boolean(document.querySelector("#challenge-form, #cf-challenge-running, script[src*='/cdn-cgi/challenge-platform']")),
    controls,
    embeds,
    downloadsBlocks: document.querySelectorAll(".rb-downloads, .rb-download").length,
    viewer: {
      present: Boolean(previewGroup),
      label: previewGroup?.getAttribute("aria-label") || null,
      canvases: canvases.length,
      drawnCanvases: drawn.length,
      error: Boolean(document.querySelector(".rb-pdf-error")),
      toolbar: text([...document.querySelectorAll(".rb-preview-toolbar")].filter(visible).map((el) => el.textContent).join(" ")),
    },
    customization: {
      present: Boolean(styleFieldset),
      disabled: styleFieldset ? styleFieldset.disabled : null,
      visible: styleFieldset ? visible(styleFieldset) : false,
      selects: selects.map((select) => ({
        label: text(select.closest("label")?.firstChild?.textContent || ""),
        disabled: select.disabled || Boolean(select.closest("fieldset:disabled")),
        options: select.options.length,
        value: select.value,
      })),
    },
    templates: {
      present: Boolean(themeGroup),
      radios: radios.map((radio) => ({
        name: text(radio.querySelector(".rb-trade-card-name")?.textContent || radio.textContent),
        checked: radio.getAttribute("aria-checked") === "true",
        disabled: radio.disabled === true || radio.getAttribute("aria-disabled") === "true",
        visible: visible(radio),
      })),
    },
  };
}

/** Runs in the page. True once the preview has drawn (or failed) and the controls exist. */
export function reviewReadyState() {
  if (/Just a moment\.\.\.|Attention Required! \| Cloudflare/i.test(document.title)) return "challenge";
  if (document.querySelector(".rb-pdf-error")) return "viewer-error";
  const drawn = document.querySelector(".rb-pdf-pages[role=group] canvas[data-drawn='true']");
  const controls = document.querySelector("fieldset.rb-style-controls") && document.querySelector("[role=radiogroup][aria-label='Resume system']");
  return drawn && controls ? "ready" : "loading";
}

const describe = (control) => `${control.tag}${control.role !== control.tag ? `[role=${control.role}]` : ""} "${control.name || "(no name)"}"${control.href ? ` → ${pathOf(control.href)}` : ""}${control.disabled ? " (disabled)" : ""}${control.visible ? "" : " (hidden)"}`;
const pathOf = (value) => { try { const url = new URL(value); return `${url.pathname}${url.search}`; } catch { return value; } };

/** A checkout trigger: the structure the product renders, never a file link. */
export function isCheckoutButton(control) {
  return control.unlockRegion && control.tag === "button" && control.type === "button" && !control.href && !control.hasDownloadAttribute;
}

/**
 * Pure verdict on one collected page. `regressions` means an unpaid customer can
 * see or use a Download / Print path (UI regression). `broken` means the viewer
 * or the free customization/template controls did not render usably.
 */
export function inspectUnpaidReview(snapshot, requests = []) {
  const regressions = [];
  const broken = [];

  // ---- Download ------------------------------------------------------------
  if (snapshot.downloadsBlocks > 0) {
    regressions.push(`Download control rendered: ${snapshot.downloadsBlocks} .rb-downloads/.rb-download element(s) on an unpaid resume (product removes them until paid)`);
  }
  for (const control of snapshot.controls) {
    const href = control.href || "";
    const coverLetter = href.match(COVER_LETTER_FILE);
    if (control.hasDownloadAttribute) {
      regressions.push(`Download control rendered: ${describe(control)} has a download attribute`);
    } else if (CLEAN_RESUME_FILE.test(href) || coverLetter) {
      const print = /(?:^|[?&])view=1(?:&|#|$)/.test(href);
      regressions.push(`${print ? "Print" : "Download"} control rendered: ${describe(control)} links to a clean file endpoint`);
    } else if (DOWNLOAD_OR_PRINT_NAME.test(control.name) || FILE_FORMAT_NAME.test(control.name)) {
      if (isCheckoutButton(control) && !/\bprint/i.test(control.name)) continue; // "Unlock & download" starts checkout
      const kind = /\bprint/i.test(control.name) || /⎙|🖨/.test(control.name) ? "Print" : "Download";
      regressions.push(`${kind} control rendered: ${describe(control)}${control.disabled ? " — present but disabled; the product removes it until paid" : ""}`);
    }
  }

  // ---- Print / native viewer ----------------------------------------------
  for (const embed of snapshot.embeds) {
    if (/pdf|\/files\//i.test(`${embed.src} ${embed.type}`)) {
      regressions.push(`Print/Download path exposed: <${embed.tag}> embeds ${pathOf(embed.src) || embed.type}; a native PDF viewer offers its own Download and Print buttons`);
    }
  }

  // ---- What the page fetched ----------------------------------------------
  for (const request of requests) {
    const coverLetter = request.url.match(COVER_LETTER_FILE);
    const coverLetterClean = coverLetter && !(coverLetter[1] === "pdf" && /(?:^|&)view=1(?:&|$)/.test(coverLetter[2] || ""));
    if (CLEAN_RESUME_FILE.test(request.url) || coverLetterClean) {
      regressions.push(`page requested a clean file on an unpaid resume: ${request.method} ${pathOf(request.url)}`);
    } else if (CHECKOUT.test(request.url)) {
      regressions.push(`page started checkout without a click: ${request.method} ${pathOf(request.url)}`);
    }
  }

  // ---- Viewer renders normally ---------------------------------------------
  const viewer = snapshot.viewer;
  if (!viewer.present) broken.push("protected resume preview not rendered");
  else {
    if (viewer.error) broken.push("protected preview shows its error state");
    if (viewer.drawnCanvases < 1) broken.push(`protected preview drew no pages (${viewer.canvases} canvas element(s))`);
    if (!/^Watermarked resume preview/i.test(viewer.label || "")) broken.push(`preview is not the watermarked unpaid resume preview (label "${viewer.label}")`);
  }
  if (!/Protected watermarked preview/i.test(viewer.toolbar)) broken.push(`preview toolbar does not say "Protected watermarked preview" (got "${viewer.toolbar}")`);

  // ---- Free controls stay usable -------------------------------------------
  const custom = snapshot.customization;
  if (!custom.present) broken.push("customization controls not rendered");
  else {
    if (custom.disabled) broken.push("customization fieldset is disabled");
    if (!custom.visible) broken.push("customization controls are hidden");
    if (custom.selects.length < 4) broken.push(`expected 4 customization selects (font, text size, spacing, accent), found ${custom.selects.length}`);
    for (const select of custom.selects) {
      if (select.disabled) broken.push(`customization select "${select.label}" is disabled`);
      if (select.options < 2) broken.push(`customization select "${select.label}" has ${select.options} option(s)`);
    }
  }
  const templates = snapshot.templates;
  if (!templates.present) broken.push("template (resume system) picker not rendered");
  else {
    if (templates.radios.length < 3) broken.push(`expected Field Pro, Modern Trade and Lead / Supervisor, found ${templates.radios.length} template(s)`);
    for (const radio of templates.radios) {
      if (radio.disabled) broken.push(`template "${radio.name}" is disabled`);
      if (!radio.visible) broken.push(`template "${radio.name}" is hidden`);
    }
    if (templates.radios.filter((radio) => radio.checked).length !== 1) broken.push("template picker does not have exactly one selected template");
  }

  return { regressions, broken };
}

/**
 * Opens the review page for each viewport and returns what it found. Throws
 * BrowserUnavailable (infrastructure) or CloudflareChallenge (edge); everything
 * else about the page is reported in the results, never thrown.
 */
export async function checkUnpaidReviewInBrowser({
  origin, resumeId, sessionCookie, bypassToken = "", userAgent, viewports = VIEWPORTS, timeoutMs = 45_000, chromePath,
}) {
  const site = new URL(origin);
  const [name, ...rest] = sessionCookie.split("=");
  const value = rest.join("=");
  const browser = await launchChrome(chromePath ? { chromePath } : {});
  const results = [];
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage();
      const requests = [];
      const blockedHosts = new Set();
      let documentHeaders = null;
      const stopPaused = page.on("Fetch.requestPaused", ({ requestId, request }) => {
        const url = new URL(request.url);
        if (url.origin === site.origin) {
          requests.push({ method: request.method, url: request.url });
          // The edge bypass token only ever goes to our own origin.
          const headers = Object.entries(request.headers).map(([header, headerValue]) => ({ name: header, value: headerValue }));
          if (bypassToken) headers.push({ name: "X-Smoke-Token", value: bypassToken });
          void page.send("Fetch.continueRequest", { requestId, headers }).catch(() => {});
        } else if (url.protocol === "data:" || url.protocol === "blob:") {
          void page.send("Fetch.continueRequest", { requestId }).catch(() => {});
        } else {
          // Third parties (GA4, Meta, fonts CDNs): never loaded by smoke traffic.
          blockedHosts.add(url.host);
          void page.send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }).catch(() => {});
        }
      });
      const stopResponse = page.on("Network.responseReceived", ({ type, response }) => {
        if (type === "Document" && response.url.startsWith(site.origin)) documentHeaders = response.headers;
      });
      try {
        await page.send("Network.enable");
        await page.send("Page.enable");
        await page.send("Runtime.enable");
        await page.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
        if (userAgent) await page.send("Network.setUserAgentOverride", { userAgent });
        await page.send("Emulation.setDeviceMetricsOverride", {
          width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.deviceScaleFactor, mobile: viewport.mobile,
        });
        await page.send("Network.setCookie", {
          name, value, url: site.origin, path: "/", httpOnly: true, secure: site.protocol === "https:", sameSite: "Lax",
        });
        await page.send("Page.navigate", { url: `${site.origin}/resume-builder/review?resume_id=${encodeURIComponent(resumeId)}` });

        const evaluate = async (fn) => {
          const { result, exceptionDetails } = await page.send("Runtime.evaluate", {
            expression: `(${fn.toString()})()`, returnByValue: true, awaitPromise: true,
          });
          if (exceptionDetails) throw new Error(`page script failed: ${exceptionDetails.text}`);
          if (!result || result.value === undefined) throw new Error(`page script returned no value (${result?.type || "no result"}${result?.subtype ? `/${result.subtype}` : ""})`);
          return result.value;
        };

        const deadline = Date.now() + timeoutMs;
        let state = "loading";
        while (Date.now() < deadline) {
          if (Object.entries(documentHeaders || {}).some(([header, headerValue]) => header.toLowerCase() === "cf-mitigated" && /challenge/i.test(headerValue))) {
            state = "challenge";
            break;
          }
          state = await evaluate(reviewReadyState).catch(() => "loading");
          if (state !== "loading") break;
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        if (state === "challenge") {
          throw new CloudflareChallenge("GET /resume-builder/review: Cloudflare challenge (cf-mitigated) — the edge skip rule for smoke traffic is missing or not matching.");
        }
        // Let any late renders and requests settle before judging the page.
        await new Promise((resolve) => setTimeout(resolve, 750));
        const snapshot = await evaluate(collectReviewDom);
        const verdict = inspectUnpaidReview(snapshot, requests);
        if (state === "loading") verdict.broken.unshift(`review page did not finish rendering within ${timeoutMs} ms`);
        results.push({
          viewport: viewport.name,
          snapshot,
          requests: requests.map((request) => `${request.method} ${pathOf(request.url)}`),
          blockedHosts: [...blockedHosts].sort(),
          ...verdict,
        });
      } finally {
        stopPaused();
        stopResponse();
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  return results;
}
