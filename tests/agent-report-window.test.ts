import assert from "node:assert/strict";
import { test } from "node:test";
import { agentReportWindow } from "../worker/agent-report-window";

const now = new Date("2026-10-12T12:00:00Z");
test("legacy windows remain rolling and inclusive", () => {
  const result = agentReportWindow(new URLSearchParams("window=24h"), now);
  assert.equal(result.start.toISOString(), "2026-10-11T12:00:00.000Z");
  assert.equal(result.endExclusive, false);
});
test("anchored completed days retain exact bounds and exclude the end", () => {
  const result = agentReportWindow(new URLSearchParams({window:"7d",
    start:"2026-10-05T00:00:00-04:00",end:"2026-10-12T00:00:00-04:00"}), now);
  assert.equal(result.start.toISOString(), "2026-10-05T04:00:00.000Z");
  assert.equal(result.end.toISOString(), "2026-10-12T04:00:00.000Z");
  assert.equal(result.endExclusive, true);
});
test("DST civil weeks accept 167 and 169 hours", () => {
  for (const [start,end] of [["2026-03-02T00:00:00-05:00","2026-03-09T00:00:00-04:00"],
    ["2026-10-26T00:00:00-04:00","2026-11-02T00:00:00-05:00"]]) {
    assert.equal(agentReportWindow(new URLSearchParams({window:"7d",start,end}),
      new Date(new Date(end).getTime()+3600000)).endExclusive, true);
  }
});
test("partial, invalid, future, oversized and old bounds are refused", () => {
  for (const value of ["start=2026-10-05T00:00:00Z", "start=x&end=y",
    "window=24h&start=2026-10-05T00:00:00Z&end=2026-10-12T00:00:00Z",
    "start=2026-10-06T00:00:00Z&end=2026-10-13T00:00:00Z",
    "start=2026-10-01T00:00:00Z&end=2026-10-12T00:00:00Z",
    "start=2026-09-20T00:00:00Z&end=2026-09-27T00:00:00Z"]) {
    assert.throws(() => agentReportWindow(new URLSearchParams(value), now), /invalid_report_window/);
  }
});
