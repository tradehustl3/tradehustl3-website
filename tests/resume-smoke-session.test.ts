import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { handleResumeBuilderRoute, runResumeBuilderRetention, SMOKE_TEST_EMAIL } from "../worker/resume-builder";
import {
  SMOKE_CURRENT_RESUME_ID,
  SMOKE_LEGACY_RESUME_ID,
  SMOKE_SESSION_PATH,
  SMOKE_SESSION_TTL_SECONDS,
} from "../worker/resume-smoke-session";
import { sqliteD1, seedSession, TEST_SESSION } from "./helpers/sqlite-d1";

const ORIGIN = "https://tradehustl3.com";
const SECRET = "s".repeat(48);

function memoryR2() {
  const objects = new Map<string, Uint8Array>();
  const bucket = {
    async get(key: string) {
      const bytes = objects.get(key);
      return bytes ? { body: bytes, text: async () => new TextDecoder().decode(bytes) } : null;
    },
    async put(key: string, bytes: Uint8Array) { objects.set(key, bytes); },
    async delete(key: string) { objects.delete(key); },
    async list({ prefix = "" }: { prefix?: string } = {}) {
      return { objects: [...objects.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key })) };
    },
  } as unknown as R2Bucket;
  return { bucket, objects };
}

/** `null` means SMOKE_TEST_LOGIN_SECRET is not configured at all. */
function setup(secret: string | null = SECRET) {
  const { DB, sqlite } = sqliteD1();
  const r2 = memoryR2();
  const renders: Array<{ kind: "pdf" | "docx"; theme: unknown; style: unknown }> = [];
  const dependencies = {
    createPdf: async (...args: unknown[]) => { renders.push({ kind: "pdf", theme: args[2], style: args[4] }); return new Uint8Array([37, 80, 68, 70]); },
    createDocx: async (...args: unknown[]) => { renders.push({ kind: "docx", theme: args[1], style: args[3] }); return new Uint8Array([80, 75]); },
    geminiFetch: (async () => { throw new Error("AI must never be called"); }) as typeof fetch,
    anthropicFetch: (async () => { throw new Error("AI must never be called"); }) as typeof fetch,
  };
  const env = { DB, BOOKS: r2.bucket, ...(secret === null ? {} : { SMOKE_TEST_LOGIN_SECRET: secret }) };
  const route = (path: string, init: RequestInit = {}) =>
    handleResumeBuilderRoute(new Request(`${ORIGIN}${path}`, init), env, dependencies);
  const login = (headers: Record<string, string> = { Authorization: `Bearer ${SECRET}` }, init: RequestInit = {}) =>
    route(SMOKE_SESSION_PATH, { method: "POST", headers: { "CF-Connecting-IP": "203.0.113.9", ...headers }, ...init });
  const cookieFrom = (response: Response) => {
    const header = response.headers.get("Set-Cookie") ?? "";
    return header.split(";")[0];
  };
  const resume = (id: string) => sqlite.prepare("SELECT * FROM resumes WHERE resume_id = ?").get(id) as Record<string, unknown> | undefined;
  return { sqlite, env, r2, renders, route, login, cookieFrom, resume };
}

test("endpoint is indistinguishable from an unknown route when the secret is unset or too short", async () => {
  for (const secret of [null, "", "short-secret", " ".repeat(40)]) {
    const s = setup(secret);
    const response = await s.login();
    assert.equal(response!.status, 404);
    assert.deepEqual(await response!.json(), { ok: false, message: "Route not found." });
    assert.equal(s.sqlite.prepare("SELECT count(*) AS n FROM users").get()!.n, 0);
    assert.equal(s.sqlite.prepare("SELECT count(*) AS n FROM sessions").get()!.n, 0);
  }
});

test("rejects wrong or missing secrets, browser origins and non-POST without creating anything", async () => {
  const s = setup();
  const rejected: Array<Record<string, string>> = [{}, { Authorization: "Bearer wrong" }, { Authorization: `Basic ${SECRET}` }, { Authorization: `Bearer ${SECRET}x` }];
  for (const headers of rejected) {
    assert.equal((await s.login(headers))!.status, 401);
  }
  assert.equal((await s.login({ Authorization: `Bearer ${SECRET}`, Origin: ORIGIN }))!.status, 403);
  assert.equal((await s.route(SMOKE_SESSION_PATH, { method: "GET", headers: { Authorization: `Bearer ${SECRET}` } }))!.status, 405);
  assert.equal(s.sqlite.prepare("SELECT count(*) AS n FROM users").get()!.n, 0);
  assert.equal(s.sqlite.prepare("SELECT count(*) AS n FROM sessions").get()!.n, 0);
  assert.equal(s.sqlite.prepare("SELECT count(*) AS n FROM resumes").get()!.n, 0);
});

