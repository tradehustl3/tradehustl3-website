import assert from "node:assert/strict";
import { handleResumeBuilderRoute, type ResumeBuilderDependencies } from "../../worker/resume-builder";
import type { GeneratedResume } from "../../worker/resume-documents";

const sessionCookie = "tradehustl3_resume_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const encoder = new TextEncoder();

function harness(savedIntake: Record<string, unknown>, title: string, trade: string) {
  const state = { status: "draft", generatedJson: null as string | null };
  const objects = new Map<string, Uint8Array>();
  function statement(sql: string, values: unknown[]) {
    return {
      async first() {
        if (/RETURNING count/i.test(sql)) return { count: 1 };
        if (/FROM sessions s/i.test(sql)) return { user_id: "user-1", email: "member@example.com", full_name: "Member" };
        if (/FROM resumes WHERE/i.test(sql)) {
          return {
            resume_id: "resume-1",
            user_id: "user-1",
            trade,
            title,
            intake_json: JSON.stringify(savedIntake),
            generated_json: state.generatedJson,
            target_job_posting: null,
            status: state.status,
            theme: "plain",
          };
        }
        return null;
      },
      async run() {
        if (/UPDATE resumes SET status = 'generating'/i.test(sql)) {
          if (state.status === "generating") return { meta: { changes: 0 } };
          state.status = "generating";
          return { meta: { changes: 1 } };
        }
        if (/UPDATE resumes SET status = \?/i.test(sql)) state.status = String(values[0]);
        return { meta: { changes: 1 } };
      },
    };
  }
  const DB = {
    prepare(sql: string) {
      return { bind: (...values: unknown[]) => ({ sql, values, ...statement(sql, values) }) };
    },
    async batch(statements: Array<{ sql: string; values: unknown[] }>) {
      for (const item of statements) {
        if (/UPDATE resumes SET generated_json/i.test(item.sql)) {
          state.generatedJson = String(item.values[0]);
          state.status = "ready";
        }
      }
      return [];
    },
  };
  const BOOKS = {
    async put(key: string, bytes: Uint8Array) { objects.set(key, bytes); },
    async get(key: string) { return objects.has(key) ? { body: objects.get(key) } : null; },
    async delete(key: string) { objects.delete(key); },
  };
  return { state, DB, BOOKS };
}

/** Runs the production generate route and returns the resume handed to the document renderer. */
export async function generateThroughRoute(
  savedIntake: Record<string, unknown>,
  title: string,
  trade: string,
  modelFetch: typeof fetch,
): Promise<GeneratedResume> {
  const h = harness(savedIntake, title, trade);
  let rendered: GeneratedResume | null = null;
  const dependencies: ResumeBuilderDependencies = {
    geminiFetch: modelFetch,
    createDocx: async (generated) => { rendered = generated; return encoder.encode("DOCX"); },
    createPdf: async () => encoder.encode("PDF"),
  };
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie, Origin: "https://tradehustl3.com" },
      body: "{}",
    }),
    {
      DB: h.DB as unknown as D1Database,
      BOOKS: h.BOOKS as unknown as R2Bucket,
      RESUME_AI_PROVIDER: "gemini",
      RESUME_AI_BRIDGE_URL: "https://resume-ai-bridge.example.run.app",
      RESUME_AI_BRIDGE_SECRET: "bridge-secret",
    },
    dependencies,
  );
  assert.equal(response?.status, 200, await response?.clone().text());
  assert.ok(rendered, "the resume was rendered");
  return rendered;
}

export const modelReturns = (draft: GeneratedResume) => (async () => new Response(JSON.stringify({
  candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(draft) }] } }],
  usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, thoughtsTokenCount: 0 },
}), { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch;

export const modelFails = (async () => { throw new Error("AI bridge unavailable"); }) as typeof fetch;
