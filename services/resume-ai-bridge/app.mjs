import { timingSafeEqual } from "node:crypto";

const MAX_REQUEST_BYTES = 128 * 1024;
const MAX_OUTPUT_TOKENS = 2_200;
const DEFAULT_MODEL = "gemini-3.8-flash";
const DEFAULT_LOCATION = "global";
const METADATA_TOKEN_URL = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function secretsMatch(received, expected) {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function bearerToken(request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
}

async function accessToken(fetchImpl) {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt) return cachedAccessToken;
  const response = await fetchImpl(METADATA_TOKEN_URL, {
    headers: { "Metadata-Flavor": "Google" },
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json();
  if (!response.ok || typeof payload.access_token !== "string") {
    throw new Error("Cloud Run could not obtain its attached service-account token.");
  }
  const lifetimeSeconds = typeof payload.expires_in === "number" ? payload.expires_in : 3_600;
  cachedAccessToken = payload.access_token;
  cachedAccessTokenExpiresAt = Date.now() + Math.max(60, lifetimeSeconds - 300) * 1_000;
  return cachedAccessToken;
}

export function resetAccessTokenCacheForTests() {
  cachedAccessToken = null;
  cachedAccessTokenExpiresAt = 0;
}

export async function handleResumeAiBridge(request, env = process.env, dependencies = {}) {
  const url = new URL(request.url);
  if (url.pathname === "/health" && request.method === "GET") {
    return json({ ok: true, service: "trade-hustl3-resume-ai-bridge" });
  }
  if (url.pathname !== "/generate") return json({ ok: false, message: "Not found." }, 404);
  if (request.method !== "POST") return json({ ok: false, message: "Method not allowed." }, 405);

  const expectedSecret = env.RESUME_AI_BRIDGE_SECRET?.trim();
  if (!expectedSecret || expectedSecret.length < 32) {
    return json({ ok: false, message: "Bridge authentication is not configured." }, 503);
  }
  if (!secretsMatch(bearerToken(request), expectedSecret)) {
    return json({ ok: false, message: "Unauthorized." }, 401);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return json({ ok: false, message: "Request too large." }, 413);
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) {
    return json({ ok: false, message: "Request too large." }, 413);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ ok: false, message: "Invalid JSON." }, 400);
  }
  const configuredModel = env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  if (payload?.model !== configuredModel) {
    return json({ ok: false, message: "Unsupported model." }, 400);
  }
  if (!payload?.systemInstruction || !Array.isArray(payload?.contents)) {
    return json({ ok: false, message: "Invalid generation request." }, 400);
  }
  const responseSchema = payload?.generationConfig?.responseSchema;
  if (!responseSchema || typeof responseSchema !== "object") {
    return json({ ok: false, message: "A structured response schema is required." }, 400);
  }

  const projectId = env.GOOGLE_CLOUD_PROJECT_ID?.trim();
  const location = env.GOOGLE_CLOUD_LOCATION?.trim() || DEFAULT_LOCATION;
  if (!projectId) return json({ ok: false, message: "Google Cloud project is not configured." }, 503);
  const vertexRequest = {
    systemInstruction: payload.systemInstruction,
    contents: payload.contents,
    generationConfig: {
      candidateCount: 1,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.2,
      seed: 17,
      responseMimeType: "application/json",
      responseSchema,
      thinkingConfig: { thinkingLevel: "LOW", includeThoughts: false },
    },
  };

  try {
    const fetchImpl = dependencies.fetch ?? fetch;
    const token = await accessToken(fetchImpl);
    const endpoint = `https://aiplatform.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`
      + `/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(configuredModel)}:generateContent`;
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(vertexRequest),
      signal: AbortSignal.timeout(45_000),
    });
    const responseBody = await response.text();
    return new Response(responseBody, {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Resume AI bridge request failed", error instanceof Error ? error.message : "Unknown error");
    return json({ ok: false, message: "Resume generation service unavailable." }, 502);
  }
}