test("per-IP attempts are rate limited before the secret is checked", async () => {
  const s = setup();
  for (let attempt = 0; attempt < 10; attempt += 1) assert.equal((await s.login({ Authorization: "Bearer wrong" }))!.status, 401);
  assert.equal((await s.login())!.status, 429, "even the correct secret is refused once the IP is limited");
});

test("issues a short, hardened session for the synthetic account and seeds two unpaid fixtures without AI", async () => {
  const s = setup();
  const response = await s.login();
  assert.equal(response!.status, 200);
  const body = await response!.json() as { resumes: { current: string; legacy: string }; expiresInSeconds: number };
  assert.deepEqual(body.resumes, { current: SMOKE_CURRENT_RESUME_ID, legacy: SMOKE_LEGACY_RESUME_ID });
  assert.equal(body.expiresInSeconds, SMOKE_SESSION_TTL_SECONDS);
  assert.equal(JSON.stringify(body).includes(s.cookieFrom(response!).split("=")[1]), false, "raw token only in the cookie");

  const setCookie = response!.headers.get("Set-Cookie")!;
  for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/", `Max-Age=${SMOKE_SESSION_TTL_SECONDS}`]) assert.ok(setCookie.includes(flag), flag);
  assert.equal(response!.headers.get("Cache-Control"), "no-store");

  const cookie = s.cookieFrom(response!);
  const me = await (await s.route("/api/resume-builder/me", { headers: { Cookie: cookie } }))!.json() as { user: { email: string } };
  assert.equal(me.user.email, SMOKE_TEST_EMAIL);
  const session = s.sqlite.prepare("SELECT expires_at FROM sessions WHERE revoked_at IS NULL").get() as { expires_at: number };
  assert.ok(session.expires_at - Math.floor(Date.now() / 1000) <= SMOKE_SESSION_TTL_SECONDS);

  const current = s.resume(SMOKE_CURRENT_RESUME_ID)!;
  assert.equal(current.template_version, 2); assert.equal(current.theme, "plain"); assert.equal(current.status, "ready");
  assert.equal(current.font, "Classic"); assert.equal(current.accent, "Navy");
  const legacy = s.resume(SMOKE_LEGACY_RESUME_ID)!;
  assert.equal(legacy.template_version, 1); assert.equal(legacy.theme, "navy");
  assert.equal(legacy.font, "Classic"); assert.equal(legacy.accent, "Black");
  assert.equal(s.sqlite.prepare("SELECT count(*) AS n FROM entitlements").get()!.n, 0);

  // Legacy renders through the pre-V2 path (no style); current renders with V2 style.
  for (const render of s.renders.filter((item) => item.theme === "navy")) assert.equal(render.style, undefined);
  for (const render of s.renders.filter((item) => item.theme === "plain")) assert.equal((render.style as { templateVersion: number }).templateVersion, 2);

  for (const id of [SMOKE_CURRENT_RESUME_ID, SMOKE_LEGACY_RESUME_ID]) {
    const status = await (await s.route(`/api/resume-builder/resumes/${id}`, { headers: { Cookie: cookie } }))!.json() as {
      resume: { paid: boolean; downloads: unknown; previewUrl: string | null; correctionsRemaining: number; style: { templateVersion: number } };
    };
    assert.equal(status.resume.paid, false);
    assert.equal(status.resume.downloads, null, "unpaid review UI must not offer Download/Print");
    assert.equal(status.resume.correctionsRemaining, 0);
    assert.ok(status.resume.previewUrl);
    assert.equal((await s.route(status.resume.previewUrl!, { headers: { Cookie: cookie } }))!.status, 200);
    assert.equal((await s.route(`/api/resume-builder/resumes/${id}/files/pdf`, { headers: { Cookie: cookie } }))!.status, 404);
    assert.equal((await s.route(`/api/resume-builder/resumes/${id}/files/docx`, { headers: { Cookie: cookie } }))!.status, 404);
  }
  assert.equal(
    (await s.route(`/api/resume-builder/resumes/${SMOKE_LEGACY_RESUME_ID}`, { headers: { Cookie: cookie } }).then((r) => r!.json()) as { resume: { style: { templateVersion: number } } }).resume.style.templateVersion,
    1,
  );
});

