import assert from "node:assert/strict";
import test from "node:test";

import { malformedUrlTarget, repairedPathname } from "../worker/malformed-url";

const OBSERVED =
  "/resume-builderhttps://tradehustl3.com/resume-builderhttps://tradehustl3.com/resume-builderhttps://tradehustl3.com/resume-builder";

test("repairs the exact concatenated path observed in GA4", () => {
  assert.equal(repairedPathname(OBSERVED), "/resume-builder");
});

test("repairs scheme, host, case, and percent-encoding variants", () => {
  assert.equal(repairedPathname("/bookhttp://tradehustl3.com/book"), "/book");
  assert.equal(repairedPathname("/bookhttps://www.tradehustl3.com/book"), "/book");
  assert.equal(repairedPathname("/resume-builder/hvacHTTPS://TradeHustl3.com/resume-builder/hvac"), "/resume-builder/hvac");
  assert.equal(repairedPathname("/resume-builderhttps%3A%2F%2Ftradehustl3.com%2Fresume-builder"), "/resume-builder");
  assert.equal(repairedPathname("/resources/https://tradehustl3.com/resources"), "/resources");
});

test("a path that is only an embedded URL repairs to the homepage", () => {
  assert.equal(repairedPathname("/https://tradehustl3.com/book"), "/");
});

test("leaves valid paths and foreign URLs untouched", () => {
  for (const path of [
    "/",
    "/resume-builder",
    "/resume-builder/hvac",
    "/api/resume-builder/funnel-events",
    "/resume-builderhttps://example.com/resume-builder",
    "/blog/how-to-use-tradehustl3-com",
  ]) {
    assert.equal(repairedPathname(path), null, path);
  }
});

test("redirect target stays on the request origin and keeps the query string", () => {
  const target = malformedUrlTarget(`https://tradehustl3.com${OBSERVED}?utm_source=facebook&fbclid=abc`);
  assert.equal(target?.toString(), "https://tradehustl3.com/resume-builder?utm_source=facebook&fbclid=abc");
  assert.equal(malformedUrlTarget("https://tradehustl3.com/resume-builder?next=https://tradehustl3.com/x"), null, "query values are not paths");
});
