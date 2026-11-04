/**
 * Shared contract for the schools & programs book inquiry.
 *
 * The /book form (app/book/program-inquiry-form.tsx) renders these options and
 * the Worker (worker/book-program-inquiry.ts) accepts only these values, so the
 * two sides cannot drift apart. Change the lists here, never in one place only.
 */

export const PROGRAM_INQUIRY_ROUTE = "/api/book/program-inquiry";

export const PROGRAM_TYPES = [
  "High school / CTE program",
  "Trade school or technical college",
  "Job Corps center",
  "Workforce development program",
  "Apprenticeship program",
  "Employer",
  "Other",
] as const;

export const PROGRAM_FORMATS = ["Paperback", "eBook (PDF)", "Not sure yet"] as const;

export type ProgramType = (typeof PROGRAM_TYPES)[number];
export type ProgramFormat = (typeof PROGRAM_FORMATS)[number];

export const PROGRAM_INQUIRY_LIMITS = {
  organization: 120,
  contactName: 80,
  role: 80,
  message: 1000,
  minCopies: 1,
  maxCopies: 10000,
} as const;

/** Honeypot field: real people never see or fill it. */
export const PROGRAM_INQUIRY_HONEYPOT = "company_website";
