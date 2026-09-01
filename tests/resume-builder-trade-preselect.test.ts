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
});
