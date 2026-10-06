/**
 * Production smoke-test sign-in for the Resume Builder.
 *
 * POST /api/resume-builder/internal/smoke/session
 *   Authorization: Bearer <SMOKE_TEST_LOGIN_SECRET>
 *
 * Issues a normal Resume Builder session cookie for ONE hard-coded synthetic
 * account and resets that account's two fixture resumes to a known state, so the
 * post-deploy smoke run can exercise the signed-in review flow without email.
 *
 * Guarantees:
 * - Disabled (indistinguishable 404) unless SMOKE_TEST_LOGIN_SECRET is 32+ chars.
 * - The account is never chosen by the request. No body, query or header can
 *   name another user; real customers cannot be signed in through this path.
 * - Browser-originated calls (any Origin header) are refused.
 * - Attempts are rate limited per IP before the secret is checked.
 * - Sessions last 15 minutes (customer sessions last 14 days).
 * - Fixtures are fictional, unpaid, and rendered without any AI call or credit.
 * - The reserved address cannot receive magic links, and its funnel events are
 *   dropped (see resume-builder-base.ts).
 */
import {
  checkRateLimit,
  issueResumeSession,
  json,
  requestIp,
  secureSecretMatch,
  sha256Hex,
  SMOKE_TEST_EMAIL,
  type ResumeBuilderDependencies,
  type ResumeBuilderEnv,
} from "./resume-builder-base";
import { createResumeDocx, createResumePdf, type GeneratedResume, type ResumeTheme } from "./resume-documents";
import { defaultStyle, storedStyle, type ResumeStyle } from "./resume-templates";
import { errorKind } from "./resume-safe-log";

export const SMOKE_SESSION_PATH = "/api/resume-builder/internal/smoke/session";
export const SMOKE_USER_ID = "5800ffd0-8094-4e92-bc2d-5b8aad9ac235";
export const SMOKE_CURRENT_RESUME_ID = "f18c1fc3-fb93-4f64-b7d3-d490df7d098a";
export const SMOKE_LEGACY_RESUME_ID = "90e80559-0d9b-4c35-8395-2569f61f10f1";
export const SMOKE_SESSION_TTL_SECONDS = 15 * 60;
const MIN_SECRET_LENGTH = 32;
const ATTEMPTS_PER_IP_PER_15_MIN = 10;
const SESSIONS_PER_HOUR = 20;

// Every fact below is fictional (555 phone, example.com email). Intake and
// generated content carry the same facts so source-grounding checks agree.
const FIXTURE_ROLES = [
  {
    jobTitle: "HVAC Service Technician",
    employer: "Smoke Test Mechanical",
    location: "Atlanta, GA",
    startDate: "Mar 2021",
    endDate: "Present",
    current: true,
    bullets: [
      "Diagnose and repair rooftop units, split systems, and heat pumps for commercial accounts.",
      "Complete scheduled preventive maintenance on air handlers, filters, belts, and condenser coils.",
      "Recover, evacuate, and charge refrigerant to manufacturer specifications.",
      "Close work orders with readings, parts used, and recommended next steps.",
    ],
  },
  {
    jobTitle: "Maintenance Technician",
    employer: "Fixture Property Services",
    location: "Marietta, GA",
    startDate: "Jun 2018",
    endDate: "Feb 2021",
    current: false,
    bullets: [
      "Repaired plumbing fixtures, lighting, doors, and appliances in occupied apartment buildings.",
      "Replaced thermostats, igniters, and filters during seasonal heating and cooling maintenance.",
      "Responded to after-hours emergency calls for water leaks and loss of heat.",
    ],
  },
] as const;

const FIXTURE_SKILLS = [
  "Rooftop unit service",
  "Split system repair",
  "Heat pump troubleshooting",
  "Refrigerant recovery",
  "Preventive maintenance",
  "Work order systems",
];

const FIXTURE_CERTIFICATIONS = ["EPA 608 Universal", "OSHA 10"];

export const SMOKE_FIXTURE_NAME = "Smoke Test Candidate";

