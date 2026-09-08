import type { ResumeBuilderDependencies, ResumeBuilderEnv } from "./resume-builder-base";
import { createResumeDocx, createResumePdf, type GeneratedResume, type ResumeTheme } from "./resume-documents";
import { evaluateCriticalResumeGate } from "./resume-quality-hard-gate";

type HardenResult = {
  found: boolean;
  ready: boolean;
  score: number;
  issues: string[];
  changed: boolean;
};

function normalizeTheme(value: unknown): ResumeTheme {
  return value === "navy" ? "navy" : "plain";
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function storeFile(
  env: ResumeBuilderEnv,
  userId: string,
  resumeId: string,
  generationId: string,
  format: "pdf" | "docx" | "preview",
  bytes: Uint8Array,
): Promise<D1PreparedStatement> {
  if (!env.BOOKS) throw new Error("Resume file storage is unavailable.");
  const extension = format === "docx" ? "docx" : "pdf";
  const objectKey = `resume-builder/${userId}/${resumeId}/generations/${generationId}/${format}.${extension}`;
  const contentType = format === "docx"
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : "application/pdf";
  await env.BOOKS.put(objectKey, bytes, { httpMetadata: { contentType } });
  const digest = await sha256Hex(bytes);
  return env.DB.prepare(
    `INSERT INTO resume_files
     (file_id, resume_id, user_id, format, object_key, byte_size, sha256)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(file_id) DO UPDATE SET
       object_key = excluded.object_key,
       byte_size = excluded.byte_size,
       sha256 = excluded.sha256,
       created_at = CURRENT_TIMESTAMP`,
  ).bind(`${resumeId}:${format}`, resumeId, userId, format, objectKey, bytes.byteLength, digest);
}

export async function hardenGeneratedResumePackage(
  env: ResumeBuilderEnv,
  dependencies: ResumeBuilderDependencies,
  resumeId: string,
): Promise<HardenResult> {
  const record = await env.DB.prepare(
    `SELECT user_id, title, intake_json, generated_json, theme
     FROM resumes WHERE resume_id = ? AND deleted_at IS NULL LIMIT 1`,
  ).bind(resumeId).first<{
    user_id: string;
    title: string;
    intake_json: string;
    generated_json: string | null;
    theme: string;
  }>();

  if (!record?.generated_json) {
    return { found: Boolean(record), ready: false, score: 0, issues: ["Build the protected preview first."], changed: false };
  }

  let intake: unknown;
  let parsed: GeneratedResume & Record<string, unknown>;
  try {
    intake = JSON.parse(record.intake_json) as unknown;
    parsed = JSON.parse(record.generated_json) as GeneratedResume & Record<string, unknown>;
  } catch {
    return { found: true, ready: false, score: 0, issues: ["The saved resume could not be verified safely."], changed: false };
  }

  const gate = evaluateCriticalResumeGate(parsed, intake, record.title);
  const hardened = { ...parsed, ...gate.resume } as GeneratedResume & Record<string, unknown>;
  const changed = JSON.stringify(hardened) !== JSON.stringify(parsed);
  if (!changed) {
    return { found: true, ready: gate.ready, score: gate.score, issues: gate.issues, changed: false };
  }

  if (!env.BOOKS) throw new Error("Resume file storage is unavailable.");
  const generationId = crypto.randomUUID();
  const theme = normalizeTheme(record.theme);
  const newObjectKeys = (["docx", "pdf", "preview"] as const).map((format) => {
    const extension = format === "docx" ? "docx" : "pdf";
    return `resume-builder/${record.user_id}/${resumeId}/generations/${generationId}/${format}.${extension}`;
  });
  const previousObjectKeys = (await Promise.all(
    (["docx", "pdf", "preview"] as const).map((format) => env.DB.prepare(
      "SELECT object_key FROM resume_files WHERE resume_id = ? AND user_id = ? AND format = ? LIMIT 1",
    ).bind(resumeId, record.user_id, format).first<{ object_key: string }>()),
  )).flatMap((row) => row?.object_key ? [row.object_key] : []);

  try {
    const [docx, pdf, preview] = await Promise.all([
      (dependencies.createDocx ?? createResumeDocx)(hardened, theme),
      (dependencies.createPdf ?? createResumePdf)(hardened, false, theme),
      (dependencies.createPdf ?? createResumePdf)(hardened, true, theme),
    ]);
    const fileStatements = await Promise.all([
      storeFile(env, record.user_id, resumeId, generationId, "docx", docx),
      storeFile(env, record.user_id, resumeId, generationId, "pdf", pdf),
      storeFile(env, record.user_id, resumeId, generationId, "preview", preview),
    ]);
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE resumes SET generated_json = ?, updated_at = CURRENT_TIMESTAMP WHERE resume_id = ? AND user_id = ?",
      ).bind(JSON.stringify(hardened), resumeId, record.user_id),
      ...fileStatements,
    ]);
    await Promise.allSettled(
      previousObjectKeys.filter((key) => !newObjectKeys.includes(key)).map((key) => env.BOOKS!.delete(key)),
    );
  } catch (error) {
    await Promise.allSettled(newObjectKeys.map((key) => env.BOOKS!.delete(key)));
    throw error;
  }

  const finalGate = evaluateCriticalResumeGate(hardened, intake, record.title);
  return { found: true, ready: finalGate.ready, score: finalGate.score, issues: finalGate.issues, changed: true };
}
