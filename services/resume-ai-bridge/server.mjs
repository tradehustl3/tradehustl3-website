import { createServer } from "node:http";
import { handleResumeAiBridge } from "./app.mjs";

const SERVER_BODY_LIMIT = 140 * 1024;

async function toWebRequest(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > SERVER_BODY_LIMIT) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(chunk);
  }
  const host = request.headers.host || "localhost";
  const init = { method: request.method, headers: request.headers };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = Buffer.concat(chunks);
  return new Request(`http://${host}${request.url}`, init);
}

const server = createServer(async (request, response) => {
  try {
    const bridgeResponse = await handleResumeAiBridge(await toWebRequest(request));
    response.writeHead(bridgeResponse.status, Object.fromEntries(bridgeResponse.headers.entries()));
    response.end(Buffer.from(await bridgeResponse.arrayBuffer()));
  } catch (error) {
    const status = error instanceof Error && error.message === "REQUEST_TOO_LARGE" ? 413 : 500;
    response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ ok: false, message: status === 413 ? "Request too large." : "Internal error." }));
  }
});

server.listen(Number(process.env.PORT || 8080), "0.0.0.0");
