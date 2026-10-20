import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  DEFAULT_HERO_TRADE,
  HERO_TRADES,
  heroCtaHref,
  heroCtaLabel,
  heroTradeFromParam,
} from "../app/home-hero-trades";
import { resolveTradeParam } from "../app/resume-builder/trade-preselect";

// The hero imports a CSS module. Node cannot load CSS, so require the component
// (tsx compiles it) with .css files stubbed to class names equal to their keys.
const require = createRequire(import.meta.url);
require.extensions[".css"] = (module) => {
  module.exports = new Proxy({}, { get: (_, key) => (key === "__esModule" ? false : String(key)) });
};
const { HomeHero } = require("../app/home-hero.tsx") as typeof import("../app/home-hero");

const render = (initialTradeId?: string) => renderToString(createElement(HomeHero, { initialTradeId }));
const ctaTag = (html: string) => html.match(/<a\b[^>]*data-hero-cta[^>]*>/)?.[0] ?? "";
const decode = (value: string) => value.replace(/<!-- -->/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'");

test("the hero offers exactly the six approved trades as real toggle buttons", () => {
  assert.deepEqual(HERO_TRADES.map((trade) => trade.label), ["HVAC", "Electrical", "Plumbing", "Facilities", "Welding", "Construction"]);
  const html = decode(render());
  const buttons = html.match(/<button\b[^>]*>/g) ?? [];
  assert.equal(buttons.length, 6);
  for (const button of buttons) {
    assert.match(button, /type="button"/);
    assert.match(button, /aria-pressed="(true|false)"/);
    assert.match(button, /data-analytics-event="select_content"/);
  }
});

test("default render without a trade shows HVAC and links the CTA to the plain intake anchor", () => {
  const html = decode(render());
  assert.equal(DEFAULT_HERO_TRADE.id, "hvac");
  assert.match(html, /Build an <span[^>]*>HVAC tech<\/span> resume that looks ready for the job\./);
  assert.match(ctaTag(html), /href="#resume-start"/);
  assert.match(html, /Build my free HVAC preview/);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.match(html, /aria-pressed="true"[^>]*data-item="hvac"/);
  assert.match(html, /data-example-trade="hvac" data-active="true"/);
});

for (const trade of HERO_TRADES) {
  test(`picking ${trade.label} updates the headline word, example card and CTA`, () => {
    const html = decode(render(trade.id));
    assert.match(html, new RegExp(`Build ${trade.article} <span[^>]*>${trade.word}</span> resume`));
    assert.match(html, new RegExp(`aria-pressed="true"[^>]*data-item="${trade.id}"`));
    assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
    assert.match(html, new RegExp(`data-example-trade="${trade.id}" data-active="true"`));
    assert.equal((html.match(/data-active="true"/g) ?? []).length, 1);

    const href = heroCtaHref(trade);
    assert.match(href, /^\/\?trade=[a-z-]+#resume-start$/);
    assert.ok(ctaTag(html).includes(`href="${href}"`), `${trade.id} CTA href`);
    assert.match(html, new RegExp(heroCtaLabel(trade)));
    assert.equal(heroCtaLabel(trade), `Build my free ${trade.short} preview`);
  });
}

test("each picked trade's CTA preselects that trade in the existing intake", () => {
  for (const trade of HERO_TRADES) {
    const slug = new URL(heroCtaHref(trade), "https://tradehustl3.com").searchParams.get("trade");
    // The same resolver AccountStart and the intake wizard use for ?trade=.
    assert.equal(resolveTradeParam(slug), trade.track, `${trade.id} resolves to ${trade.track}`);
    assert.equal(heroTradeFromParam(slug)?.id, trade.id);
  }
});

test("a ?trade= from a landing page or campaign maps onto the hero trades", () => {
  assert.equal(heroTradeFromParam("electrician")?.id, "electrical");
  assert.equal(heroTradeFromParam("welding-fabrication")?.id, "welding");
  assert.equal(heroTradeFromParam("construction-carpentry")?.id, "construction");
  assert.equal(heroTradeFromParam("facilities-maintenance")?.id, "facilities");
  assert.equal(heroTradeFromParam("general-labor"), null, "trades without a hero chip keep the default");
  assert.equal(heroTradeFromParam("not-a-trade"), null);
  assert.equal(heroTradeFromParam(null), null);
});

test("the example card is labelled fictional and never claims a customer result", () => {
  const html = render();
  assert.match(html, /Fictional example\. Your resume uses only the facts you enter\./);
  assert.equal((html.match(/JORDAN TAYLOR/g) ?? []).length, HERO_TRADES.length);
  assert.doesNotMatch(html, /customer|testimonial|hired|interview/i);
});
