import {
  PROGRAM_FORMATS,
  PROGRAM_INQUIRY_HONEYPOT,
  PROGRAM_INQUIRY_LIMITS,
  PROGRAM_TYPES,
  type ProgramFormat,
  type ProgramType,
} from "../app/book/program-inquiry-options";
import { BOOK_PARTNERSHIPS_EMAIL } from "../app/book/editions";

/**
 * Schools & programs inquiry for the TRADE HUSTL3 book.
 *
 * Every inquiry is stored in D1 first, so a lead is never lost when Brevo is
 * down. The partners inbox notification and the Brevo contact sync run after
 * the insert; a failure there is logged (without personal data) and the
 * inquiry stays recoverable from `book_program_inquiries` where
 * `notified_at IS NULL`.
 */

export const PROGRAM_INQUIRY_INTEREST = "School / Workforce Partnership";
export const PROGRAM_INQUIRY_SOURCE = "book_program_inquiry";

// Mirrors drizzle/0013_book_program_inquiries.sql so the form works whether the
// Worker deploys before or after an operator runs the migration.
export const PROGRAM_INQUIRY_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS book_program_inquiries (
    inquiry_id TEXT PRIMARY KEY NOT NULL,
    organization TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT,
    program_type TEXT NOT NULL,
    format TEXT NOT NULL,
    copies INTEGER NOT NULL CHECK (copies BETWEEN 1 AND 10000),
    needed_by TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    notified_at TEXT,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  )`,
  `CREATE INDEX IF NOT EXISTS book_program_inquiries_created_idx
    ON book_program_inquiries (created_at)`,
  `CREATE INDEX IF NOT EXISTS book_program_inquiries_email_idx
    ON book_program_inquiries (email, created_at)`,
] as const;

export type ProgramInquiry = {
  organization: string;
  contactName: string;
  email: string;
  role: string;
  programType: ProgramType;
  format: ProgramFormat;
  copies: number;
  neededBy: string;
  message: string;
};

export type ParseResult =
  | { kind: "valid"; inquiry: ProgramInquiry }
  | { kind: "spam" }
  | { kind: "invalid"; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Collapses whitespace and strips control characters from a single-line field. */
function cleanLine(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Keeps line breaks in the free-text message but strips other control characters. */
function cleanMessage(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function isRealCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function includesValue<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value);
}

export function parseProgramInquiry(body: Record<string, unknown>): ParseResult {
  if (cleanLine(body[PROGRAM_INQUIRY_HONEYPOT], 200)) return { kind: "spam" };

  const limits = PROGRAM_INQUIRY_LIMITS;
  const organization = cleanLine(body.organization, limits.organization);
  const contactName = cleanLine(body.contactName, limits.contactName);
  const email = cleanLine(body.email, 254).toLowerCase();
  const role = cleanLine(body.role, limits.role);
  const programType = cleanLine(body.programType, 80);
  const format = cleanLine(body.format, 40);
  const neededBy = cleanLine(body.neededBy, 10);
  const message = cleanMessage(body.message, limits.message);
  const copiesRaw = typeof body.copies === "number" ? body.copies : Number(cleanLine(body.copies, 6));

  if (organization.length < 2) return { kind: "invalid", message: "Enter your school, program, or organization name." };
  if (contactName.length < 2) return { kind: "invalid", message: "Enter your name." };
  if (!EMAIL_PATTERN.test(email)) return { kind: "invalid", message: "Enter a valid email address." };
  if (!includesValue(PROGRAM_TYPES, programType)) return { kind: "invalid", message: "Choose the type of program." };
  if (!includesValue(PROGRAM_FORMATS, format)) return { kind: "invalid", message: "Choose a format." };
  if (!Number.isInteger(copiesRaw) || copiesRaw < limits.minCopies || copiesRaw > limits.maxCopies) {
    return { kind: "invalid", message: `Enter an estimated number of copies from ${limits.minCopies} to ${limits.maxCopies.toLocaleString("en-US")}.` };
  }
  if (neededBy && !isRealCalendarDate(neededBy)) return { kind: "invalid", message: "Enter the date you need the books as a real date." };

  return {
    kind: "valid",
    inquiry: { organization, contactName, email, role, programType, format, copies: copiesRaw, neededBy, message },
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Internal notification for the partners inbox. All submitted text is escaped. */
export function renderProgramInquiryNotification(inquiry: ProgramInquiry, inquiryId: string): { subject: string; htmlContent: string } {
  const rows: Array<[string, string]> = [
    ["Organization", inquiry.organization],
    ["Contact", inquiry.contactName],
    ["Email", inquiry.email],
    ["Role", inquiry.role || "Not given"],
    ["Program type", inquiry.programType],
    ["Format", inquiry.format],
    ["Estimated copies", inquiry.copies.toLocaleString("en-US")],
    ["Needed by", inquiry.neededBy || "Not given"],
  ];
  const tableRows = rows
    .map(([label, value]) => `<tr><td style="padding:6px 12px 6px 0;color:#5b6770;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 0;color:#071a2b;font-weight:600">${escapeHtml(value)}</td></tr>`)
    .join("");
  const messageBlock = inquiry.message
    ? `<p style="margin:20px 0 6px;color:#5b6770">Message</p><p style="margin:0;white-space:pre-wrap;color:#071a2b">${escapeHtml(inquiry.message)}</p>`
    : "";

  return {
    subject: `Book program inquiry: ${inquiry.organization.slice(0, 80)} (${inquiry.copies.toLocaleString("en-US")} copies)`,
    htmlContent: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px">
        <p style="color:#d71920;font-weight:700;letter-spacing:1px">NEW SCHOOLS &amp; PROGRAMS INQUIRY · TRADE HUSTL3 BOOK</p>
        <table style="border-collapse:collapse;font-size:15px">${tableRows}</table>
        ${messageBlock}
        <p style="margin-top:24px;font-size:12px;color:#8a949b">Inquiry ID ${escapeHtml(inquiryId)}. Reply to this email to answer the contact directly. Do not quote bulk pricing until it has been approved.</p>
      </div>`,
  };
}

