import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  createTrackedCheckout,
  trackCheckoutInitiated,
  trackVerifiedPurchase,
} from "../app/analytics";

type MetaCall = [string, string, Record<string, unknown>, { eventID: string }];
type GoogleCall = [string, string, Record<string, unknown>];
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  };
}

function installAnalyticsSpies() {
  const meta: MetaCall[] = [];
  const google: GoogleCall[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: memoryStorage(),
      sessionStorage: memoryStorage(),
      fbq: (...args: MetaCall) => meta.push(args),
      gtag: (...args: GoogleCall) => google.push(args),
    },
  });
  return { meta, google };
}

test("Resume Builder checkout tracks only after the server returns a Stripe session", async () => {
  const calls = installAnalyticsSpies();
  const fetchImpl = async () => new Response(JSON.stringify({
    ok: true,
    checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_resume",
    checkoutSessionId: "cs_test_resume",
    value: 9.99,
    currency: "USD",
  }), { status: 200 });

  const result = await createTrackedCheckout(
    "/api/resume-builder/resumes/resume-1/checkout",
    "resume_builder",
    { utm_source: "google" },
    fetchImpl as typeof fetch,
  );
  assert.equal(result.checkoutSessionId, "cs_test_resume");
  assert.equal(calls.meta[0][1], "InitiateCheckout");
  assert.deepEqual(calls.meta[0][2], {
    content_name: "resume_builder",
    content_type: "product",
    value: 9.99,
    currency: "USD",
    num_items: 1,
  });
  assert.equal(calls.google[0][1], "begin_checkout");
});

test("failed checkout emits no checkout conversion", async () => {
  const calls = installAnalyticsSpies();
  const fetchImpl = async () => new Response(JSON.stringify({ message: "Unavailable" }), { status: 503 });
  await assert.rejects(
    createTrackedCheckout("/api/checkout", "resume_builder", {}, fetchImpl as typeof fetch),
    /Unavailable/,
  );
  assert.equal(calls.meta.length, 0);
  assert.equal(calls.google.length, 0);
});

test("Purchase requires verified server data and uses value, currency, and transaction ID once", () => {
  const calls = installAnalyticsSpies();
  assert.equal(trackVerifiedPurchase({
    verified: false,
    transactionId: "cs_unpaid",
    contentName: "resume_builder",
    value: 9.99,
    currency: "USD",
  }, "resume_builder"), false);
  assert.equal(calls.meta.length, 0);

  const verified = {
    verified: true,
    transactionId: "cs_paid_resume_unique",
    contentName: "resume_builder" as const,
    value: 9.99,
    currency: "USD",
  };
  assert.equal(trackVerifiedPurchase(verified, "resume_builder"), true);
  assert.equal(trackVerifiedPurchase(verified, "resume_builder"), false);
  assert.equal(calls.meta.length, 1);
  assert.equal(calls.google.length, 1);
  assert.deepEqual(calls.meta[0][2], {
    content_name: "resume_builder",
    content_type: "product",
    value: 9.99,
    currency: "USD",
    transaction_id: "cs_paid_resume_unique",
  });
});

test("tracking fails gracefully when browser analytics are blocked", () => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  assert.doesNotThrow(() => trackCheckoutInitiated("ebook", "blocked-link", 9.99, "USD"));
  assert.equal(trackCheckoutInitiated("ebook", "blocked-link", 9.99, "USD"), false);
});
