import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CATALOG_METRICS } from "../app/resume-examples/catalog-metrics";
import { MAPPED_ROLE_COUNT, TRADE_CAREER_FAMILIES } from "../app/resume-examples/trade-career-catalog";
import { TRADE_GUIDANCE, TRADE_TRACKS } from "../app/resume-builder/trade-content";
import { inferResumeTrade } from "../app/resume-builder/intake/resume-upload";
import { resolveTradeParam, slugForTradeTrack } from "../app/resume-builder/trade-preselect";

test("catalog publishes fourteen unique career families and 207 unique job titles", () => {
  assert.equal(TRADE_CAREER_FAMILIES.length, 14);
  assert.equal(MAPPED_ROLE_COUNT, 207);
  assert.equal(new Set(TRADE_CAREER_FAMILIES.map((family) => family.slug)).size, 14);
  assert.equal(new Set(TRADE_CAREER_FAMILIES.flatMap((family) => family.roles)).size, 207);
});

test("every catalog family is a live, round-trippable guided builder track", () => {
  assert.equal(TRADE_TRACKS.length, 14);
  assert.equal(CATALOG_METRICS.guidedTracks, 14);
  assert.equal(CATALOG_METRICS.detailedGuides, 7);

  for (const family of TRADE_CAREER_FAMILIES) {
    assert.ok(TRADE_TRACKS.includes(family.builderTrack), `${family.name} is not a builder track`);
    assert.equal(resolveTradeParam(slugForTradeTrack(family.builderTrack)), family.builderTrack);

    const guidance = TRADE_GUIDANCE[family.builderTrack];
    assert.ok(guidance.tagline.length > 25, `${family.name} needs a useful tagline`);
    assert.ok(guidance.workHistory.length > 100, `${family.name} needs work-history guidance`);
    assert.ok(guidance.fieldValue.length > 80, `${family.name} needs field-value guidance`);
    for (const [label, values] of Object.entries({
      tools: guidance.tools,
      equipmentSystems: guidance.equipmentSystems,
      certifications: guidance.certifications,
      technicalSkills: guidance.technicalSkills,
      dutyCategories: guidance.dutyCategories,
    })) {
      assert.ok(values.length >= 9, `${family.name} needs at least 9 ${label}`);
    }
  }
});

test("commercial-driving coverage includes freight, public passenger, private passenger, and delivery roles", () => {
  const driving = TRADE_CAREER_FAMILIES.find((family) => family.slug === "commercial-driving-transportation");
  assert.ok(driving);
  for (const role of [
    "Class A CDL Driver",
    "Dump Truck Driver",
    "School Bus Driver",
    "Public Transit Bus Driver",
    "Paratransit Driver",
    "Chauffeur",
    "Black Car Driver",
    "Local Delivery Driver",
    "Medical Transport Driver",
  ]) {
    assert.ok(driving.roles.includes(role), `commercial-driving catalog missing ${role}`);
  }
});

test("uploaded resumes can infer each newly supported career family", () => {
  const cases = [
    ["CDL driver with ELD, DOT medical card, and pre-trip inspection experience", "Commercial Driving & Transportation"],
    ["Forklift operator using RF scanners for order picking and cycle counts", "Warehouse, Logistics & Material Handling"],
    ["Industrial maintenance mechanic repairing conveyors, PLC controls, motors and gearboxes", "Industrial & Warehouse Maintenance"],
    ["Groundskeeper completing lawn care, irrigation repairs, and commercial mower routes", "Landscaping & Grounds Maintenance"],
    ["Heavy equipment operator running excavators for road construction and paving", "Roadwork, Paving, Concrete & Heavy Equipment"],
    ["Commercial roofer installing TPO and EPDM systems with fall protection", "Roofing & Exterior Trades"],
    ["Diesel technician completing fleet maintenance, air-brake repairs, and scan-tool diagnostics", "Automotive, Diesel & Fleet Maintenance"],
  ] as const;

  for (const [resumeText, expected] of cases) assert.equal(inferResumeTrade(resumeText), expected);
});

test("public catalog counters are derived from committed content", () => {
  assert.equal(CATALOG_METRICS.careerFamilies, TRADE_CAREER_FAMILIES.length);
  assert.equal(CATALOG_METRICS.mappedRoles, MAPPED_ROLE_COUNT);
  assert.equal(CATALOG_METRICS.guidedTracks, TRADE_TRACKS.length);
  assert.ok(CATALOG_METRICS.fieldPrompts >= 400);
  assert.equal(CATALOG_METRICS.accomplishmentExamples, 50);
});

test("worker allowlist and generation prompt cover every public builder track", async () => {
  const worker = await readFile(new URL("../worker/resume-builder-base.ts", import.meta.url), "utf8");
  for (const track of TRADE_TRACKS) assert.ok(worker.includes(`"${track}"`), `worker missing ${track}`);
  assert.match(worker, /one of fourteen supported trade tracks/i);
});