type D1Like = {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      run(): Promise<unknown>;
      first<T>(): Promise<T | null>;
    };
    run(): Promise<unknown>;
  };
};

export type ProgramInquiryEnv = {
  DB?: D1Like;
  BREVO_API_KEY?: string;
  BREVO_SAMPLE_SENDER_EMAIL?: string;
};

export type ProgramInquiryDependencies = {
  siteUrl: string;
  checkRateLimit(bucket: string, limit: number, windowSeconds: number): Promise<boolean>;
  sha256Hex(value: string): Promise<string>;
  requestIp(request: Request): string;
  readJsonBody(request: Request, maxBytes: number): Promise<Record<string, unknown> | null>;
  syncContact(contact: { email: string; interest: string; source: string }): Promise<void>;
  queueContactSync(email: string, payload: Record<string, unknown>, error: unknown): Promise<boolean>;
  logEvent(event: string, severity: "warning" | "error", details: Record<string, unknown>): void;
};

const SUCCESS_MESSAGE = "Thanks. Your request is in. We'll reply by email with the options available for your program.";

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const schemaReady = new WeakMap<D1Like, Promise<void>>();

/** Runs the idempotent bootstrap once per database binding (per isolate). */
function ensureSchema(db: D1Like): Promise<void> {
  let ready = schemaReady.get(db);
  if (!ready) {
    ready = PROGRAM_INQUIRY_SCHEMA_STATEMENTS
      .reduce<Promise<unknown>>((previous, statement) => previous.then(() => db.prepare(statement).run()), Promise.resolve())
      .then(() => undefined)
      .catch((error: unknown) => {
        schemaReady.delete(db);
        throw error;
      });
    schemaReady.set(db, ready);
  }
  return ready;
}

