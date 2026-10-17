/**
 * Browser-level inspection of the Resume Builder review page for the smoke runner.
 *
 * Opens /resume-builder/review as the signed-in smoke account in headless Chrome
 * and reports what an unpaid customer can see and use. It never changes server
 * state: every non-GET request the page makes is answered inside the browser
 * (it never leaves the machine), third-party requests (analytics, pixels, Stripe,
 * fonts) are blocked, and downloads are denied and counted.
 *
 * It returns facts; the runner decides pass/fail.
 */
import { BrowserUnavailable, findChrome, launchBrowser, openPage } from "./cdp-browser.mjs";

export const PREVIEW_TITLE = "Watermarked resume preview with locked lines";
export const CHECKOUT_INTERCEPT_MESSAGE = "Smoke run: checkout intercepted in the browser; nothing was sent.";
const FILE_PATH = /\/api\/resume-builder\/resumes\/[^/]+\/files\/(?!preview\b)/;

// --- In-page functions (serialized into the page; must be self-contained) ---

function scanPage(previewTitle) {
  const visible = (el) => {
    if (el.closest("[hidden], [inert], [aria-hidden='true']")) return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  };
  const enabled = (el) => !el.matches(":disabled") && el.getAttribute("aria-disabled") !== "true";
  const nameOf = (el) => {
    const ids = el.getAttribute("aria-labelledby");
    const labelled = ids ? ids.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ") : "";
    return (el.getAttribute("aria-label") || labelled || el.textContent || el.getAttribute("title") || el.value || "")
      .replace(/\s+/g, " ").trim();
  };
  const describe = (el) => ({
    tag: el.tagName.toLowerCase(),
    role: el.getAttribute("role") || null,
    name: nameOf(el).slice(0, 120),
    visible: visible(el),
    actionable: visible(el) && enabled(el),
  });
  // The two checkout buttons ("Unlock full resume + cover letter — $9.99" in the
  // unlock card, "Unlock & download" in the sticky bar) start Stripe checkout.
  const checkoutCta = (el) => el.tagName === "BUTTON" && el.type === "button" && !el.hasAttribute("formaction")
    && Boolean(el.closest(".rb-unlock-bar, #unlock-package"));

  const interactive = [...document.querySelectorAll(
    "a[href], button, input[type='button'], input[type='submit'], [role='button'], [role='link'], [role='menuitem']",
  )];
  const fileLinks = [...document.querySelectorAll("a[href], [download]")].filter((el) => {
    if (el.hasAttribute("download")) return true;
    try { return /\/api\/resume-builder\/resumes\/[^/]+\/files\/(?!preview\b)/.test(new URL(el.getAttribute("href"), location.href).pathname); }
    catch { return false; }
  }).map((el) => ({ ...describe(el), href: el.getAttribute("href") }));
  const named = interactive.filter((el) => /\b(download|print|save as pdf)\b/i.test(nameOf(el)))
    .map((el) => ({ ...describe(el), checkoutCta: checkoutCta(el) }));

  const group = document.querySelector(`[role='group'][aria-label="${previewTitle}"]`);
  const canvases = group ? [...group.querySelectorAll("canvas")] : [];
  const drawn = canvases.filter((canvas) => canvas.dataset.drawn === "true" && canvas.width > 0 && canvas.height > 0);
  let inkRatio = 0;
  const first = drawn.find((canvas) => !canvas.hidden);
  if (first) {
    const { data } = first.getContext("2d").getImageData(0, 0, first.width, first.height);
    let ink = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0 && data[i] + data[i + 1] + data[i + 2] < 600) ink += 1;
    inkRatio = ink / (data.length / 4);
  }

  const radios = [...document.querySelectorAll("[role='radiogroup'][aria-label='Resume system'] [role='radio']")]
    .map((el) => ({ name: el.querySelector(".rb-trade-card-name")?.textContent?.trim() ?? nameOf(el), checked: el.getAttribute("aria-checked") === "true", actionable: visible(el) && enabled(el) }));
  const fieldset = document.querySelector("fieldset.rb-style-controls");
  const selects = fieldset ? [...fieldset.querySelectorAll("label")].map((label) => {
    const select = label.querySelector("select");
    return { label: label.firstChild?.textContent?.trim() ?? "", value: select?.value ?? null, actionable: Boolean(select) && visible(select) && enabled(select) };
  }) : [];

  return {
    url: location.pathname + location.search,
    toolbar: document.querySelector(".rb-preview-toolbar")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
    viewer: { present: Boolean(group), busy: group?.getAttribute("aria-busy") ?? null, canvases: canvases.length, drawn: drawn.length, inkRatio },
    viewerError: document.querySelector(".rb-pdf-error")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
    nativeViewers: document.querySelectorAll("iframe, embed, object").length,
    downloadSections: document.querySelectorAll(".rb-downloads, .rb-download").length,
    fileLinks,
    named,
    radios,
    selects,
    alerts: [...document.querySelectorAll("[role='alert']")].map((el) => el.textContent.replace(/\s+/g, " ").trim()),
    printCalls: window.__smokePrintCalls ?? 0,
  };
}

