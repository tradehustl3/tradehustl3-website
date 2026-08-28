import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  createTrackedCheckout,
  trackMetaCommerceEvent,
  trackVerifiedMetaPurchase,
} from "../app/meta-commerce";

type PixelCall = ["track", "InitiateCheckout" | "Purchase", Record<string, unknown>, { eventID: string }];
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

function installPixelSpy() {
  const calls: PixelCall[] = [];
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage, fbq: (...args: PixelCall) => calls.push(args) },
  });
  return calls;
}

function checkoutResponse(contentName: "resume_builder" | "ebook", status = 200) {
  return async () => new Response(JSON.stringify({
    checkoutUrl: `https://checkout.stripe.com/${contentName}`,
    checkoutSessionId: `cs_test_${contentName}`,
  }), { status });
}

test("resume checkout tracks InitiateCheckout only after Stripe returns a session", async () => {
  const calls = installPixelSpy();
  await createTrackedCheckout("/api/resume-builder/resumes/r1/checkout", "resume_builder", checkoutResponse("resume_builder") as typeof fetch);
  assert.deepEqual(calls, [[
    "track", "InitiateCheckout",
    { content_name: "resume_builder", value: 9.99, currency: "USD" },
    { eventID: "InitiateCheckout:resume_builder:cs_test_resume_builder" },
  ]]);
});

test("eBook checkout tracks InitiateCheckout only after Stripe returns a session", async () => {
  const calls = installPixelSpy();
  await createTrackedCheckout("/api/ebook-checkout", "ebook", checkoutResponse("ebook") as typeof fetch);
  assert.equal(calls[0][1], "InitiateCheckout");
  assert.deepEqual(calls[0][2], { content_name: "ebook", value: 9.99, currency: "USD" });
});

test("a failed checkout creates no InitiateCheckout event", async () => {
  const calls = installPixelSpy();
  await assert.rejects(createTrackedCheckout("/api/ebook-checkout", "ebook", checkoutResponse("ebook", 503) as typeof fetch));
  assert.equal(calls.length, 0);
});

test("verified Purchase events use the fixed product value and survive confirmation reload deduplication", () => {
  const calls = installPixelSpy();
  const purchase = { verified: true, transactionId: "cs_test_purchase_resume", contentName: "resume_builder" as const, value: 9.99, currency: "USD" };
  assert.equal(trackVerifiedMetaPurchase(purchase, "resume_builder"), true);
  assert.equal(trackVerifiedMetaPurchase(purchase, "resume_builder"), false);
  assert.equal(trackMetaCommerceEvent("Purchase", "resume_builder", "cs_test_purchase_resume"), false);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][2], { content_name: "resume_builder", value: 9.99, currency: "USD" });
});

test("unverified eBook payment cannot emit Purchase", () => {
  const calls = installPixelSpy();
  assert.equal(trackVerifiedMetaPurchase({ verified: false, transactionId: "cs_test_unpaid", contentName: "ebook", value: 9.99, currency: "USD" }, "ebook"), false);
  assert.equal(calls.length, 0);
});

test("a server-verified eBook entitlement emits one Purchase", () => {
  const calls = installPixelSpy();
  const purchase = { verified: true, transactionId: "cs_test_purchase_ebook", contentName: "ebook" as const, value: 9.99, currency: "USD" };
  assert.equal(trackVerifiedMetaPurchase(purchase, "ebook"), true);
  assert.equal(trackVerifiedMetaPurchase(purchase, "ebook"), false);
  assert.deepEqual(calls[0][2], { content_name: "ebook", value: 9.99, currency: "USD" });
});
