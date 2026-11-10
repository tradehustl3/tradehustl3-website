import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { FIND_YOUR_LANE_CHECKED_ON, findYourLaneCards } from "../app/home-find-your-lane-data";
import { credentialBySlug } from "../app/resources/credential-library";
import { TRADE_CAREER_FAMILIES } from "../app/resume-examples/trade-career-catalog";

const cards = findYourLaneCards();
const pageExists = (href: string) => existsSync(`app/${href.split("#")[0].replace(/^\//, "")}/page.tsx`);

test("Find Your Lane shows the eight approved trades in order", () => {
  assert.deepEqual(
    cards.map((card) => card.title),
    ["HVAC & Refrigeration", "Electrical", "Plumbing", "Welding & Fabrication", "Construction", "Facilities Maintenance", "Heavy Equipment", "General Labor"],
  );
  assert.equal(new Set(cards.map((card) => card.id)).size, 8, "no duplicate trades");
});

test("every card answers what the work is, how to start, and which credentials apply", () => {
  for (const card of cards) {
    assert.ok(card.tagline.length > 0, `${card.id}: tagline`);
    assert.ok(card.work.length >= 50, `${card.id}: what the worker does`);
    assert.ok(card.start.length >= 50, `${card.id}: how to get started`);
    assert.ok(card.credentials.length >= 2 && card.credentials.length <= 3, `${card.id}: 2–3 credentials`);
  }
});

test("card credentials come from the library and are mapped to that trade", () => {
  for (const card of cards) {
    for (const credential of card.credentials) {
      const record = credentialBySlug(credential.slug);
      if (!record) throw new Error(`${card.id}: unknown credential ${credential.slug}`);
      assert.ok(record.tradeSlugs.includes(card.id), `${credential.slug} is not mapped to ${card.id}`);
      assert.equal(credential.href, `/resources/certifications#${credential.slug}`);
    }
  }
  // The key credential leads where the trade has one (facilities sets its own order).
  assert.equal(cards.find((card) => card.id === "hvac-refrigeration")?.credentials[0].slug, "epa-608");
  assert.equal(cards.find((card) => card.id === "welding-fabrication-machining")?.credentials[0].slug, "aws-certified-welder");
  assert.deepEqual(cards.find((card) => card.id === "facilities-property-apartment-maintenance")?.credentials.map((c) => c.slug), ["epa-608", "camt", "osha-outreach-10-30"]);
});

test("every fact cites a BLS Occupational Outlook Handbook page and was checked on a real date", () => {
  assert.match(FIND_YOUR_LANE_CHECKED_ON, /^\d{4}-\d{2}-\d{2}$/);
  for (const card of cards) {
    assert.match(card.source.url, /^https:\/\/www\.bls\.gov\/ooh\/[a-z-]+\/[a-z-]+\.htm$/, card.id);
    assert.match(card.source.label, /^BLS — /, card.id);
  }
});

test("cards make no pay, hiring, or outcome promises", () => {
  const copy = cards.flatMap((card) => [card.tagline, card.work, card.start]).join(" ");
  assert.doesNotMatch(copy, /guarantee|get hired|\$\d|per hour|salary|income|six figures/i);
});

test("every card links to pages and photos that exist today", () => {
  for (const card of cards) {
    assert.ok(pageExists(card.exploreHref), `${card.id}: ${card.exploreHref}`);
    assert.equal(card.exploreHref, `/resources/certifications#trade-${card.id}`);
    assert.ok(pageExists(card.tradePageHref) || existsSync(`app${card.tradePageHref}`), `${card.id}: ${card.tradePageHref}`);
    assert.equal(card.tradePageHref, TRADE_CAREER_FAMILIES.find((family) => family.slug === card.id)?.guideHref);
    assert.ok(existsSync(`public${card.image.src}`), `${card.id}: ${card.image.src}`);
    assert.ok(card.image.alt.length >= 20, `${card.id}: descriptive alt text`);
  }
});
