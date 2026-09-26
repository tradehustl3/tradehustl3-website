import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { notifyResumeRecovery } from "../worker/resume-recovery";
import { handleResumeBuilderRoute } from "../worker/resume-builder-monitored";

const webhook = "https://recovery.example.test/webhook";

function configure(t: TestContext) {
  const previous = process.env.N8N_RESUME_RECOVERY_WEBHOOK_URL;
  process.env.N8N_RESUME_RECOVERY_WEBHOOK_URL = webhook;
  t.after(() => {
    if (previous === undefined) delete process.env.N8N_RESUME_RECOVERY_WEBHOOK_URL;
    else process.env.N8N_RESUME_RECOVERY_WEBHOOK_URL = previous;
  });
  const jobs: Promise<unknown>[] = [];
  const context = { waitUntil(job: Promise<unknown>) { jobs.push(job); } };
  return { jobs, context };
}

test("recovery POST contains exactly the normalized payload", async (t) => {
  const { jobs, context } = configure(t);
  const request = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }));
  notifyResumeRecovery({ resumeId: " resume-1 \n", email: " member@example.com \n", emailEligible: true }, context);
  await Promise.all(jobs);
  assert.equal(request.mock.callCount(), 1);
  assert.equal(jobs.length, 1);
  const [url, init] = request.mock.calls[0].arguments;
  assert.equal(url, webhook);
  assert.equal(init?.method, "POST");
  assert.equal(new Headers(init?.headers).get("content-type"), "application/json");
  assert.deepEqual(JSON.parse(String(init?.body)), {
    resumeId: "resume-1", email: "member@example.com", emailEligible: true,
  });
  assert.ok(init?.signal instanceof AbortSignal);
});

test("recovery skips missing data, ineligible email, and missing configuration", async (t) => {
  const { jobs, context } = configure(t);
  const request = t.mock.method(globalThis, "fetch", async () => new Response());
  for (const resumeId of [undefined, null, "", " \n"]) {
    notifyResumeRecovery({ resumeId, email: "member@example.com", emailEligible: true }, context);
  }
  for (const email of [undefined, null, "", " \n"]) {
    notifyResumeRecovery({ resumeId: "resume-1", email, emailEligible: true }, context);
  }
  notifyResumeRecovery({ resumeId: "resume-1", email: "member@example.com", emailEligible: false }, context);
  delete process.env.N8N_RESUME_RECOVERY_WEBHOOK_URL;
  notifyResumeRecovery({ resumeId: "resume-1", email: "member@example.com", emailEligible: true }, context);
  process.env.N8N_RESUME_RECOVERY_WEBHOOK_URL = "  ";
  notifyResumeRecovery({ resumeId: "resume-1", email: "member@example.com", emailEligible: true }, context);
  await Promise.all(jobs);
  assert.equal(request.mock.callCount(), 0);
  assert.equal(jobs.length, 0);
});

function createFixture(email = " member@example.com ", failSave = false) {
  const saved: unknown[][] = [];
  const DB = {
    prepare(sql: string) {
      return { bind(...values: unknown[]) {
        return {
          async first() {
            if (sql.includes("FROM sessions s")) return { user_id: "user-1", email, full_name: "Member" };
            if (sql.includes("RETURNING count")) return { count: 1 };
            return null;
          },
          async run() {
            if (failSave) throw new Error("Database unavailable");
            saved.push(values);
            return { meta: { changes: 1 } };
          },
        };
      } };
    },
  } as unknown as D1Database;
  const request = new Request("https://tradehustl3.com/api/resume-builder/resumes", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `tradehustl3_resume_session=${"A".repeat(43)}` },
    body: JSON.stringify({ trade: "HVAC & Refrigeration", title: "My resume", intake: { contact: { email: "untrusted@example.com" } } }),
  });
  return { DB, request, saved };
}

for (const failure of ["network", "http", "synchronous", "pending"] as const) {
  test(`saved resume succeeds with ${failure} webhook failure`, async (t) => {
    const { jobs, context } = configure(t);
    const fixture = createFixture();
    let finish!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => { finish = resolve; });
    let savedAtSend = false;
    const request = t.mock.method(globalThis, "fetch", () => {
      savedAtSend = fixture.saved.length === 1;
      if (failure === "synchronous") throw new Error("fetch failed");
      if (failure === "network") return Promise.reject(new Error("n8n unavailable"));
      if (failure === "pending") return pending;
      return Promise.resolve(new Response(null, { status: 503 }));
    });
    try {
      const response = await handleResumeBuilderRoute(fixture.request, { DB: fixture.DB }, { recoveryContext: context });
      assert.equal(response?.status, 201);
      assert.equal((await response!.json() as { resumeId: string }).resumeId, fixture.saved[0][0]);
      assert.equal(request.mock.callCount(), 1);
      assert.equal(jobs.length, 1);
      assert.equal(savedAtSend, true, "send only after persistence");
      const [, init] = request.mock.calls[0].arguments;
      assert.deepEqual(JSON.parse(String(init?.body)), {
        resumeId: fixture.saved[0][0], email: "member@example.com", emailEligible: true,
      });
    } finally {
      finish(new Response(null, { status: 503 }));
      await Promise.all(jobs);
    }
  });
}

test("invalid account email and unsuccessful creation never notify recovery", async (t) => {
  const { jobs, context } = configure(t);
  const request = t.mock.method(globalThis, "fetch", async () => new Response());
  for (const email of ["", "  ", "invalid"]) {
    const fixture = createFixture(email);
    const response = await handleResumeBuilderRoute(fixture.request, { DB: fixture.DB }, { recoveryContext: context });
    assert.equal(response?.status, 201);
  }
  const fixture = createFixture("member@example.com", true);
  await assert.rejects(handleResumeBuilderRoute(fixture.request, { DB: fixture.DB }, { recoveryContext: context }));
  const unauthenticated = createFixture();
  unauthenticated.request.headers.delete("Cookie");
  const response = await handleResumeBuilderRoute(unauthenticated.request, { DB: unauthenticated.DB }, { recoveryContext: context });
  assert.equal(response?.status, 401);
  assert.equal(request.mock.callCount(), 0);
  assert.equal(jobs.length, 0);
});

test("scheduling failure cannot escape into the resume response", async (t) => {
  configure(t);
  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  const fixture = createFixture();
  const response = await handleResumeBuilderRoute(fixture.request, { DB: fixture.DB }, {
    recoveryContext: { waitUntil() { throw new Error("context unavailable"); } },
  });
  assert.equal(response?.status, 201);
});
