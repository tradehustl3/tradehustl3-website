import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("monitored Resume Builder classifies high-value failures without payload logging", async () => {
  const source = await readFile(new URL("../worker/resume-builder-monitored.ts", import.meta.url), "utf8");

  for (const expected of [
    "magic_link_request_failed",
    "resume_stripe_webhook_failed",
    "resume_stripe_webhook_rejected",
    "resume_generation_request_failed",
    "resume_document_request_failed",
    "resume_builder_unhandled_failure",
  ]) {
    assert.match(source, new RegExp(expected));
  }

  assert.match(source, /operationalEvent\("auth_email"/);
  assert.match(source, /operationalEvent\("stripe"/);
  assert.match(source, /operationalEvent\("ai_generation"/);
  assert.match(source, /operationalEvent\("document_storage"/);
  assert.doesNotMatch(source, /request\.json\(/);
  assert.doesNotMatch(source, /request\.text\(/);
  assert.doesNotMatch(source, /resumeText/);
});
