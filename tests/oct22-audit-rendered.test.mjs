import assert from 'node:assert/strict';
import test from 'node:test';

async function render(path) {
  const worker = (await import('../dist/server/index.js')).default;
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: 'text/html' } }),
    { ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} });
}

test('missing pages return 404 with one noindex directive and no canonical', async () => {
  for (const path of ['/audit-missing-page', '/resources/audit-missing-page', '/resume-builder/audit-missing-page']) {
    const response = await render(path);
    assert.equal(response.status, 404, path);
    const html = await response.text();
    const directives = [...html.matchAll(/<meta\b[^>]*name="(robots|googlebot)"[^>]*content="([^"]*)"[^>]*>/g)];
    assert.equal(directives.length, 1, `${path}: one indexing directive`);
    assert.equal(directives[0][2], 'noindex', path);
    assert.doesNotMatch(html, /<link\b[^>]*rel="canonical"/);
  }
});

test('every sitemap page keeps a branded title, short description and its own canonical', async () => {
  const sitemap = await (await render('/sitemap.xml')).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]));
  assert.ok(urls.length >= 24);
  for (const url of urls) {
    const response = await render(url.pathname);
    assert.equal(response.status, 200, url.pathname);
    const html = await response.text();
    const title = html.match(/<title>(.*?)<\/title>/)?.[1];
    assert.match(title ?? '', /TRADE HUSTL3/, url.pathname);
    const descriptions = [...html.matchAll(/<meta name="description" content="([^"]*)"/g)];
    assert.equal(descriptions.length, 1, url.pathname);
    const description = descriptions[0][1].replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec))).replace(/&(amp|quot|lt|gt);/g, (_, name) => ({ amp: '&', quot: '"', lt: '<', gt: '>' })[name]);
    assert.ok(description.length <= 160, `${url.pathname}: ${description.length} character description`);
    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    assert.equal(new URL(canonical).pathname, url.pathname, `${url.pathname}: own canonical`);
  }
});
