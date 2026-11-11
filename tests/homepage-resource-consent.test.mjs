import assert from 'node:assert/strict';
import test from 'node:test';

const ctx = { waitUntil() {}, passThroughOnException() {} };
const DB = {
  prepare(sql) {
    return { bind() { return {
      async first() { return /RETURNING count/i.test(sql) ? { count: 1 } : null; },
      async run() { return { success: true }; },
    }; } };
  },
};

for (const template of [undefined, '18']) {
  test(`homepage resource-only requests bypass marketing with confirmation template ${template ?? 'absent'}`, async () => {
    const worker = (await import('../dist/server/index.js')).default;
    const calls = [];
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      calls.push({ url: String(input), body: JSON.parse(init.body) });
      return new Response(null, { status: 201 });
    };
    try {
      for (const [interest, route] of [['Book 7-Page Sample', '/book/sample/read'], ['Top 10 Trades', '/api/free-sample']]) {
        const env = { DB, BREVO_API_KEY: 'test-key', BREVO_LIST_ID: '3', BREVO_DOI_TEMPLATE_ID: template,
          SAMPLE_TOKEN_SECRET: 'test-guide-secret' };
        const response = await worker.fetch(new Request('https://tradehustl3.com/api/subscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'resource@example.test', interest, marketingConsent: false }),
        }), env, ctx);
        assert.equal(response.status, 200);
        const result = await response.json();
        assert.equal(result.sampleUrl, route);
        assert.doesNotMatch(result.message, /confirm|join.*updates/i);
        if (interest === 'Book 7-Page Sample') {
          assert.equal(response.headers.get('set-cookie'), null);
          continue;
        }
        const cookie = response.headers.get('set-cookie').split(';')[0];
        const pdf = await worker.fetch(new Request(`https://tradehustl3.com${route}`, { headers: { Cookie: cookie } }), env, ctx);
        assert.equal(pdf.status, 200);
        assert.match(pdf.headers.get('content-type'), /application\/pdf/);
        const blocked = await worker.fetch(new Request(`https://tradehustl3.com${route}`), env, ctx);
        assert.equal(blocked.status, 302);
      }
      assert.equal(calls.length, 2, 'one transactional resource email per request');
      assert.ok(calls.every(call => call.url === 'https://api.brevo.com/v3/smtp/email'));
      assert.ok(calls.every(call => !('listIds' in call.body) && !('includeListIds' in call.body)));
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
}