test("a free template switch works for the smoke session and the next login restores the fixture and revokes the old session", async () => {
  const s = setup();
  const first = await s.login();
  const cookie = s.cookieFrom(first!);
  const switched = await s.route(`/api/resume-builder/resumes/${SMOKE_CURRENT_RESUME_ID}`, {
    method: "PATCH",
    headers: { Cookie: cookie, Origin: ORIGIN, "Content-Type": "application/json" },
    body: JSON.stringify({ theme: "navy", accent: "Forest Green" }),
  });
  assert.equal(switched!.status, 200);
  assert.equal((await switched!.json() as { runConsumed: boolean }).runConsumed, false);
  assert.equal(s.resume(SMOKE_CURRENT_RESUME_ID)!.theme, "navy");
  const prefix = `resume-builder/`;
  const objectsAfterSwitch = [...s.r2.objects.keys()].filter((key) => key.includes(SMOKE_CURRENT_RESUME_ID));
  assert.ok(objectsAfterSwitch.length >= 6, "customization keeps superseded objects");

  const second = await s.login();
  assert.equal(second!.status, 200);
  const restored = s.resume(SMOKE_CURRENT_RESUME_ID)!;
  assert.equal(restored.theme, "plain"); assert.equal(restored.accent, "Navy"); assert.equal(restored.template_version, 2);
  const pointers = s.sqlite.prepare("SELECT object_key FROM resume_files WHERE resume_id = ?").all(SMOKE_CURRENT_RESUME_ID) as Array<{ object_key: string }>;
  const live = [...s.r2.objects.keys()].filter((key) => key.startsWith(prefix) && key.includes(SMOKE_CURRENT_RESUME_ID));
  assert.deepEqual(live.sort(), pointers.map((row) => row.object_key).sort(), "stale fixture objects removed");

  assert.equal((await s.route("/api/resume-builder/me", { headers: { Cookie: cookie } }))!.status, 401, "previous smoke session revoked");
  assert.equal((await s.route("/api/resume-builder/me", { headers: { Cookie: s.cookieFrom(second!) } }))!.status, 200);
});

