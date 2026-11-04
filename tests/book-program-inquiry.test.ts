import assert from "node:assert/strict";
import test from "node:test";
import {
  PROGRAM_FORMATS,
  PROGRAM_INQUIRY_HONEYPOT,
  PROGRAM_TYPES,
} from "../app/book/program-inquiry-options";
import { HOLIDAY_GIFT_WINDOW, isHolidayGiftSeason } from "../app/book/holiday-gift";
import { READER_REVIEWS } from "../app/book/reader-reviews";
import {
  PROGRAM_INQUIRY_INTEREST,
  PROGRAM_INQUIRY_SOURCE,
  handleProgramInquiry,
  parseProgramInquiry,
  renderProgramInquiryNotification,
  type ProgramInquiryDependencies,
} from "../worker/book-program-inquiry";

const VALID = {
  organization: "  Westside   Technical College ",
  contactName: "Dana Price",
  email: "Dana.Price@Example.edu",
  role: "HVAC instructor",
  programType: "Trade school or technical college",
  format: "Paperback",
  copies: 30,
  neededBy: "2027-01-12",
  message: "Spring cohort.\r\n\r\n\r\nStarts in January.",
};

test("parses a valid inquiry and normalizes its fields", () => {
  const result = parseProgramInquiry(VALID);
  assert.equal(result.kind, "valid");
  if (result.kind !== "valid") return;
  assert.equal(result.inquiry.organization, "Westside Technical College");
  assert.equal(result.inquiry.email, "dana.price@example.edu");
  assert.equal(result.inquiry.copies, 30);
  assert.equal(result.inquiry.message, "Spring cohort.\n\nStarts in January.");
});

test("accepts every program type and format the form offers", () => {
  for (const programType of PROGRAM_TYPES) {
    for (const format of PROGRAM_FORMATS) {
      assert.equal(parseProgramInquiry({ ...VALID, programType, format }).kind, "valid", `${programType} / ${format}`);
    }
  }
});

test("accepts copies sent as a numeric string and optional fields left empty", () => {
  const result = parseProgramInquiry({ ...VALID, copies: "12", role: "", neededBy: "", message: "" });
  assert.equal(result.kind, "valid");
  if (result.kind === "valid") assert.equal(result.inquiry.copies, 12);
});

test("rejects missing or invalid fields with a specific message", () => {
  const cases: Array<[Record<string, unknown>, RegExp]> = [
    [{ ...VALID, organization: "a" }, /organization/i],
    [{ ...VALID, contactName: "" }, /your name/i],
    [{ ...VALID, email: "not-an-email" }, /valid email/i],
    [{ ...VALID, programType: "Summer camp" }, /type of program/i],
    [{ ...VALID, format: "Hardcover" }, /format/i],
    [{ ...VALID, copies: 0 }, /copies/i],
    [{ ...VALID, copies: 10001 }, /copies/i],
    [{ ...VALID, copies: 2.5 }, /copies/i],
    [{ ...VALID, copies: "lots" }, /copies/i],
    [{ ...VALID, neededBy: "2026-02-30" }, /real date/i],
    [{ ...VALID, neededBy: "next week" }, /real date/i],
  ];
  for (const [body, message] of cases) {
    const result = parseProgramInquiry(body);
    assert.equal(result.kind, "invalid", JSON.stringify(body));
    if (result.kind === "invalid") assert.match(result.message, message);
  }
});

test("treats a filled honeypot as spam", () => {
  assert.equal(parseProgramInquiry({ ...VALID, [PROGRAM_INQUIRY_HONEYPOT]: "https://spam.example" }).kind, "spam");
});

test("escapes every submitted value in the partners notification", () => {
  const result = parseProgramInquiry({
    ...VALID,
    organization: "<script>alert(1)</script> Academy",
    message: "<img src=x onerror=alert(1)> & more",
  });
  assert.equal(result.kind, "valid");
  if (result.kind !== "valid") return;
  const { subject, htmlContent } = renderProgramInquiryNotification(result.inquiry, "inq-1");
  assert.doesNotMatch(htmlContent, /<script>|<img/);
  assert.match(htmlContent, /&lt;script&gt;alert\(1\)&lt;\/script&gt; Academy/);
  assert.match(htmlContent, /&amp; more/);
  assert.match(subject, /30 copies/);
  assert.match(htmlContent, /Do not quote bulk pricing/);
});