function viewerReady(previewTitle) {
  const group = document.querySelector(`[role='group'][aria-label="${previewTitle}"]`);
  if (document.querySelector(".rb-pdf-error")) return "error";
  return group?.getAttribute("aria-busy") === "false" && group.querySelector("canvas[data-drawn='true']") ? "ready" : null;
}

const zoomLabel = () => document.querySelector(".rb-pdf-controls [aria-live]")?.textContent ?? null;

function visibleCheckoutSelector() {
  for (const css of ["#unlock-package button[type='button']", ".rb-unlock-bar button[type='button']"]) {
    const el = document.querySelector(css);
    if (el && !el.closest("[hidden]") && !el.disabled && el.getBoundingClientRect().height > 0) return css;
  }
  return null;
}

// Runs before any page script: count print() calls instead of opening a dialog.
const PRINT_HOOK = "Object.defineProperty(window, '__smokePrintCalls', { value: 0, writable: true }); window.print = function () { window.__smokePrintCalls += 1; };";

/**
 * @returns {Promise<object>} facts about the page, before and after a checkout click.
 * Throws BrowserUnavailable when no browser can be started.
 */
export async function inspectUnpaidReviewUi({ origin, sessionCookie, bypassToken, resumeId, timeoutMs = 45_000 }) {
  const executable = findChrome();
  if (!executable) throw new BrowserUnavailable("no Chrome/Chromium found (set SMOKE_CHROME_PATH)");
  const browser = await launchBrowser(executable);
  const traffic = { thirdPartyBlocked: 0, mutations: [], fileRequests: [], downloads: 0, cloudflareChallenge: false, documentStatus: null };
  try {
    const page = await openPage(browser);
    const site = new URL(origin);
    const [cookieName, ...cookieValue] = sessionCookie.split("=");

    browser.on((method) => { if (method === "Browser.downloadWillBegin") traffic.downloads += 1; });
    await browser.send("Browser.setDownloadBehavior", { behavior: "deny", eventsEnabled: true });
    page.on((method, params) => {
      if (method === "Network.responseReceived" && params.type === "Document" && new URL(params.response.url).origin === site.origin) {
        const headers = Object.fromEntries(Object.entries(params.response.headers).map(([key, value]) => [key.toLowerCase(), value]));
        if (headers["cf-mitigated"] === "challenge") traffic.cloudflareChallenge = true;
        traffic.documentStatus = params.response.status;
      }
      if (method !== "Fetch.requestPaused") return;
      const { requestId, request } = params;
      const url = new URL(request.url);
      if (url.origin !== site.origin) {
        traffic.thirdPartyBlocked += 1;
        void page.send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }).catch(() => {});
        return;
      }
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
        traffic.mutations.push({ method: request.method, path: url.pathname });
        const checkout = /\/api\/resume-builder\/resumes\/[^/]+\/checkout$/.test(url.pathname);
        const body = JSON.stringify({ ok: false, message: checkout ? CHECKOUT_INTERCEPT_MESSAGE : "Smoke run: request intercepted in the browser." });
        void page.send("Fetch.fulfillRequest", {
          requestId, responseCode: 503,
          responseHeaders: [{ name: "Content-Type", value: "application/json" }, { name: "Cache-Control", value: "no-store" }],
          body: Buffer.from(body).toString("base64"),
        }).catch(() => {});
        return;
      }
      if (FILE_PATH.test(url.pathname)) traffic.fileRequests.push(url.pathname.replace(/\/resumes\/[^/]+\//, "/resumes/{id}/"));
      const headers = Object.entries(request.headers).map(([name, value]) => ({ name, value }));
      if (bypassToken) headers.push({ name: "X-Smoke-Token", value: bypassToken });
      void page.send("Fetch.continueRequest", { requestId, headers }).catch(() => {});
    });

    await page.send("Network.enable");
    // A service worker's requests would bypass page interception; never use one.
    await page.send("Network.setBypassServiceWorker", { bypass: true });
    await page.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
    await page.send("Page.enable");
    await page.send("Page.addScriptToEvaluateOnNewDocument", { source: PRINT_HOOK });
    await page.send("Network.setCookie", {
      name: cookieName, value: cookieValue.join("="), url: site.origin, path: "/",
      httpOnly: true, secure: site.protocol === "https:", sameSite: "Lax",
    });
    await page.send("Page.navigate", { url: `${site.origin}/resume-builder/review?resume_id=${encodeURIComponent(resumeId)}` });

    const ready = await page.waitFor(viewerReady, { timeoutMs, args: [PREVIEW_TITLE] });
    const initial = await page.evaluate(scanPage, PREVIEW_TITLE);
    const result = { traffic, ready, initial, hydration: null, checkout: null, afterCheckout: null };
    if (ready !== "ready") return result;

    // Client-only interaction proves the page is hydrated and responsive.
    const zoomBefore = await page.evaluate(zoomLabel);
    const zoomClicked = await page.click(".rb-pdf-controls button[aria-label='Zoom in']");
    const zoomAfter = await page.waitFor((before) => {
      const now = document.querySelector(".rb-pdf-controls [aria-live]")?.textContent;
      return now && now !== before ? now : null;
    }, { timeoutMs: 5_000, args: [zoomBefore] });
    await page.click(".rb-pdf-controls button:not([aria-label])");
    result.hydration = { zoomClicked, zoomBefore, zoomAfter };

    // The only download-named control for an unpaid resume is the checkout button.
    // Click it with checkout intercepted: it must start checkout, not deliver files.
    const ctaSelector = await page.evaluate(visibleCheckoutSelector);
    const mutationsBefore = traffic.mutations.length;
    if (ctaSelector) {
      const ctaName = await page.evaluate((css) => document.querySelector(css)?.textContent?.replace(/\s+/g, " ").trim(), ctaSelector);
      const clicked = await page.click(ctaSelector);
      const alert = await page.waitFor((message) => [...document.querySelectorAll("[role='alert']")]
        .map((el) => el.textContent.replace(/\s+/g, " ").trim()).find((text) => text.includes(message)) ?? null,
      { timeoutMs: 10_000, args: [CHECKOUT_INTERCEPT_MESSAGE] });
      await new Promise((resolve) => setTimeout(resolve, 500));
      result.checkout = {
        selector: ctaSelector,
        name: ctaName,
        clicked,
        requests: traffic.mutations.slice(mutationsBefore),
        alert,
        url: await page.evaluate(() => location.pathname + location.search),
      };
      result.afterCheckout = await page.evaluate(scanPage, PREVIEW_TITLE);
    }
    return result;
  } finally {
    await browser.close();
  }
}