test("cannot be pointed at a real customer and never touches their data", async () => {
  const s = setup();
  seedSession(s.sqlite, "customer-1", "customer@example.com");
  s.sqlite.prepare("INSERT INTO resumes (resume_id,user_id,trade,title,intake_json,status) VALUES (?, 'customer-1', 'Electrical', 'Electrician', '{}', 'draft')").run(SMOKE_CURRENT_RESUME_ID.replace(/.$/, "0"));
  const before = s.sqlite.prepare("SELECT * FROM resumes WHERE user_id = 'customer-1'").all();

  const response = await s.login(
    { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json", "X-User-Email": "customer@example.com" },
    { body: JSON.stringify({ email: "customer@example.com", userId: "customer-1" }) },
  );
  const me = await (await s.route("/api/resume-builder/me", { headers: { Cookie: s.cookieFrom(response!) } }))!.json() as { user: { email: string } };
  assert.equal(me.user.email, SMOKE_TEST_EMAIL);
  assert.deepEqual(s.sqlite.prepare("SELECT * FROM resumes WHERE user_id = 'customer-1'").all(), before);
  assert.equal((await s.route("/api/resume-builder/me", { headers: { Cookie: `tradehustl3_resume_session=${TEST_SESSION}` } }))!.status, 200, "customer session untouched");
  assert.equal((await s.route(`/api/resume-builder/resumes/${SMOKE_CURRENT_RESUME_ID}`, { headers: { Cookie: `tradehustl3_resume_session=${TEST_SESSION}` } }))!.status, 404, "customer cannot see fixtures");
});

test("a fixture id collision with another account aborts before any render or write", async () => {
  const s = setup();
  s.sqlite.prepare("INSERT INTO users (user_id,email) VALUES ('customer-2','c2@example.com')").run();
  s.sqlite.prepare("INSERT INTO resumes (resume_id,user_id,trade,title,intake_json,status,theme) VALUES (?, 'customer-2', 'Plumbing', 'Plumber', '{}', 'draft', 'lead')").run(SMOKE_CURRENT_RESUME_ID);
  const response = await s.login();
  assert.equal(response!.status, 409);
  assert.equal(response!.headers.get("Set-Cookie"), null, "no session when fixtures are not trustworthy");
  const row = s.resume(SMOKE_CURRENT_RESUME_ID)!;
  assert.equal(row.user_id, "customer-2"); assert.equal(row.title, "Plumber"); assert.equal(row.theme, "lead");
  assert.equal(s.sqlite.prepare("SELECT count(*) AS n FROM resume_files WHERE resume_id = ?").get(SMOKE_CURRENT_RESUME_ID)!.n, 0);
  assert.equal([...s.r2.objects.keys()].some((key) => key.includes(SMOKE_CURRENT_RESUME_ID)), false);
});

test("a paid record on the smoke account stops the reset instead of deleting payment data", async () => {
  const s = setup();
  await s.login();
  const userId = (s.sqlite.prepare("SELECT user_id FROM users WHERE email = ?").get(SMOKE_TEST_EMAIL) as { user_id: string }).user_id;
  s.sqlite.prepare("INSERT INTO entitlements (entitlement_id,user_id,resume_id,credits_total,credits_used,status,kind,plan) VALUES ('e',?,?,4,1,'active','resume','one_time')").run(userId, SMOKE_CURRENT_RESUME_ID);
  const response = await s.login();
  assert.equal(response!.status, 409);
  assert.equal(response!.headers.get("Set-Cookie"), null);
  assert.equal(s.sqlite.prepare("SELECT count(*) AS n FROM entitlements").get()!.n, 1);
});

test("the reserved address cannot request a magic link or reach the email provider", async () => {
  const s = setup();
  const originalFetch = globalThis.fetch;
  let emailed = false;
  globalThis.fetch = (async () => { emailed = true; return new Response("{}"); }) as typeof fetch;
  try {
    const env = { ...s.env, BREVO_API_KEY: "brevo-test" };
    for (const email of [SMOKE_TEST_EMAIL, " Smoke-Test@TradeHustl3.invalid "]) {
      const response = await handleResumeBuilderRoute(new Request(`${ORIGIN}/api/resume-builder/auth/request`, {
        method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json" }, body: JSON.stringify({ email }),
      }), env);
      assert.equal(response!.status, 200);
      assert.equal((await response!.json() as { ok: boolean }).ok, true, "same generic response as any address");
    }
    assert.equal(emailed, false);
    assert.equal(s.sqlite.prepare("SELECT count(*) AS n FROM users").get()!.n, 0);
    assert.equal(s.sqlite.prepare("SELECT count(*) AS n FROM auth_tokens").get()!.n, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("smoke-session funnel events never reach the analytics table; customer events still do", async () => {
  const s = setup();
  const smokeCookie = s.cookieFrom((await s.login())!);
  seedSession(s.sqlite, "customer-1", "customer@example.com");
  const send = (cookie?: string) => s.route("/api/resume-builder/funnel-events", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify({ eventName: "resume_builder_start", anonymousId: "anon" }),
  });
  assert.equal((await send(smokeCookie))!.status, 202);
  assert.equal(s.sqlite.prepare("SELECT count(*) AS n FROM funnel_events").get()!.n, 0);
  assert.equal((await send(`tradehustl3_resume_session=${TEST_SESSION}`))!.status, 201);
  assert.equal((await send())!.status, 201);
  assert.equal(s.sqlite.prepare("SELECT count(*) AS n FROM funnel_events").get()!.n, 2);
});

test("fixtures removed by unpaid-resume retention are recreated on the next login", async () => {
  const s = setup();
  await s.login();
  s.sqlite.exec("UPDATE resumes SET updated_at = datetime('now', '-60 days')");
  await runResumeBuilderRetention(s.env);
  assert.equal(s.resume(SMOKE_CURRENT_RESUME_ID), undefined);
  // The global hourly cap is independent of the per-IP cap used above.
  assert.equal((await s.login({ Authorization: `Bearer ${SECRET}`, "CF-Connecting-IP": "198.51.100.4" }))!.status, 200);
  assert.equal(s.resume(SMOKE_CURRENT_RESUME_ID)!.status, "ready");
  assert.equal(s.resume(SMOKE_LEGACY_RESUME_ID)!.template_version, 1);
});

test("stored session hashes never equal the raw cookie token", async () => {
  const s = setup();
  const raw = decodeURIComponent(s.cookieFrom((await s.login())!).split("=")[1]);
  const row = s.sqlite.prepare("SELECT session_hash FROM sessions WHERE revoked_at IS NULL").get() as { session_hash: string };
  assert.notEqual(row.session_hash, raw);
  assert.equal(row.session_hash, createHash("sha256").update(raw).digest("hex"));
});