type Call = { sql: string; values: unknown[] };

function harness(overrides: Partial<ProgramInquiryDependencies> = {}, options: { brevoStatus?: number } = {}) {
  const dbCalls: Call[] = [];
  const DB = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async run() { dbCalls.push({ sql, values }); return { success: true }; },
            async first<T>() { return null as T | null; },
          };
        },
        async run() { dbCalls.push({ sql, values: [] }); return { success: true }; },
      };
    },
  };
  const synced: Array<{ email: string; interest: string; source: string }> = [];
  const queued: Array<{ email: string; payload: Record<string, unknown> }> = [];
  const events: Array<{ event: string; details: Record<string, unknown> }> = [];
  const deps: ProgramInquiryDependencies = {
    siteUrl: "https://tradehustl3.com",
    checkRateLimit: async () => true,
    sha256Hex: async (value) => `hash-${value.length}`,
    requestIp: () => "203.0.113.9",
    readJsonBody: async (request) => (await request.json()) as Record<string, unknown>,
    syncContact: async (contact) => { synced.push(contact); },
    queueContactSync: async (email, payload) => { queued.push({ email, payload }); return true; },
    logEvent: (event, _severity, details) => { events.push({ event, details }); },
    ...overrides,
  };
  const emails: Array<Record<string, unknown>> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    emails.push(JSON.parse(String(init?.body)));
    return new Response(null, { status: options.brevoStatus ?? 201 });
  }) as typeof fetch;
  const restore = () => { globalThis.fetch = originalFetch; };
  return { DB, deps, dbCalls, synced, queued, events, emails, restore };
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://tradehustl3.com/api/book/program-inquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://tradehustl3.com", ...headers },
    body: JSON.stringify(body),
  });
}

test("stores the inquiry, notifies the partners inbox, and tags the Brevo contact", async () => {
  const h = harness();
  try {
    const response = await handleProgramInquiry(post(VALID), { DB: h.DB, BREVO_API_KEY: "test-key" }, h.deps);
    assert.equal(response.status, 200);
    assert.equal((await response.json() as { ok: boolean }).ok, true);

    const insert = h.dbCalls.find((call) => /INSERT INTO book_program_inquiries/.test(call.sql));
    assert.ok(insert, "inquiry row inserted");
    assert.deepEqual(insert.values.slice(1), [
      "Westside Technical College", "Dana Price", "dana.price@example.edu", "HVAC instructor",
      "Trade school or technical college", "Paperback", 30, "2027-01-12", "Spring cohort.\n\nStarts in January.",
    ]);
    assert.ok(h.dbCalls.some((call) => /CREATE TABLE IF NOT EXISTS book_program_inquiries/.test(call.sql)), "schema bootstrap ran");
    assert.ok(h.dbCalls.some((call) => /SET notified_at = CURRENT_TIMESTAMP/.test(call.sql)), "marked as notified");

    assert.equal(h.emails.length, 1);
    const email = h.emails[0] as { to: Array<{ email: string }>; replyTo: { email: string } };
    assert.deepEqual(email.to, [{ email: "partners@tradehustl3.com" }]);
    assert.equal(email.replyTo.email, "dana.price@example.edu");

    assert.deepEqual(h.synced, [{ email: "dana.price@example.edu", interest: PROGRAM_INQUIRY_INTEREST, source: PROGRAM_INQUIRY_SOURCE }]);
    assert.equal(h.queued.length, 0);
  } finally {
    h.restore();
  }
});

test("keeps the inquiry when the notification fails, without logging personal data", async () => {
  const h = harness({}, { brevoStatus: 500 });
  try {
    const response = await handleProgramInquiry(post(VALID), { DB: h.DB, BREVO_API_KEY: "test-key" }, h.deps);
    assert.equal(response.status, 200);
    assert.ok(h.dbCalls.some((call) => /INSERT INTO book_program_inquiries/.test(call.sql)));
    assert.equal(h.dbCalls.some((call) => /SET notified_at/.test(call.sql)), false);
    const logged = JSON.stringify(h.events);
    assert.match(logged, /book_program_inquiry_notification_failed/);
    assert.doesNotMatch(logged, /dana|Westside|example\.edu/i);
  } finally {
    h.restore();
  }
});

