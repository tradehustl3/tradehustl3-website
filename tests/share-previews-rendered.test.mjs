import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

async function render(path) {
  const worker = (await import('../dist/server/index.js')).default;
  return worker.fetch(new Request(`https://tradehustl3.com${path}`),
    { ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} });
}

function jpegDimensions(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'JPEG signature');
  let offset = 2;
  while (offset < bytes.length) {
    assert.equal(bytes[offset], 0xff);
    const marker = bytes[offset + 1];
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    }
    offset += 2 + bytes.readUInt16BE(offset + 2);
  }
  throw new Error('JPEG has no dimensions');
}

test('shared public pages expose real JPEG previews in the server-rendered head', async () => {
  const sitemap = await (await render('/sitemap.xml')).text();
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
  const checked = new Set();
  for (const path of paths) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    const head = (await response.text()).split('</head>')[0];
    const meta = Object.fromEntries([...head.matchAll(/<meta (?:property|name)="([^"]+)" content="([^"]*)"/g)].map(m => [m[1], m[2]]));
    const image = new URL(meta['og:image']);
    assert.equal(image.origin, 'https://tradehustl3.com', path);
    assert.match(image.pathname, /\.jpg$/, path);
    assert.equal(meta['og:image:type'], 'image/jpeg', path);
    assert.equal(meta['twitter:image'], image.href, path);
    assert.ok(meta['og:title']?.includes('TRADE HUSTL3'), path);
    const favicon = head.match(/<link[^>]*href="\/favicon-96x96\.png"[^>]*>/)?.[0];
    assert.ok(favicon, `${path}: 96px favicon linked`);
    assert.match(favicon, /rel="icon"/);
    assert.match(favicon, /sizes="96x96"/);
    assert.match(favicon, /type="image\/png"/);
    if (!checked.has(image.pathname)) {
      const file = new URL(`../public${image.pathname}`, import.meta.url);
      assert.ok((await stat(file)).size < 512 * 1024, image.pathname);
      assert.deepEqual(jpegDimensions(await readFile(file)), {
        width: Number(meta['og:image:width']), height: Number(meta['og:image:height']),
      });
      checked.add(image.pathname);
    }
  }
  assert.equal(checked.size, 4, 'hub, Resume Builder, book and guide previews');
});
