import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createFormStartTracker, createMetaLeadTracker, trackNavigationEvent } from "../app/meta-pixel";
import { submitSignup } from "../app/signup-request";

type PixelCall = ["track" | "trackCustom", string, Record<string, string>];
type GtagCall = ["event", string, Record<string, string>];

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

function installPixelSpy() {
  const calls: PixelCall[] = [];
  const gaCalls: GtagCall[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      fbq: (...args: PixelCall) => calls.push(args),
      gtag: (...args: GtagCall) => gaCalls.push(args),
    },
  });
  return { calls, gaCalls };
}

function signupResponse(status = 200, message = "You're on the list.", ok = status >= 200 && status < 300) {
  return async () => new Response(JSON.stringify({ ok, message, sampleUrl: "/api/free-sample" }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("successful Top 10 Trades signup fires one Meta Lead", async () => {
  const { calls, gaCalls } = installPixelSpy();

  await submitSignup(
    { email: "trades@example.com", interest: "The TRADE HUSTL3 Book" },
    {
      trackMetaLead: createMetaLeadTracker("top_10_trades"),
      fetchImpl: signupResponse() as typeof fetch,
    },
  );

  const parameters = { content_name: "top_10_trades", signup_source: "top_10_trades" };
  assert.deepEqual(calls, [["track", "Lead", parameters]]);
  assert.deepEqual(gaCalls, [["event", "generate_lead", parameters]]);
});

test("successful book-sample signup fires one Meta Lead", async () => {
  const { calls, gaCalls } = installPixelSpy();

  await submitSignup(
    { email: "reader@example.com", interest: "The TRADE HUSTL3 Book" },
    {
      trackMetaLead: createMetaLeadTracker("book_sample"),
      fetchImpl: signupResponse() as typeof fetch,
    },
  );

  const parameters = { content_name: "book_sample", signup_source: "book_sample" };
  assert.deepEqual(calls, [["track", "Lead", parameters]]);
  assert.deepEqual(gaCalls, [["event", "generate_lead", parameters]]);
});

test("failed signup fires zero Meta Lead events", async () => {
  const { calls, gaCalls } = installPixelSpy();

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
  assert.equal(gaCalls.length, 0);
});

test("repeat or double successful submission does not duplicate the Meta Lead", async () => {
  const { calls, gaCalls } = installPixelSpy();
  const trackMetaLead = createMetaLeadTracker("book_sample");
  const options = { trackMetaLead, fetchImpl: signupResponse() as typeof fetch };
  const payload = { email: "reader@example.com", interest: "The TRADE HUSTL3 Book" };

  await Promise.all([
    submitSignup(payload, options),
    submitSignup(payload, options),
  ]);
  await submitSignup(payload, options);

  const parameters = { content_name: "book_sample", signup_source: "book_sample" };
  assert.deepEqual(calls, [["track", "Lead", parameters]]);
  assert.deepEqual(gaCalls, [["event", "generate_lead", parameters]]);
});

test("form_start is deduplicated and carries funnel identity to GA and Meta", () => {
  const { calls, gaCalls } = installPixelSpy();
  const track = createFormStartTracker("book_sample");
  assert.equal(track(), true);
  assert.equal(track(), false);
  const parameters = { content_name: "book_sample", signup_source: "book_sample" };
  assert.deepEqual(calls, [["trackCustom", "form_start", parameters]]);
  assert.deepEqual(gaCalls, [["event", "form_start", parameters]]);
});

test("homepage navigation events carry location, destination, and item", () => {
  const { calls, gaCalls } = installPixelSpy();
  const parameters = { location: "three_doors", destination: "/book/sample", item: "book_sample" };
  assert.equal(trackNavigationEvent("select_content", parameters), true);
  assert.deepEqual(calls, [["trackCustom", "select_content", parameters]]);
  assert.deepEqual(gaCalls, [["event", "select_content", parameters]]);
});