test("queues the Brevo contact sync when it fails", async () => {
  const h = harness({ syncContact: async () => { throw new Error("Brevo down"); } });
  try {
    const response = await handleProgramInquiry(post(VALID), { DB: h.DB, BREVO_API_KEY: "test-key" }, h.deps);
    assert.equal(response.status, 200);
    assert.deepEqual(h.queued, [{ email: "dana.price@example.edu", payload: { interest: PROGRAM_INQUIRY_INTEREST, source: PROGRAM_INQUIRY_SOURCE } }]);
  } finally {
    h.restore();
  }
});

test("answers bots like people but stores and sends nothing", async () => {
  const h = harness();
  try {
    const response = await handleProgramInquiry(post({ ...VALID, [PROGRAM_INQUIRY_HONEYPOT]: "x" }), { DB: h.DB, BREVO_API_KEY: "k" }, h.deps);
    assert.equal(response.status, 200);
    assert.equal(h.dbCalls.length, 0);
    assert.equal(h.emails.length, 0);
    assert.equal(h.synced.length, 0);
  } finally {
    h.restore();
  }
});

test("rejects wrong methods, foreign origins, bad input, rate-limited senders, and a missing database", async () => {
  const h = harness();
  try {
    const env = { DB: h.DB, BREVO_API_KEY: "k" };
    const get = await handleProgramInquiry(new Request("https://tradehustl3.com/api/book/program-inquiry"), env, h.deps);
    assert.equal(get.status, 405);
    assert.equal((await handleProgramInquiry(post(VALID, { Origin: "https://evil.example" }), env, h.deps)).status, 403);
    assert.equal((await handleProgramInquiry(post({ ...VALID, email: "nope" }), env, h.deps)).status, 400);
    assert.equal((await handleProgramInquiry(post(VALID), {}, h.deps)).status, 503);

    const limited = harness({ checkRateLimit: async () => false });
    try {
      assert.equal((await handleProgramInquiry(post(VALID), { DB: limited.DB }, limited.deps)).status, 429);
      assert.equal(limited.dbCalls.some((call) => /INSERT/.test(call.sql)), false);
    } finally {
      limited.restore();
    }
    assert.equal(h.dbCalls.some((call) => /INSERT/.test(call.sql)), false, "nothing stored for rejected requests");
  } finally {
    h.restore();
  }
});

test("gift-season banner window runs Nov 25 through Dec 31, Eastern", () => {
  assert.equal(isHolidayGiftSeason(Date.parse("2026-11-03T12:00:00Z")), false);
  assert.equal(isHolidayGiftSeason(Date.parse("2026-11-25T04:59:59Z")), false, "still Nov 24 in Eastern time");
  assert.equal(isHolidayGiftSeason(HOLIDAY_GIFT_WINDOW.startsAt), true);
  assert.equal(isHolidayGiftSeason(Date.parse("2026-11-27T15:00:00Z")), true, "Black Friday");
  assert.equal(isHolidayGiftSeason(Date.parse("2027-01-01T04:59:59Z")), true, "Dec 31, 11:59 p.m. Eastern");
  assert.equal(isHolidayGiftSeason(HOLIDAY_GIFT_WINDOW.endsAt), false);
});

test("every published reader review is real, permissioned, and verbatim-ready", () => {
  const ids = new Set<string>();
  for (const review of READER_REVIEWS) {
    assert.equal(review.permissionToQuote, true, review.id);
    assert.match(review.permissionDate, /^\d{4}-\d{2}-\d{2}$/, review.id);
    assert.ok(review.name.trim() && review.role.trim() && review.quote.trim(), review.id);
    assert.ok(!ids.has(review.id), `duplicate id ${review.id}`);
    ids.add(review.id);
  }
});
