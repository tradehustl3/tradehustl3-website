import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

// The component imports a CSS module. Node cannot load CSS, so require it
// (tsx compiles it) with .css files stubbed to class names equal to their keys.
const require = createRequire(import.meta.url);
require.extensions[".css"] = (module) => {
  module.exports = new Proxy({}, { get: (_, key) => (key === "__esModule" ? false : String(key)) });
};
const { VerifiedReviews } = require("../app/customer-reviews.tsx") as typeof import("../app/customer-reviews");

const review = {
  id: "r1",
  name: "Sam P.",
  trade: "HVAC Technician",
  rating: 5,
  review: "Clean resume, no made-up certs.",
  result: null,
  verifiedCustomer: true,
};

test("the verified reviews section renders nothing when there are no approved reviews", () => {
  assert.equal(renderToString(createElement(VerifiedReviews, { reviews: [] })), "");
});

test("the verified reviews section appears once at least one approved review exists", () => {
  const html = renderToString(createElement(VerifiedReviews, { reviews: [review] })).replace(/<!-- -->/g, "");
  assert.match(html, /<h2 id="customer-reviews-title"[^>]*>Reviews from verified buyers<\/h2>/);
  assert.match(html, /Sam P\./);
  assert.match(html, /✓ VERIFIED PAID CUSTOMER/);
  assert.match(html, /5 out of 5 stars/);
  assert.match(html, /TRADE HUSTL3 does not guarantee interviews or employment/);
  assert.doesNotMatch(html, /Only customers with a completed purchase/);
});
