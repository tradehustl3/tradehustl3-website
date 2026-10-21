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
