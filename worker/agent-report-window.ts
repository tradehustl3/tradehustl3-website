/** Authenticated reporting windows. Anchored bounds are [start, end). */
export function agentReportWindow(params: URLSearchParams, now: Date) {
  const window = params.get("window") ?? "7d";
  if (window !== "24h" && window !== "7d" && window !== "month") throw new Error("invalid_report_window");
  const start = params.get("start"), end = params.get("end");
  if (start === null && end === null && window !== "month") {
    return { start: new Date(now.getTime() - (window === "24h" ? 24 : 168) * 3600000),
      end: now, endExclusive: false };
  }
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (window === "24h" || !start || !end || !iso.test(start) || !iso.test(end)) {
    throw new Error("invalid_report_window");
  }
  const from = new Date(start), until = new Date(end);
  const span = until.getTime() - from.getTime();
  if (!Number.isFinite(span) || until.getTime() > now.getTime()) throw new Error("invalid_report_window");
  if (window === "7d") {
    // A seven-day civil window can span 167 or 169 hours at a DST transition.
    if (span < 167 * 3600000 || span > 169 * 3600000 || now.getTime() - from.getTime() > 14 * 86400000) {
      throw new Error("invalid_report_window");
    }
  } else if (!isCalendarMonth(from, until) || now.getTime() - from.getTime() > MONTH_LOOKBACK_MS) {
    // Monthly cost reports cover exactly one completed calendar month in business time.
    throw new Error("invalid_report_window");
  }
  return { start: from, end: until, endExclusive: true };
}

/** The business reports in Atlanta time, matching n8n's America/New_York schedule. */
const REPORT_TIME_ZONE = "America/New_York";
/** Monthly reports may be re-run for up to about 13 months back. */
const MONTH_LOOKBACK_MS = 400 * 86400000;

function civil(date: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIME_ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date).map((p) => [p.type, p.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    midnight: parts.hour === "00" && parts.minute === "00" && parts.second === "00" && date.getUTCMilliseconds() === 0 };
}

/** True when [from, until) is midnight on the 1st to midnight on the 1st of the next month. */
function isCalendarMonth(from: Date, until: Date) {
  const a = civil(from), b = civil(until);
  if (!a.midnight || !b.midnight || a.day !== 1 || b.day !== 1) return false;
  return a.month === 12 ? b.year === a.year + 1 && b.month === 1 : b.year === a.year && b.month === a.month + 1;
}
