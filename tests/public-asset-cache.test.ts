import assert from 'node:assert/strict';
import test from 'node:test';
import { withPublicAssetCache } from '../worker/public-asset-cache';

test('missing image responses cannot be cached for a year by browsers or CDNs', async () => {
  for (const method of ['GET', 'HEAD']) {
    for (const path of ['/optimized/missing.jpg', '/favicon.ico']) {
      const response = withPublicAssetCache(new Request(`https://tradehustl3.com${path}`, { method }),
        new Response(method === 'HEAD' ? null : 'Not found', { status: 404,
          headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=31536000, immutable' } }));
      assert.equal(response.status, 404);
      for (const header of ['Cache-Control', 'CDN-Cache-Control', 'Cloudflare-CDN-Cache-Control']) {
        assert.equal(response.headers.get(header), 'no-store');
      }
    }
  }
});

test('only successful images receive long caching; stable icons can refresh', () => {
  const asset = (path: string, type: string, status = 200) => withPublicAssetCache(
    new Request(`https://tradehustl3.com${path}`), new Response('body', { status, headers: { 'Content-Type': type } }));
  assert.equal(asset('/optimized/og-hub-v2.jpg', 'image/jpeg').headers.get('Cache-Control'), 'public, max-age=31536000, immutable');
  assert.equal(asset('/favicon.svg', 'image/svg+xml').headers.get('Cache-Control'), 'public, max-age=3600, must-revalidate');
  assert.equal(asset('/favicon-96x96.png', 'image/png').headers.get('Cache-Control'), 'public, max-age=3600, must-revalidate');
  assert.equal(asset('/optimized/failed.jpg', 'text/html').headers.get('Cache-Control'), 'no-store');
  assert.equal(asset('/optimized/redirect.jpg', 'text/html', 302).headers.get('Cache-Control'), 'no-store');
  assert.equal(asset('/optimized/unavailable.jpg', 'image/jpeg', 503).headers.get('Cache-Control'), 'no-store');
});

test('asset caching does not change private or API response caching', () => {
  const original = new Response('private', { headers: { 'Cache-Control': 'private, no-store' } });
  const response = withPublicAssetCache(new Request('https://tradehustl3.com/api/resume-builder/resumes/example'), original);
  assert.equal(response, original);
});
