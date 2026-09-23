/** Shared by extraction, coverage, and upload validation. Never infer a month. */
export function normalizeDateSeparators(value: string): string {
  return value.replace(/[‐-―−]/g, "-");
}

export const CURRENT_DATE_SOURCE = "(?:present|current|currently|now|ongoing|to date)";
export const MONTH_SOURCE = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
export const DATE_SOURCE = `(?:${MONTH_SOURCE}\\.?\\s+|(?:0?[1-9]|1[0-2])/)?(?:19|20)\\d{2}`;
export const DATE_RANGE_SOURCE = `\\b(${DATE_SOURCE})\\s*(?:-|to|through|thru)\\s*(${DATE_SOURCE}|${CURRENT_DATE_SOURCE})\\b`;
// A start date whose end is blank or a short non-date marker ("unknown", "TBD", "?").
// The end marker is one short token followed by end-of-line or a field delimiter,
// so an employer or title sharing the line is never consumed.
const OPEN_RANGE_SOURCE = `\\b(${DATE_SOURCE})\\s*(?:-|to|through|thru)(?:\\s*[A-Za-z?]{1,12})?(?=\\s*(?:$|[|•·,;]))`;

export function isCurrentDate(value: string): boolean {
  return new RegExp(`^${CURRENT_DATE_SOURCE}$`, "i").test(value.trim());
}

export function parseResumeDate(value: string): { year: number; month: number | null } | null {
  const cleaned = normalizeDateSeparators(value).trim();
  if (!new RegExp(`^${DATE_SOURCE}$`, "i").test(cleaned)) return null;
  const year = Number(cleaned.match(/(?:19|20)\d{2}$/)?.[0]);
  const prefix = cleaned.slice(0, -4).trim().replace(/[./]$/, "");
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const month = prefix ? (/^\d+$/.test(prefix) ? Number(prefix) : months.indexOf(prefix.slice(0, 3).toLowerCase()) + 1) : null;
  return { year, month };
}

export function dateBefore(start: string, end: string): boolean {
  const a = parseResumeDate(start);
  const b = parseResumeDate(end);
  return Boolean(a && b && (b.year < a.year || (b.year === a.year && a.month && b.month && b.month < a.month)));
}

/** True when the source literally contains the same year/month (e.g. "Jan 2019" vs "January 2019"). */
export function resumeDateInSource(source: string, value: string): boolean {
  const target = parseResumeDate(value);
  if (!target) return false;
  const tokens = normalizeDateSeparators(source).match(new RegExp(`\\b${DATE_SOURCE}\\b`, "gi")) ?? [];
  return tokens.some((token) => {
    const parsed = parseResumeDate(token);
    return Boolean(parsed && parsed.year === target.year && parsed.month === target.month);
  });
}

export function parseResumeDateRange(line: string): { startDate: string; endDate: string; match: string } | null {
  const normalized = normalizeDateSeparators(line);
  const match = normalized.match(new RegExp(DATE_RANGE_SOURCE, "i"));
  if (match) {
    return { startDate: match[1].trim(), endDate: match[2].trim(), match: line.slice(match.index!, match.index! + match[0].length) };
  }
  // A missing/uninterpretable end does not erase a supported start year.
  const open = normalized.match(new RegExp(OPEN_RANGE_SOURCE, "i"));
  if (!open) return null;
  return { startDate: open[1].trim(), endDate: "", match: line.slice(open.index!, open.index! + open[0].length) };
}
