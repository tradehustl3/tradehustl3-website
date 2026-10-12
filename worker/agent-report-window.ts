/** Authenticated reporting windows. Anchored bounds are [start, end). */
export function agentReportWindow(params: URLSearchParams, now: Date) {
  const window = params.get("window") ?? "7d";
  if (window !== "24h" && window !== "7d") throw new Error("invalid_report_window");
  const start = params.get("start"), end = params.get("end");
  if (start === null && end === null) {
    return { start: new Date(now.getTime() - (window === "24h" ? 24 : 168) * 3600000),
      end: now, endExclusive: false };
  }
  // A seven-day civil window can span 167 or 169 hours at a DST transition.
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (window !== "7d" || !start || !end || !iso.test(start) || !iso.test(end)) {
    throw new Error("invalid_report_window");
  }
  const from = new Date(start), until = new Date(end);
  const span = until.getTime() - from.getTime();
  if (!Number.isFinite(span) || span < 167 * 3600000 || span > 169 * 3600000 ||
      until.getTime() > now.getTime() || now.getTime() - from.getTime() > 14 * 86400000) {
    throw new Error("invalid_report_window");
  }
  return { start: from, end: until, endExclusive: true };
}
