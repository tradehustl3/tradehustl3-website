import assert from "node:assert/strict";
import test from "node:test";
import { handleResumeAiBridge, resetAccessTokenCacheForTests } from "../services/resume-ai-bridge/app.mjs";

const secret = "0123456789abcdef0123456789abcdef";
const env = {
  RESUME_AI_BRIDGE_SECRET: secret,
  GOOGLE_CLOUD_PROJECT_ID: "trade-hustl3-resume-ai",
  GOOGLE_CLOUD_LOCATION: "global",
  GEMINI_MODEL: "gemini-3.8-flash",
};
const generationRequest = {
  model: "gemini-3.8-flash",
  systemInstruction: { parts: [{ text: "Use verified facts only." }] },
  contents: [{ role: "user", parts: [{ text: "Create a resume." }] }],
  generationConfig: {
    maxOutputTokens: 99_999,
    candidateCount: 9,
    responseSchema: { type: "OBJECT", properties: { summary: { type: "STRING" } } },
    thinkingConfig: { thinkingLevel: "HIGH", includeThoughts: true },
  },
};

function request(authorization = `Bearer ${secret}`, body = generationRequest) {
  return new Request("https://bridge.example.run.app/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authorization },
    body: JSON.stringify(body),
  });
}

test("the bridge rejects unauthorized requests before requesting Google credentials", async () => {
  resetAccessTokenCacheForTests();
  let fetchCalls = 0;
  const response = await handleResumeAiBridge(request("Bearer wrong"), env, {
    fetch: async () => { fetchCalls += 1; throw new Error("must not run"); },
  });
  assert.equal(response.status, 401);
  assert.equal(fetchCalls, 0);
});

test("the bridge uses attached identity and re-enforces Gemini cost controls", async () => {
  resetAccessTokenCacheForTests();
  const calls = [];
  const fetchImpl = async (input, init = {}) => {
    calls.push({ url: String(input), init });
    if (String(input).startsWith("http://metadata.google.internal/")) {
      return new Response(JSON.stringify({ access_token: "short-lived-token", expires_in: 3600 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: "{\"summary\":\"Ready\"}" }] } }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 12 },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const response = await handleResumeAiBridge(request(), env, { fetch: fetchImpl });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(new Headers(calls[0].init.headers).get("metadata-flavor"), "Google");
  assert.match(calls[1].url, /projects\/trade-hustl3-resume-ai\/locations\/global\/publishers\/google\/models\/gemini-3\.8-flash:generateContent$/);
  assert.equal(new Headers(calls[1].init.headers).get("authorization"), "Bearer short-lived-token");
  const forwarded = JSON.parse(String(calls[1].init.body));
  assert.equal(forwarded.generationConfig.maxOutputTokens, 2_200);
  assert.equal(forwarded.generationConfig.candidateCount, 1);
  assert.equal(forwarded.generationConfig.responseMimeType, "application/json");
  assert.deepEqual(forwarded.generationConfig.thinkingConfig, { thinkingLevel: "LOW", includeThoughts: false });
});

test("the bridge prevents callers from selecting a different model", async () => {
  resetAccessTokenCacheForTests();
  let fetchCalls = 0;
  const response = await handleResumeAiBridge(request(`Bearer ${secret}`, {
    ...generationRequest,
    model: "unapproved-model",
  }), env, { fetch: async () => { fetchCalls += 1; } });
  assert.equal(response.status, 400);
  assert.equal(fetchCalls, 0);
});
