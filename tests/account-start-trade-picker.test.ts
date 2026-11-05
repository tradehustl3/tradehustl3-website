import assert from "node:assert/strict";
import test from "node:test";
import { HERO_TRADES } from "../app/home-hero-trades";
import { resolveTradeParam, withTradeParam } from "../app/resume-builder/trade-preselect";

// The email-step picker itself is covered against the built worker in
// homepage-first-impression-rendered.test.mjs (AccountStart pulls in next/script).

test("withTradeParam sets, replaces and removes ?trade= and keeps other params and the hash", () => {
  assert.equal(withTradeParam("/#resume-start", "Plumbing"), "/?trade=plumbing#resume-start");
  assert.equal(
    withTradeParam("/?trade=hvac&utm_source=facebook#resume-start", "Electrical"),
    "/?trade=electrician&utm_source=facebook#resume-start",
  );
  assert.equal(withTradeParam("/?utm_source=facebook&trade=hvac#resume-start", null), "/?utm_source=facebook#resume-start");
  assert.equal(withTradeParam("/#resume-start", null), "/#resume-start");
  assert.equal(
    withTradeParam("https://tradehustl3.com/?fbclid=abc#resume-start", "Welding & Fabrication"),
    "https://tradehustl3.com/?fbclid=abc&trade=welding-fabrication#resume-start",
  );
});

test("every hero trade written by withTradeParam resolves back to the same track", () => {
  for (const { track } of HERO_TRADES) {
    const href = withTradeParam("/#resume-start", track);
    assert.equal(resolveTradeParam(new URL(href, "https://example.test").searchParams.get("trade")), track);
  }
});
