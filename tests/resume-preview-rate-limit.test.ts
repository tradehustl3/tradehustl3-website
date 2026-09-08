import assert from "node:assert/strict";
import test from "node:test";

import {
  effectiveResumePreviewRateLimitCount,
  resumePreviewRateLimitReason,
} from "../worker/resume-builder";

test("unpaid account preview tolerance allows six attempts before the daily limiter trips", () => {
  assert.equal(effectiveResumePreviewRateLimitCount("resume-ai-unpaid-user:user-1", 1), 1);
  assert.equal(effectiveResumePreviewRateLimitCount("resume-ai-unpaid-user:user-1", 6), 3);
  assert.equal(effectiveResumePreviewRateLimitCount("resume-ai-unpaid-user:user-1", 7), 4);
});

test("unpaid IP preview tolerance allows twenty attempts before the daily limiter trips", () => {
  assert.equal(effectiveResumePreviewRateLimitCount("resume-ai-unpaid-ip:hash", 1), 1);
  assert.equal(effectiveResumePreviewRateLimitCount("resume-ai-unpaid-ip:hash", 20), 6);
  assert.equal(effectiveResumePreviewRateLimitCount("resume-ai-unpaid-ip:hash", 21), 7);
});

test("paid/general and global cost-control counters are not weakened", () => {
  assert.equal(effectiveResumePreviewRateLimitCount("resume-ai-user:user-1", 11), 11);
  assert.equal(effectiveResumePreviewRateLimitCount("resume-ai-ip:hash", 21), 21);
  assert.equal(effectiveResumePreviewRateLimitCount("resume-ai-global", 251), 251);
});

test("rate-limit responses identify the bucket that actually blocked the request", () => {
  assert.equal(
    resumePreviewRateLimitReason([
      { bucket: "resume-ai-unpaid-user:user-1", effectiveCount: 4 },
    ]),
    "UNPAID_USER_DAILY",
  );
  assert.equal(
    resumePreviewRateLimitReason([
      { bucket: "resume-ai-unpaid-ip:hash", effectiveCount: 7 },
    ]),
    "UNPAID_IP_DAILY",
  );
  assert.equal(
    resumePreviewRateLimitReason([
      { bucket: "resume-ai-global", effectiveCount: 251 },
    ]),
    "GLOBAL_DAILY",
  );
});

test("configured global daily capacity remains enforced", () => {
  assert.equal(
    resumePreviewRateLimitReason(
      [{ bucket: "resume-ai-global", effectiveCount: 401 }],
      { RESUME_AI_DAILY_ATTEMPT_LIMIT: "400" },
    ),
    "GLOBAL_DAILY",
  );
  assert.equal(
    resumePreviewRateLimitReason(
      [{ bucket: "resume-ai-global", effectiveCount: 400 }],
      { RESUME_AI_DAILY_ATTEMPT_LIMIT: "400" },
    ),
    "UNKNOWN",
  );
});
