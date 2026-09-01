import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_TRADE_SLUG,
  intakeEntryHref,
  intakeWizardHref,
  resolveTradeParam,
  slugForTradeTrack,
  tradeTrackFromSlug,
} from "../app/resume-builder/trade-preselect";
import { TRADE_TRACKS } from "../app/resume-builder/trade-content";
import { TRADE_LANDING_PAGES } from "../app/resume-builder/trade-landing-content";

test("resolveTradeParam accepts trade slugs from the landing pages", () => {
  assert.equal(resolveTradeParam("hvac"), "HVAC & Refrigeration");
  assert.equal(resolveTradeParam("HVAC"), "HVAC & Refrigeration");
  assert.equal(resolveTradeParam("hvac-refrigeration"), "HVAC & Refrigeration");
  assert.equal(resolveTradeParam("electrician"), "Electrical");
  assert.equal(resolveTradeParam("facilities-maintenance"), "Facilities Maintenance");
});

test("resolveTradeParam also accepts the exact trade-track name", () => {
  assert.equal(resolveTradeParam("HVAC & Refrigeration"), "HVAC & Refrigeration");
  assert.equal(resolveTradeParam("Welding & Fabrication"), "Welding & Fabrication");
});

test("resolveTradeParam rejects unknown or empty values", () => {
  assert.equal(resolveTradeParam(null), null);
  assert.equal(resolveTradeParam(""), null);
  assert.equal(resolveTradeParam("welder-supreme"), null);
  assert.equal(resolveTradeParam("<script>"), null);
});

test("every trade track has a canonical slug that round-trips", () => {
  for (const track of TRADE_TRACKS) {
    const slug = slugForTradeTrack(track);
    assert.equal(CANONICAL_TRADE_SLUG[track], slug);
    assert.equal(tradeTrackFromSlug(slug), track);
  }
});

test("intake hrefs carry the preselected trade slug", () => {
  assert.equal(intakeEntryHref("HVAC & Refrigeration"), "/resume-builder?trade=hvac");
  assert.equal(intakeWizardHref("HVAC & Refrigeration"), "/resume-builder/intake?trade=hvac");
  assert.equal(intakeEntryHref("Electrical"), "/resume-builder?trade=electrician");
  assert.equal(intakeEntryHref("Facilities Maintenance"), "/resume-builder?trade=facilities-maintenance");
});

test("every published trade landing page preselects a real, resolvable trade", () => {
  const slugs = TRADE_LANDING_PAGES.map((page) => page.slug);
  assert.deepEqual(slugs, ["hvac", "facilities-maintenance", "electrician"]);

  for (const page of TRADE_LANDING_PAGES) {
    // slug <-> track are consistent
    assert.equal(slugForTradeTrack(page.trade), page.slug, `${page.slug} slug/track mismatch`);
    assert.equal(resolveTradeParam(page.slug), page.trade, `${page.slug} does not resolve`);
    // the CTA target every page renders round-trips back to the same trade
    assert.equal(intakeEntryHref(page.trade), `/resume-builder?trade=${page.slug}`);
    assert.equal(resolveTradeParam(new URL(`https://x${intakeEntryHref(page.trade)}`).searchParams.get("trade")), page.trade);
    // metadata sanity
    assert.ok(page.seoTitle.includes("TRADE HUSTL3"), `${page.slug} title missing brand`);
    assert.ok(page.seoDescription.length > 60 && page.seoDescription.length <= 320, `${page.slug} description length`);
    assert.equal(page.faq.items.length >= 6, true, `${page.slug} needs a real FAQ`);
  }

  // titles and descriptions are all distinct (no "HVAC page with the name swapped")
  assert.equal(new Set(TRADE_LANDING_PAGES.map((p) => p.seoTitle)).size, TRADE_LANDING_PAGES.length);
  assert.equal(new Set(TRADE_LANDING_PAGES.map((p) => p.seoDescription)).size, TRADE_LANDING_PAGES.length);
});
