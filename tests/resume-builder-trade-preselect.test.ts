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
  assert.equal(resolveTradeParam("cdl-driver"), "Commercial Driving & Transportation");
  assert.equal(resolveTradeParam("school-bus-driver"), "Commercial Driving & Transportation");
  assert.equal(resolveTradeParam("industrial-maintenance"), "Industrial & Warehouse Maintenance");
  assert.equal(resolveTradeParam("roofing"), "Roofing & Exterior Trades");
  assert.equal(resolveTradeParam("heavy-equipment-operator"), "Roadwork, Paving, Concrete & Heavy Equipment");
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
  assert.equal(intakeEntryHref("HVAC & Refrigeration"), "/?trade=hvac#resume-start");
  assert.equal(intakeWizardHref("HVAC & Refrigeration"), "/resume-builder/intake?trade=hvac");
  assert.equal(intakeEntryHref("Electrical"), "/?trade=electrician#resume-start");
  assert.equal(intakeEntryHref("Facilities Maintenance"), "/?trade=facilities-maintenance#resume-start");
  assert.equal(intakeEntryHref("Commercial Driving & Transportation"), "/?trade=commercial-driving-transportation#resume-start");
});

test("every published trade landing page preselects a real, resolvable trade", () => {
  const slugs = TRADE_LANDING_PAGES.map((page) => page.slug);
  assert.deepEqual(slugs, [
    "hvac",
    "facilities-maintenance",
    "electrician",
    "plumbing",
    "welding-fabrication",
    "construction-carpentry",
    "general-labor",
    "heavy-equipment-operator",
  ]);
  // Eight detailed SEO guides reuse fourteen existing guided builder tracks.
  // Heavy Equipment Operator has a focused SEO slug but shares the canonical roadwork intake track.
  assert.equal(TRADE_LANDING_PAGES.length, 8);
  assert.equal(TRADE_TRACKS.length, 14);
  assert.equal(new Set(slugs).size, slugs.length);

  for (const page of TRADE_LANDING_PAGES) {
    // An SEO landing slug may be an alias of a broader canonical intake trade.
    // Both the visible page path and the canonical intake slug must resolve to the same track.
    assert.equal(resolveTradeParam(page.slug), page.trade, `${page.slug} does not resolve`);
    assert.equal(tradeTrackFromSlug(slugForTradeTrack(page.trade)), page.trade, `${page.slug} canonical track mismatch`);
    // The CTA must use the supported canonical trade slug (not an unsupported new track).
    assert.equal(intakeEntryHref(page.trade), `/?trade=${slugForTradeTrack(page.trade)}#resume-start`);
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
