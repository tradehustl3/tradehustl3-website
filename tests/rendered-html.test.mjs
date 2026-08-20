import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the TRAD3 HUSTL3 homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();

  assert.match(html, /<title>TRAD3 HUSTL3 \| Built by Hustle, Backed by Trades<\/title>/i);
  assert.match(html, /aria-label="TRAD3 HUSTL3 home"/i);
  assert.match(html, /BUILT BY[\s\S]*HUSTLE\.[\s\S]*BACKED BY[\s\S]*TRADES\./i);
  assert.match(html, /aria-label="Enter, Earn, Elevate"/i);
  assert.match(html, /ENTER[\s\S]*EARN[\s\S]*ELEVATE/i);
});

test("server-renders every part of the TRAD3 HUSTL3 ecosystem", async () => {
  const response = await render();
  assert.equal(response.status, 200);

  const html = await response.text();

  assert.match(html, /<h3>The Book<\/h3>/i);
  assert.match(html, /straight-talking playbook for building a career/i);
  assert.match(html, /<h3>Resume Builder<\/h3>/i);
  assert.match(html, /licenses, certifications, field hours/i);
  assert.match(html, /<h3>HUSTL3 PRO<\/h3>/i);
  assert.match(html, /Premium tools, practical training/i);
  assert.match(html, /<h3>Jobsite Gear<\/h3>/i);
  assert.match(html, /Hard-wearing essentials/i);
  assert.match(html, /<h3>Program Partnerships<\/h3>/i);
  assert.match(html, /trade schools, workforce programs/i);
  assert.match(html, /href="mailto:partners@tradehustl3\.com"/i);
});
