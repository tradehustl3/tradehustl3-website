import assert from "node:assert/strict";
import test from "node:test";
import {
  CREDENTIAL_LIBRARY,
  PENDING_CREDENTIALS,
  credentialBySlug,
  credentialsForTrade,
} from "../app/resources/credential-library";
import { TRADE_CAREER_FAMILIES } from "../app/resume-examples/trade-career-catalog";

const KINDS = new Set(["certification", "license", "training-card", "qualification"]);
const REQUIREMENTS = new Set(["federal", "state-or-local", "employer-preferred"]);
const FAMILY_SLUGS = new Set(TRADE_CAREER_FAMILIES.map((family) => family.slug));

test("credential slugs are unique and URL-safe", () => {
  const slugs = CREDENTIAL_LIBRARY.map((credential) => credential.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});

test("every credential has a valid kind and requirement", () => {
  for (const credential of CREDENTIAL_LIBRARY) {
    assert.ok(KINDS.has(credential.kind), `${credential.slug}: kind ${credential.kind}`);
    assert.ok(REQUIREMENTS.has(credential.requirement), `${credential.slug}: requirement ${credential.requirement}`);
  }
});

test("every credential cites official https sources and a verification date", () => {
  for (const credential of CREDENTIAL_LIBRARY) {
    assert.ok(credential.sources.length > 0, `${credential.slug} has no sources`);
    for (const url of [credential.officialUrl, ...credential.sources.map((source) => source.url)]) {
      assert.equal(new URL(url).protocol, "https:", `${credential.slug}: ${url}`);
    }
    assert.match(credential.lastVerified, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(!Number.isNaN(Date.parse(credential.lastVerified)), `${credential.slug}: bad date`);
    if (credential.cost) assert.equal(new URL(credential.cost.source.url).protocol, "https:");
  }
});

test("every trade mapping points at a real career family", () => {
  for (const credential of CREDENTIAL_LIBRARY) {
    assert.ok(credential.tradeSlugs.length > 0, `${credential.slug} maps to no trade`);
    for (const slug of credential.tradeSlugs) assert.ok(FAMILY_SLUGS.has(slug), `${credential.slug}: unknown trade ${slug}`);
  }
});

test("all 14 trade families have at least two credentials", () => {
  assert.equal(TRADE_CAREER_FAMILIES.length, 14);
  for (const family of TRADE_CAREER_FAMILIES) {
    assert.ok(credentialsForTrade(family.slug).length >= 2, `${family.slug} has fewer than two credentials`);
  }
});

test("training cards and employer qualifications are never called certifications in resume advice", () => {
  for (const credential of CREDENTIAL_LIBRARY) {
    if (credential.kind === "certification") continue;
    assert.doesNotMatch(credential.resumeTip.write, /certified|certification/i, `${credential.slug}: ${credential.resumeTip.write}`);
  }
});

test("OSHA Outreach is recorded as a training card, not a certification", () => {
  const osha = credentialBySlug("osha-outreach-10-30");
  assert.ok(osha);
  assert.equal(osha.kind, "training-card");
  assert.match(osha.summary, /not a certification/i);
  assert.equal(osha.tradeSlugs.length, 14);
});

test("EPA 608 records all four types and that it does not expire", () => {
  const epa = credentialBySlug("epa-608");
  assert.ok(epa);
  assert.deepEqual(epa.details?.map((detail) => detail.label), ["Type I", "Type II", "Type III", "Universal"]);
  assert.match(epa.renewal, /does not expire/i);
});

test("pending credentials are not also published in the library", () => {
  const published = new Set(CREDENTIAL_LIBRARY.map((credential) => credential.name.toLowerCase()));
  for (const pending of PENDING_CREDENTIALS) assert.ok(!published.has(pending.name.toLowerCase()), pending.name);
});

test("the reviewer and every myth are backed by library records", async () => {
  const { CREDENTIAL_MYTHS, CREDENTIAL_REVIEW } = await import("../app/resources/credential-library");
  assert.equal(CREDENTIAL_REVIEW.reviewer, "Zachary Ellis");
  assert.ok(CREDENTIAL_MYTHS.length >= 3);
  for (const myth of CREDENTIAL_MYTHS) assert.ok(credentialBySlug(myth.credentialSlug), `${myth.id} -> ${myth.credentialSlug}`);
});

test("homepage Know Your Trade data: seven picks, at most four credentials, general credentials last", async () => {
  const { knowYourTradeTrades, knowYourTradeMyths } = await import("../app/home-know-your-trade-data");
  const trades = knowYourTradeTrades();
  assert.deepEqual(trades.map((trade) => trade.label), ["HVAC", "Electrical", "Plumbing", "Facilities", "Welding", "Driving", "Construction"]);
  for (const trade of trades) {
    assert.ok(trade.credentials.length >= 2 && trade.credentials.length <= 4, trade.slug);
    const generalIndex = trade.credentials.findIndex((credential) => credential.slug === "osha-outreach-10-30");
    const specific = trade.credentials.filter((credential) => !["osha-outreach-10-30", "state-trade-license"].includes(credential.slug));
    if (generalIndex >= 0 && specific.length > 0) assert.ok(generalIndex >= specific.length, `${trade.slug}: OSHA listed before trade-specific credentials`);
    assert.ok(trade.builderHref.startsWith("/"), trade.slug);
  }
  assert.equal(trades[0].credentials[0].slug, "epa-608");
  for (const myth of knowYourTradeMyths()) assert.match(myth.href, /^\/resources\/certifications#[a-z0-9-]+$/);
});

test("BLS facts cite bls.gov Occupational Outlook Handbook pages", async () => {
  const { LABOR_MARKET_FACTS } = await import("../app/resources/labor-market");
  assert.equal(LABOR_MARKET_FACTS.length, 4);
  for (const fact of LABOR_MARKET_FACTS) {
    assert.match(fact.sourceUrl, /^https:\/\/www\.bls\.gov\/ooh\//);
    assert.ok(fact.annualOpenings > 0);
  }
});

test("every trade family has exactly one key credential that the library maps to that trade", async () => {
  const { TRADE_KEY_CREDENTIALS } = await import("../app/resources/credential-library");
  assert.deepEqual(Object.keys(TRADE_KEY_CREDENTIALS).sort(), [...FAMILY_SLUGS].sort());
  for (const [trade, key] of Object.entries(TRADE_KEY_CREDENTIALS)) {
    const record = credentialBySlug(key.credentialSlug);
    assert.ok(record, `${trade}: unknown credential ${key.credentialSlug}`);
    assert.ok(record.tradeSlugs.includes(trade), `${trade}: ${key.credentialSlug} is not mapped to this trade`);
    assert.ok(key.badgeLabel.length > 0 && key.badgeLabel.length <= 26, `${trade}: badge label length`);
    if (record.kind !== "certification") assert.doesNotMatch(key.badgeLabel, /certif/i, `${trade}: non-certification badge says certified`);
  }
});