async function sendPartnersNotification(env: ProgramInquiryEnv, inquiry: ProgramInquiry, inquiryId: string): Promise<void> {
  const apiKey = env.BREVO_API_KEY?.trim();
  if (!apiKey) throw new Error("Brevo notification is not configured.");
  const { subject, htmlContent } = renderProgramInquiryNotification(inquiry, inquiryId);
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      sender: { name: "TRADE HUSTL3 Website", email: env.BREVO_SAMPLE_SENDER_EMAIL?.trim() || "updates@tradehustl3.com" },
      to: [{ email: BOOK_PARTNERSHIPS_EMAIL }],
      replyTo: { email: inquiry.email, name: inquiry.contactName },
      subject,
      htmlContent,
    }),
  });
  if (!response.ok) throw new Error(`Brevo notification failed with status ${response.status}.`);
}

export async function handleProgramInquiry(
  request: Request,
  env: ProgramInquiryEnv,
  deps: ProgramInquiryDependencies,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  }
  if (!env.DB) return json({ ok: false, message: "Program requests are temporarily unavailable. Please email us instead." }, 503);

  const origin = request.headers.get("Origin");
  if (origin) {
    let sameSite = false;
    try {
      sameSite = new URL(origin).origin === deps.siteUrl;
    } catch {
      sameSite = false;
    }
    if (!sameSite) return json({ ok: false, message: "Invalid request origin." }, 403);
  }

  const body = await deps.readJsonBody(request, 16_000);
  if (!body) return json({ ok: false, message: "Request is invalid or too large." }, 413);

  const parsed = parseProgramInquiry(body);
  // Bots get the same answer as people so the honeypot is not revealed.
  if (parsed.kind === "spam") return json({ ok: true, message: SUCCESS_MESSAGE });
  if (parsed.kind === "invalid") return json({ ok: false, message: parsed.message }, 400);
  const { inquiry } = parsed;

  const [emailAllowed, ipAllowed] = await Promise.all([
    deps.checkRateLimit(`program-inquiry-email:${await deps.sha256Hex(inquiry.email)}`, 3, 60 * 60),
    deps.checkRateLimit(`program-inquiry-ip:${await deps.sha256Hex(deps.requestIp(request))}`, 5, 15 * 60),
  ]);
  if (!emailAllowed || !ipAllowed) {
    return json({ ok: false, message: "Too many requests. Please try again later or email us directly." }, 429);
  }

  const inquiryId = crypto.randomUUID();
  await ensureSchema(env.DB);
  await env.DB.prepare(
    `INSERT INTO book_program_inquiries
     (inquiry_id, organization, contact_name, email, role, program_type, format, copies, needed_by, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    inquiryId,
    inquiry.organization,
    inquiry.contactName,
    inquiry.email,
    inquiry.role || null,
    inquiry.programType,
    inquiry.format,
    inquiry.copies,
    inquiry.neededBy || null,
    inquiry.message || null,
  ).run();

  try {
    await sendPartnersNotification(env, inquiry, inquiryId);
    await env.DB.prepare(
      `UPDATE book_program_inquiries SET notified_at = CURRENT_TIMESTAMP WHERE inquiry_id = ?`,
    ).bind(inquiryId).run();
  } catch (error) {
    deps.logEvent("book_program_inquiry_notification_failed", "warning", {
      inquiryId,
      error: (error instanceof Error ? error.message : String(error)).slice(0, 300),
    });
  }

  const contact = { email: inquiry.email, interest: PROGRAM_INQUIRY_INTEREST, source: PROGRAM_INQUIRY_SOURCE };
  try {
    await deps.syncContact(contact);
  } catch (error) {
    deps.logEvent("book_program_inquiry_contact_sync_deferred", "warning", { inquiryId });
    await deps.queueContactSync(inquiry.email, { interest: contact.interest, source: contact.source }, error);
  }

  return json({ ok: true, message: SUCCESS_MESSAGE });
}