function fixtureIntake(): Record<string, unknown> {
  return {
    trade: "HVAC & Refrigeration",
    contact: {
      fullName: SMOKE_FIXTURE_NAME,
      email: "smoke.candidate@example.com",
      phone: "(555) 010-0199",
      cityState: "Atlanta, GA",
    },
    career: { targetTitle: "HVAC Service Technician", yearsExperience: "7" },
    fieldValue: {
      licenses: "",
      certifications: FIXTURE_CERTIFICATIONS,
      technicalSkills: FIXTURE_SKILLS,
      tools: [],
      equipmentSystems: [],
      software: [],
      safety: [],
    },
    experience: FIXTURE_ROLES.map((role) => ({ ...role, bullets: [...role.bullets] })),
    education: "HVAC Technology Certificate, Fixture Technical College, 2018",
    additionalDetails: "",
    sourceResumeText: "",
    targetJob: { title: "HVAC Service Technician", company: "", location: "" },
    meta: { schemaVersion: 1, wizardVersion: 4, source: "fresh", importedResume: false, sourceResumePreserved: false, smokeFixture: true },
  };
}

function fixtureGenerated(): GeneratedResume {
  return {
    basics: {
      fullName: SMOKE_FIXTURE_NAME,
      targetTitle: "HVAC Service Technician",
      location: "Atlanta, GA",
      phone: "(555) 010-0199",
      email: "smoke.candidate@example.com",
    },
    summary: "HVAC service technician with commercial and residential maintenance experience. Diagnoses and repairs rooftop units, split systems, and heat pumps, and completes preventive maintenance. Holds EPA 608 Universal and OSHA 10.",
    skills: [...FIXTURE_SKILLS],
    certifications: FIXTURE_CERTIFICATIONS.map((name) => ({ name })),
    experience: FIXTURE_ROLES.map(({ jobTitle, employer, location, startDate, endDate, bullets }) => ({
      jobTitle, employer, location, startDate, endDate, bullets: [...bullets],
    })),
    education: [{ credential: "HVAC Technology Certificate", institution: "Fixture Technical College", location: "Atlanta, GA", year: "2018" }],
    additionalInformation: [],
  };
}

type FixtureSpec = {
  resumeId: string;
  title: string;
  theme: ResumeTheme;
  /** Legacy rows keep template_version 1 and the pre-V2 column defaults. */
  templateVersion: 1 | 2;
};

export const SMOKE_FIXTURES: readonly FixtureSpec[] = [
  { resumeId: SMOKE_CURRENT_RESUME_ID, title: "HVAC Service Technician", theme: "plain", templateVersion: 2 },
  { resumeId: SMOKE_LEGACY_RESUME_ID, title: "HVAC Service Technician (legacy)", theme: "navy", templateVersion: 1 },
];

function fixtureStyle(spec: FixtureSpec): ResumeStyle {
  if (spec.templateVersion === 2) return defaultStyle(spec.theme, 2);
  // Matches what a pre-V2 row reads as after migration 0009's column defaults.
  return storedStyle({ font: "Classic", text_size: "Standard", spacing: "Standard", accent: "Black", template_version: 1 }, spec.theme);
}

class FixtureCollisionError extends Error {
  constructor() { super("Smoke fixture id belongs to another account."); this.name = "FixtureCollisionError"; }
}

function notFound(): Response {
  return json({ ok: false, message: "Route not found." }, 404);
}

