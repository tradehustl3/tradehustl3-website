import assert from "node:assert/strict";
import test from "node:test";

import { handleResumeBuilderRoute } from "../worker/resume-builder";
import { sqliteD1 } from "./helpers/sqlite-d1";

// 6-digit sign-in code (Oct 29 2026). The emailed link keeps working; the code
// lets a visitor finish on the page they started from. Runs against the real
// migrations through the in-memory D1 stand-in.

const ORIGIN = "https://tradehustl3.com";
const NOW = Date.parse("2026-10-29T12:00:00.000Z");

type Sent = { subject: string; html: string; code: string; token: string };

function api(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/resume-builder/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, "CF-Connecting-IP": "203.0.113.7", ...headers },
    body: JSON.stringify(body),
  });
}

async function withEmailCapture<T>(run: (sent: Sent[]) => Promise<T>): Promise<T> {
  const sent: Sent[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    const payload = JSON.parse(String(init?.body)) as { subject: string; htmlContent: string };
    const code = /letter-spacing:10px;color:#ffffff">(\d{6})</.exec(payload.htmlContent)?.[1] ?? "";
    const token = /confirm\?token=([A-Za-z0-9_-]+)/.exec(payload.htmlContent)?.[1] ?? "";
    sent.push({ subject: payload.subject, html: payload.htmlContent, code, token });
    return new Response(null, { status: 201 });
  };
  try {
    return await run(sent);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function setup(t: { mock: { timers: { enable(o: { apis: ["Date"]; now: number }): void; tick(ms: number): void } } }) {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const { DB, sqlite } = sqliteD1();
  const env = { DB, BREVO_API_KEY: "brevo-test" };
  const route = (request: Request) => handleResumeBuilderRoute(request, env);
  return { DB, sqlite, env, route };
}

async function requestCode(route: (r: Request) => Promise<Response | null>, email: string, sent: Sent[]): Promise<Sent> {
  const response = await route(api("auth/request", { email }));
  assert.equal(response?.status, 200);
  return sent[sent.length - 1];
}

async function verify(route: (r: Request) => Promise<Response | null>, email: string, code: string, headers?: Record<string, string>) {
  const response = await route(api("auth/verify-code", { email, code }, headers));
  assert.ok(response);
  return { status: response.status, body: await response.json() as { ok: boolean; message?: string }, cookie: response.headers.get("Set-Cookie") };
}

test("the sign-in email carries a 6-digit code and the existing link; only hashes are stored", async (t) => {
  const { sqlite, route } = setup(t);
  await withEmailCapture(async (sent) => {
    const email = await requestCode(route, "worker@example.com", sent);
    assert.match(email.code, /^\d{6}$/);
    assert.match(email.token, /^[A-Za-z0-9_-]{43}$/);
    assert.match(email.html, /\/resume-builder\/confirm\?token=/);
    assert.match(email.subject, /sign-in code/i);
    assert.doesNotMatch(email.subject, /\d{6}/, "the code stays out of the subject line and provider logs");

    const rows = sqlite.prepare("SELECT token_hash, purpose FROM auth_tokens ORDER BY purpose").all() as Array<{ token_hash: string; purpose: string }>;
    assert.deepEqual(rows.map((row) => row.purpose), ["login", "login_code"]);
    for (const row of rows) {
      assert.match(row.token_hash, /^[0-9a-f]{64}$/);
      assert.notEqual(row.token_hash, email.code);
      assert.notEqual(row.token_hash, email.token);
    }
  });
});

test("the right code signs the visitor in once and cancels the emailed link", async (t) => {
  const { sqlite, route } = setup(t);
  await withEmailCapture(async (sent) => {
    const email = await requestCode(route, "worker@example.com", sent);

    const first = await verify(route, "Worker@Example.com ", email.code.slice(0, 3) + " " + email.code.slice(3));
    assert.equal(first.status, 200);
    assert.equal(first.body.ok, true);
    assert.match(first.cookie ?? "", /tradehustl3_resume_session=/);
    assert.equal((sqlite.prepare("SELECT COUNT(*) AS n FROM sessions WHERE revoked_at IS NULL").get() as { n: number }).n, 1);

    const again = await verify(route, "worker@example.com", email.code);
    assert.equal(again.status, 400, "a code works once");

    const link = await route(api("auth/confirm", { token: email.token }));
    assert.equal(link?.status, 400, "the link from the same email is cancelled");
  });
});

test("using the link first cancels the code from the same email", async (t) => {
  const { route } = setup(t);
  await withEmailCapture(async (sent) => {
    const email = await requestCode(route, "worker@example.com", sent);
    const link = await route(api("auth/confirm", { token: email.token }));
    assert.equal(link?.status, 200);
    assert.equal((await verify(route, "worker@example.com", email.code)).status, 400);
  });
});

test("a wrong code and an unknown email get the same answer", async (t) => {
  const { route } = setup(t);
  await withEmailCapture(async (sent) => {
    const email = await requestCode(route, "worker@example.com", sent);
    const wrong = await verify(route, "worker@example.com", email.code === "000000" ? "111111" : "000000");
    const unknown = await verify(route, "nobody@example.com", email.code);
    assert.equal(wrong.status, 400);
    assert.equal(unknown.status, 400);
    assert.deepEqual(wrong.body, unknown.body);
    assert.equal(wrong.cookie, null);
  });
});

test("five wrong guesses destroy the code, so even the right code stops working", async (t) => {
  const { route } = setup(t);
  await withEmailCapture(async (sent) => {
    const email = await requestCode(route, "worker@example.com", sent);
    const wrongCodes = ["000001", "000002", "000003", "000004", "000005"].filter((c) => c !== email.code).slice(0, 5);
    for (const wrong of wrongCodes) assert.equal((await verify(route, "worker@example.com", wrong)).status, 400);
    assert.equal((await verify(route, "worker@example.com", email.code)).status, 400);
  });
});

test("four wrong guesses still allow the right code", async (t) => {
  const { route } = setup(t);
  await withEmailCapture(async (sent) => {
    const email = await requestCode(route, "worker@example.com", sent);
    const wrongCodes = ["000001", "000002", "000003", "000004", "000005"].filter((c) => c !== email.code).slice(0, 4);
    for (const wrong of wrongCodes) await verify(route, "worker@example.com", wrong);
    assert.equal((await verify(route, "worker@example.com", email.code)).status, 200);
  });
});

test("a code expires after 10 minutes while the link still lasts 20", async (t) => {
  const { route } = setup(t);
  await withEmailCapture(async (sent) => {
    const email = await requestCode(route, "worker@example.com", sent);
    t.mock.timers.tick(10 * 60 * 1000 + 1000);
    assert.equal((await verify(route, "worker@example.com", email.code)).status, 400);
    assert.equal((await route(api("auth/confirm", { token: email.token })))?.status, 200);
  });
});

test("requesting a new code replaces the old one", async (t) => {
  const { route } = setup(t);
  await withEmailCapture(async (sent) => {
    const first = await requestCode(route, "worker@example.com", sent);
    const second = await requestCode(route, "worker@example.com", sent);
    if (first.code !== second.code) assert.equal((await verify(route, "worker@example.com", first.code)).status, 400);
    assert.equal((await verify(route, "worker@example.com", second.code)).status, 200);
  });
});

test("a code only works for the email it was sent to", async (t) => {
  const { route } = setup(t);
  await withEmailCapture(async (sent) => {
    const a = await requestCode(route, "a@example.com", sent);
    await requestCode(route, "b@example.com", sent);
    assert.equal((await verify(route, "b@example.com", a.code)).status, 400);
    assert.equal((await verify(route, "a@example.com", a.code)).status, 200);
  });
});

test("guessing is rate limited per email", async (t) => {
  const { route } = setup(t);
  await withEmailCapture(async (sent) => {
    await requestCode(route, "worker@example.com", sent);
    let last = 0;
    for (let i = 0; i < 11; i += 1) last = (await verify(route, "worker@example.com", "999999")).status;
    assert.equal(last, 429);
  });
});

test("code sign-in rejects other sites, GET requests and malformed codes", async (t) => {
  const { route } = setup(t);
  await withEmailCapture(async (sent) => {
    const email = await requestCode(route, "worker@example.com", sent);
    assert.equal((await verify(route, "worker@example.com", email.code, { Origin: "https://evil.example" })).status, 403);
    const get = await route(new Request(`${ORIGIN}/api/resume-builder/auth/verify-code`));
    assert.equal(get?.status, 405);
    for (const bad of ["12345", "1234567", "abcdef", ""]) {
      assert.equal((await verify(route, "worker@example.com", bad)).status, 400);
    }
    assert.equal((await verify(route, "worker@example.com", email.code)).status, 200, "malformed attempts did not burn the code");
  });
});

test("the synthetic smoke account never receives a code", async (t) => {
  const { sqlite, route } = setup(t);
  await withEmailCapture(async (sent) => {
    const response = await route(api("auth/request", { email: "smoke-test@tradehustl3.invalid" }));
    assert.equal(response?.status, 200);
    assert.equal(sent.length, 0);
    assert.equal((sqlite.prepare("SELECT COUNT(*) AS n FROM auth_tokens").get() as { n: number }).n, 0);
  });
});

// Sign-in step tracking

async function postEvent(route: (r: Request) => Promise<Response | null>, eventName: string, metadata: Record<string, string> = {}) {
  return route(new Request(`${ORIGIN}/api/resume-builder/funnel-events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventName, metadata }),
  }));
}

test("sign-in steps are stored first-party, with only allowlisted method values and no email", async (t) => {
  const { sqlite, route } = setup(t);
  for (const name of ["resume_auth_requested", "resume_auth_link_opened", "sign_up"]) {
    assert.equal((await postEvent(route, name, name === "sign_up" ? { auth_method: "code" } : {}))?.status, 201);
  }
  await postEvent(route, "sign_up", { auth_method: "<script>" });
  const rows = sqlite.prepare("SELECT event_name, metadata FROM funnel_events ORDER BY rowid").all() as Array<{ event_name: string; metadata: string | null }>;
  assert.deepEqual(rows.map((row) => row.event_name), ["resume_auth_requested", "resume_auth_link_opened", "sign_up", "sign_up"]);
  assert.deepEqual(JSON.parse(rows[2].metadata ?? "{}"), { auth_method: "code" });
  assert.equal(rows[3].metadata, null, "unknown method values are dropped");
  assert.doesNotMatch(JSON.stringify(rows), /@/);
});

test("the A01 snapshot reports sign-in steps separately and leaves its counts unchanged", async (t) => {
  const { DB, route } = setup(t);
  await postEvent(route, "resume_builder_start");
  await postEvent(route, "resume_auth_requested");
  await postEvent(route, "sign_up", { auth_method: "code" });
  const secret = "agent1-test-secret-abcdefghijklmnopqrstuvwxyz-123456";
  const response = await handleResumeBuilderRoute(
    new Request(`${ORIGIN}/api/resume-builder/internal/agent1/funnel-snapshot?window=24h`, { headers: { Authorization: `Bearer ${secret}` } }),
    { DB, AGENT1_FUNNEL_SECRET: secret },
  );
  const payload = await response!.json() as { counts: Record<string, number>; signInSteps: Record<string, number> };
  assert.deepEqual(Object.keys(payload.counts), ["starts", "intakeStarted", "intakeCompleted", "previewsGenerated", "checkoutStarted", "verifiedPurchases"]);
  assert.equal(payload.counts.starts, 1);
  assert.deepEqual(payload.signInSteps, { codeOrLinkRequested: 1, linkOpened: 0, signedIn: 1 });
});
