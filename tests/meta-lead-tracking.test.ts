import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createMetaLeadTracker } from "../app/meta-pixel";
import { submitSignup } from "../app/signup-request";

type PixelCall = ["track", "Lead", { content_name: string; content_category: string }, { eventID: string }];

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

function installPixelSpy() {
  const calls: PixelCall[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      fbq: (...args: PixelCall) => calls.push(args),
    },
  });
  return calls;
}

function signupResponse(status = 200, message = "You're on the list.", ok = status >= 200 && status < 300) {
  return async () => new Response(JSON.stringify({ ok, message, sampleUrl: "/api/free-sample" }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("successful Top 10 Trades signup fires one Meta Lead", async () => {
  const calls = installPixelSpy();

  await submitSignup(
    { email: "trades@example.com", interest: "The TRADE HUSTL3 Book" },
    {
      trackMetaLead: createMetaLeadTracker("top_10_trades"),
      fetchImpl: signupResponse() as typeof fetch,
    },
  );

  assert.deepEqual(calls, [["track", "Lead", { content_name: "top_10_trades", content_category: "lead_offer" }, { eventID: "Lead:top_10_trades" }]]);
});

test("successful book-sample signup fires one Meta Lead", async () => {
  const calls = installPixelSpy();

  await submitSignup(
    { email: "reader@example.com", interest: "The TRADE HUSTL3 Book" },
    {
      trackMetaLead: createMetaLeadTracker("book_sample"),
      fetchImpl: signupResponse() as typeof fetch,
    },
  );

  assert.deepEqual(calls, [["track", "Lead", { content_name: "book_sample", content_category: "lead_offer" }, { eventID: "Lead:book_sample" }]]);
});

test("failed signup fires zero Meta Lead events", async () => {
  const calls = installPixelSpy();

  await assert.rejects(
    submitSignup(
      { email: "failed@example.com", interest: "The TRADE HUSTL3 Book" },
      {
        trackMetaLead: createMetaLeadTracker("book_sample"),
        fetchImpl: signupResponse(200, "Invalid signup.", false) as typeof fetch,
      },
    ),
    /Invalid signup/,
  );

  assert.equal(calls.length, 0);
});

test("repeat or double successful submission does not duplicate the Meta Lead", async () => {
  const calls = installPixelSpy();
  const trackMetaLead = createMetaLeadTracker("book_sample");
  const options = { trackMetaLead, fetchImpl: signupResponse() as typeof fetch };
  const payload = { email: "reader@example.com", interest: "The TRADE HUSTL3 Book" };

  await Promise.all([
    submitSignup(payload, options),
    submitSignup(payload, options),
  ]);
  await submitSignup(payload, options);

  assert.deepEqual(calls, [["track", "Lead", { content_name: "book_sample", content_category: "lead_offer" }, { eventID: "Lead:book_sample" }]]);
});

test("successful signup stays successful when Meta and Google are unavailable", async () => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  const result = await submitSignup(
    { email: "blocked@example.com", interest: "The TRADE HUSTL3 Book" },
    {
      trackMetaLead: createMetaLeadTracker("book_sample"),
      fetchImpl: signupResponse() as typeof fetch,
    },
  );
  assert.equal(result.ok, true);
});
