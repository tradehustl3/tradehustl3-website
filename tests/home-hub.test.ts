import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { HUB_STAGES } from "../app/home-hub-stages-data";
import { CATALOG_METRICS } from "../app/resume-examples/catalog-metrics";

const routeExists = (href: string) => {
  if (href === "#resume-start") return true;
  const path = href.split("#")[0].replace(/^\//, "");
  return existsSync(path ? `app/${path}/page.tsx` : "app/page.tsx");
};

test("every hub stage step links to a page that exists today", () => {
  assert.equal(HUB_STAGES.length, 5);
  for (const stage of HUB_STAGES) {
    assert.equal(stage.steps.length, 3, stage.id);
    for (const step of stage.steps) assert.ok(routeExists(step.href), `${stage.id}: ${step.href}`);
  }
});

test("hub stage copy uses the catalog's real counts", () => {
  const copy = HUB_STAGES.flatMap((stage) => [stage.copy, ...stage.steps.map((step) => step.sub)]).join(" ");
  for (const count of copy.match(/(?<![\d.$])\b\d{2,3}\b/g) ?? []) {
    assert.ok([CATALOG_METRICS.careerFamilies, CATALOG_METRICS.mappedRoles].includes(Number(count)), `unexpected count ${count}`);
  }
});
