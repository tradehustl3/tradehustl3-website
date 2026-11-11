// Renders built pages to static HTML next to the built client assets so a
// reviewer can open or screenshot them without Cloudflare bindings.
// Usage: node tools/visual/render-snapshot.mjs <outDir> [path...]
import { cp, mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

const [outDir = "visual-snapshot", ...requested] = process.argv.slice(2);
const paths = requested.length ? requested : ["/", "/book"];
const worker = (await import(new URL("../../dist/server/index.js", import.meta.url).href)).default;
const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };

await mkdir(outDir, { recursive: true });
for (const dir of ["dist/client", "public"]) {
  try { await access(dir); await cp(dir, outDir, { recursive: true, force: false, errorOnExist: false }); } catch { /* optional */ }
}
for (const path of paths) {
  const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), env, ctx);
  const name = path === "/" ? "index" : path.replace(/^\/|\/$/g, "").replace(/[^a-z0-9]+/gi, "-");
  await writeFile(join(outDir, `${name}.html`), await response.text());
  console.log(`${path} -> ${name}.html (${response.status})`);
}
