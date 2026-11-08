import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { bookSenderEmail, resumeSenderEmail } from "../worker/sender-addresses";

test("book and Resume Builder emails default to their own tradehustl3.com senders", () => {
  assert.equal(bookSenderEmail({}), "book@tradehustl3.com");
  assert.equal(resumeSenderEmail({}), "resume@tradehustl3.com");
});

test("sender overrides are trimmed and blank overrides fall back to the defaults", () => {
  assert.equal(bookSenderEmail({ BREVO_BOOK_SENDER_EMAIL: " books@tradehustl3.com " }), "books@tradehustl3.com");
  assert.equal(resumeSenderEmail({ BREVO_RESUME_SENDER_EMAIL: "   " }), "resume@tradehustl3.com");
});

test("every book and Resume Builder email uses its product sender, not updates@", async () => {
  const expectations: Array<[string, string, number]> = [
    ["../worker/ebook-stripe.ts", "email: bookSenderEmail(env)", 2],
    ["../worker/book-program-inquiry.ts", "email: bookSenderEmail(env)", 1],
    ["../worker/resume-builder-base.ts", "email: resumeSenderEmail(env)", 2],
  ];
  for (const [path, needle, count] of expectations) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.equal(source.split(needle).length - 1, count, `${path} should use ${needle} ${count} time(s)`);
    assert.doesNotMatch(source, /updates@tradehustl3\.com/, `${path} must not fall back to updates@`);
  }
  const index = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");
  const bookSample = index.slice(index.indexOf("async function sendBookSampleDeliveryEmail"));
  assert.match(bookSample.slice(0, 1500), /email: bookSenderEmail\(env\)/);
});