/** Restores one fixture: fresh files, known settings, unpaid, not locked. */
async function resetFixture(
  env: ResumeBuilderEnv & { BOOKS: R2Bucket },
  dependencies: ResumeBuilderDependencies,
  userId: string,
  spec: FixtureSpec,
): Promise<void> {
  // Fixed ids are random v4 UUIDs, but never assume: if any other account owns
  // this id, abort before rendering or writing anything.
  const owner = await env.DB.prepare("SELECT user_id FROM resumes WHERE resume_id = ?")
    .bind(spec.resumeId).first<{ user_id: string }>();
  if (owner && owner.user_id !== userId) throw new FixtureCollisionError();

  const generated = fixtureGenerated();
  const style = fixtureStyle(spec);
  // V1 rows render through the legacy path, exactly as production did before V2.
  const renderStyle = spec.templateVersion === 2 ? style : undefined;
  const renderPdf = dependencies.createPdf ?? createResumePdf;
  const renderDocx = dependencies.createDocx ?? createResumeDocx;
  const files = await Promise.all([
    renderPdf(generated, true, spec.theme, spec.theme, renderStyle).then((bytes) => ({ format: "preview", bytes })),
    renderPdf(generated, false, spec.theme, spec.theme, renderStyle).then((bytes) => ({ format: "pdf", bytes })),
    renderDocx(generated, spec.theme, spec.theme, renderStyle).then((bytes) => ({ format: "docx", bytes })),
  ]);

  const prefix = `resume-builder/${userId}/${spec.resumeId}/`;
  const generationId = crypto.randomUUID();
  const keep = new Set<string>();
  const fileStatements: D1PreparedStatement[] = [];
  for (const { format, bytes } of files) {
    const extension = format === "docx" ? "docx" : "pdf";
    const key = `${prefix}smoke/${generationId}/${format}.${extension}`;
    keep.add(key);
    await env.BOOKS.put(key, bytes, {
      httpMetadata: {
        contentType: extension === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    });
    fileStatements.push(env.DB.prepare(
      `INSERT INTO resume_files (file_id, resume_id, user_id, format, object_key, byte_size, sha256)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(file_id) DO UPDATE SET object_key = excluded.object_key, byte_size = excluded.byte_size,
         sha256 = excluded.sha256, created_at = CURRENT_TIMESTAMP
       WHERE resume_files.user_id = excluded.user_id`,
    ).bind(`${spec.resumeId}:${format}`, spec.resumeId, userId, format, key, bytes.byteLength, await sha256Hex(bytes)));
  }

  // Every write is scoped to the synthetic user. The ownership check above is the
  // collision guard; the upserts' WHERE clauses are a second line of defense.
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO resumes (resume_id, user_id, trade, title, intake_json, generated_json, target_job_posting,
         status, theme, generation_track, font, text_size, spacing, accent, template_version, generated_at, updated_at, deleted_at)
       VALUES (?, ?, 'HVAC & Refrigeration', ?, ?, ?, NULL, 'ready', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
       ON CONFLICT(resume_id) DO UPDATE SET
         trade = excluded.trade, title = excluded.title, intake_json = excluded.intake_json,
         generated_json = excluded.generated_json, target_job_posting = NULL, status = 'ready',
         theme = excluded.theme, generation_track = excluded.generation_track, font = excluded.font,
         text_size = excluded.text_size, spacing = excluded.spacing, accent = excluded.accent,
         template_version = excluded.template_version, generated_at = excluded.generated_at,
         updated_at = CURRENT_TIMESTAMP, deleted_at = NULL
       WHERE resumes.user_id = excluded.user_id`,
    ).bind(
      spec.resumeId, userId, spec.title, JSON.stringify(fixtureIntake()), JSON.stringify(generated),
      spec.theme, spec.theme, style.font, style.textSize, style.spacing, style.accent, spec.templateVersion,
    ),
    // A crashed earlier run can leave a package lock behind; clear only this fixture's.
    env.DB.prepare("DELETE FROM resume_generations WHERE resume_id = ? AND user_id = ? AND outcome = 'running'")
      .bind(spec.resumeId, userId),
    // Cover-letter artifacts require payment; a fixture must never carry them.
    env.DB.prepare("DELETE FROM resume_files WHERE resume_id = ? AND user_id = ? AND format NOT IN ('pdf', 'docx', 'preview')")
      .bind(spec.resumeId, userId),
    ...fileStatements,
  ]);

  // Customization keeps superseded objects for rollback; fixtures do not need that,
  // so remove everything under this fixture's prefix except the files just written.
  const listed = await env.BOOKS.list({ prefix, limit: 1000 });
  const stale: string[] = listed.objects.map((object: { key: string }) => object.key).filter((key: string) => !keep.has(key));
  if (stale.length) await Promise.allSettled(stale.map((key) => env.BOOKS.delete(key)));
}

export async function handleSmokeSession(
  request: Request,
  env: ResumeBuilderEnv,
  dependencies: ResumeBuilderDependencies = {},
): Promise<Response> {
  const expectedSecret = env.SMOKE_TEST_LOGIN_SECRET?.trim() ?? "";
  // Disabled: look exactly like an unknown route.
  if (expectedSecret.length < MIN_SECRET_LENGTH) return notFound();
  if (request.method !== "POST") return json({ ok: false, message: "Method not allowed." }, 405, { Allow: "POST" });
  // Server-to-server only; a page on any origin must not be able to call this.
  if (request.headers.has("Origin")) return json({ ok: false, message: "Request origin rejected." }, 403);

  const ipBucket = await sha256Hex(requestIp(request));
  if (!await checkRateLimit(env, `smoke-login-ip:${ipBucket}`, ATTEMPTS_PER_IP_PER_15_MIN, 15 * 60)) {
    return json({ ok: false, message: "Too many requests." }, 429);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const provided = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!provided || !await secureSecretMatch(provided, expectedSecret)) {
    return json({ ok: false, message: "Unauthorized." }, 401, { "WWW-Authenticate": "Bearer" });
  }

  if (!await checkRateLimit(env, "smoke-login-global", SESSIONS_PER_HOUR, 60 * 60)) {
    return json({ ok: false, message: "Too many requests." }, 429);
  }
  if (!env.BOOKS) return json({ ok: false, message: "File storage is unavailable." }, 503);
  const storageEnv = env as ResumeBuilderEnv & { BOOKS: R2Bucket };

  await env.DB.prepare(
    `INSERT INTO users (user_id, email, full_name) VALUES (?, ?, 'Smoke Test')
     ON CONFLICT(email) DO NOTHING`,
  ).bind(SMOKE_USER_ID, SMOKE_TEST_EMAIL).run();
  const user = await env.DB.prepare("SELECT user_id FROM users WHERE email = ?")
    .bind(SMOKE_TEST_EMAIL).first<{ user_id: string }>();
  if (!user?.user_id) return json({ ok: false, message: "Smoke account unavailable." }, 500);
  const userId = user.user_id;

  // A paid fixture would change what the smoke run asserts (downloads present).
  // Never delete payment records to "fix" that; stop and surface it instead.
  const paid = await env.DB.prepare(
    `SELECT 1 AS found FROM entitlements WHERE user_id = ? AND status = 'active'
     UNION ALL SELECT 1 FROM resume_orders WHERE user_id = ? AND status = 'paid' LIMIT 1`,
  ).bind(userId, userId).first<{ found: number }>();
  if (paid) return json({ ok: false, message: "Smoke account has a paid record; fixtures not reset." }, 409);

  try {
    for (const spec of SMOKE_FIXTURES) await resetFixture(storageEnv, dependencies, userId, spec);
  } catch (error) {
    if (error instanceof FixtureCollisionError) {
      console.error("Smoke fixture reset refused: fixture id collision");
      return json({ ok: false, message: "Smoke fixture id collision; nothing was changed." }, 409);
    }
    console.error("Smoke fixture reset failed", errorKind(error));
    return json({ ok: false, message: "Smoke fixtures could not be reset." }, 500);
  }

  const cookie = await issueResumeSession(env, userId, SMOKE_SESSION_TTL_SECONDS);
  return json(
    {
      ok: true,
      expiresInSeconds: SMOKE_SESSION_TTL_SECONDS,
      resumes: { current: SMOKE_CURRENT_RESUME_ID, legacy: SMOKE_LEGACY_RESUME_ID },
    },
    200,
    { "Set-Cookie": cookie },
  );
}
