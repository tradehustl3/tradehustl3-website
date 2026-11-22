import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const worker = (await import('../dist/server/index.js')).default;
const ctx = { waitUntil() {}, passThroughOnException() {} };
const interest = 'THE HUSTL3 NEWS';

function database({ queueFails = false, insertFails = false } = {}) {
  const writes = [];
  return { writes, DB: { prepare(sql) { return { bind(...values) { return {
    async first() { return /RETURNING count/i.test(sql) ? { count: 1 } : null; },
    async run() {
      if ((queueFails && /INSERT INTO lead_delivery_jobs/.test(sql)) || (insertFails && /INSERT INTO subscribers/.test(sql))) throw new Error('Test write failure');
      writes.push({ sql, values });
      return { success: true };
    },
  }; } }; } } };
}

async function signup(payload, { template = '18', brevoStatus = 204, queueFails = false, insertFails = false } = {}) {
  const db = database({ queueFails, insertFails });
  const calls = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    return new Response(null, { status: brevoStatus });
  };
  try {
    const response = await worker.fetch(new Request('https://tradehustl3.com/api/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://tradehustl3.com' }, body: JSON.stringify(payload),
    }), { DB: db.DB, BREVO_API_KEY: 'test-key', BREVO_LIST_ID: '3', BREVO_DOI_TEMPLATE_ID: template }, ctx);
    return { status: response.status, result: await response.json(), calls, writes: db.writes };
  } finally { globalThis.fetch = previousFetch; }
}

test('NEWS signup requires explicit marketing consent before storing or contacting Brevo', async () => {
  for (const marketingConsent of [undefined, false, 'true']) {
    const response = await signup({ email: 'reader@example.test', interest, marketingConsent });
    assert.equal(response.status, 400);
    assert.match(response.result.message, /agree to receive/i);
    assert.equal(response.calls.length, 0);
    assert.equal(response.writes.length, 0);
  }
});

test('NEWS signup requests confirmation and preserves segmentation and campaign attribution', async () => {
  const response = await signup({ email: ' Reader@Example.test ', interest, marketingConsent: true, utm_source: 'instagram', utm_medium: 'social', utm_campaign: 'news_launch' });
  assert.equal(response.status, 200);
  assert.equal(response.result.subscriptionState, 'confirmation_required');
  assert.match(response.result.message, /tap Confirm/);
  assert.equal(response.calls.length, 1);
  assert.match(response.calls[0].url, /doubleOptinConfirmation$/);
  assert.deepEqual(response.calls[0].body, {
    email: 'reader@example.test', attributes: { INTEREST: interest, SIGNUP_SOURCE: 'newsletter', UTM_SOURCE: 'instagram', UTM_MEDIUM: 'social', UTM_CAMPAIGN: 'news_launch' },
    includeListIds: [3], templateId: 18, redirectionUrl: 'https://tradehustl3.com/subscribed',
  });
  assert.deepEqual(response.writes[0].values, ['reader@example.test', interest, 'newsletter']);
  assert.ok(response.calls.every(call => !call.url.includes('/smtp/email')), 'The website does not send an unconfirmed welcome email');
});

test('NEWS signup uses the direct-list mode when DOI is not configured', async () => {
  const response = await signup({ email: 'reader@example.test', interest, marketingConsent: true }, { template: '' });
  assert.equal(response.result.subscriptionState, 'subscribed');
  assert.match(response.calls[0].url, /\/contacts$/);
  assert.deepEqual(response.calls[0].body.listIds, [3]);
});

test('NEWS Brevo failures queue the original consented request without claiming confirmation', async () => {
  const response = await signup({ email: 'reader@example.test', interest, marketingConsent: true }, { brevoStatus: 503 });
  assert.equal(response.status, 200);
  assert.equal(response.result.subscriptionState, 'queued');
  assert.match(response.result.message, /not confirmed yet/);
  assert.doesNotMatch(response.result.message, /You're on|email (was|has been) sent/i);
  const queued = response.writes.find(write => /INSERT INTO lead_delivery_jobs/.test(write.sql));
  assert.ok(queued);
  const payload = JSON.parse(queued.values[3]);
  assert.equal(payload.interest, interest);
  assert.equal(payload.source, 'newsletter');
  assert.equal(payload.doubleOptIn, true);
});

test('NEWS queue failures report the saved-only state with a support path', async () => {
  const response = await signup({ email: 'reader@example.test', interest, marketingConsent: true }, { brevoStatus: 503, queueFails: true });
  assert.equal(response.result.subscriptionState, 'saved');
  assert.match(response.result.message, /support@tradehustl3.com/);
  assert.match(response.result.message, /not confirmed yet/);
});

test('NEWS storage failure never reports success or invokes Brevo', async () => {
  const response = await signup({ email: 'reader@example.test', interest, marketingConsent: true }, { insertFails: true });
  assert.equal(response.status, 500);
  assert.equal(response.result.ok, false);
  assert.equal(response.calls.length, 0);
});

async function page(path) {
  const response = await worker.fetch(new Request(`https://tradehustl3.com${path}`, { headers: { accept: 'text/html' } }), { ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) } }, ctx);
  assert.equal(response.status, 200, path);
  return (await response.text()).replace(/<!-- -->/g, '');
}

test('NEWS archive and first issue are public, sourced, and connect readers to real next steps', async () => {
  const archive = await page('/news');
  assert.match(archive, /rel="canonical" href="https:\/\/tradehustl3.com\/news"/);
  assert.match(archive, /href="\/news\/001-your-next-move"/);
  const issue = await page('/news/001-your-next-move');
  for (const label of ['ENTER', 'EARN', 'ELEVATE', 'CREDENTIAL CHECK']) assert.ok(issue.includes(label));
  assert.match(issue, /https:\/\/www.osha.gov\/training\/outreach\/faq/);
  assert.match(issue, /not a certification or license/);
  assert.match(issue, /mailto:founder@tradehustl3.com\?subject=My%20next%20trade%20move/);
  assert.match(issue, /ask before publishing your name or story/);
  assert.match(issue, /href="\/#resume-start"/);
  assert.doesNotMatch(issue, /type="email"/);
  const join = await page('/join');
  assert.doesNotMatch(join, /planned weekly trade news roundup|YOU&#x27;RE INVITED/);
  assert.match(join, /href="\/news"/);
  assert.doesNotMatch(join, /type="email"/);
});

test('NEWS discovery and the existing signup destination stay connected', async () => {
  const home = await page('/');
  const start = home.indexOf('id="join-the-movement"');
  const newsletter = home.slice(start, home.indexOf('</section>', start));
  assert.match(newsletter, /THE HUSTL3 NEWS/);
  assert.match(newsletter, /weekly/);
  assert.match(newsletter, /type="email"/);
  const sitemap = await page('/sitemap.xml');
  assert.match(sitemap, /https:\/\/tradehustl3.com\/news<\/loc>/);
  assert.match(sitemap, /https:\/\/tradehustl3.com\/news\/001-your-next-move<\/loc>/);
  assert.doesNotMatch(sitemap, /https:\/\/tradehustl3.com\/subscribed/);
});

test('NEWS email drafts include unsubscribe, attribution, and a send-review gate', async () => {
  for (const name of ['welcome', 'issue-001']) {
    const html = await readFile(new URL(`../emails/hustl3-news/${name}.draft.html`, import.meta.url), 'utf8');
    assert.match(html, /href="\{\{ unsubscribe \}\}"/);
    assert.match(html, /utm_medium=email/);
    assert.match(html, /\[ADD THE APPROVED BUSINESS MAILING ADDRESS IN BREVO\]/);
  }
  const settings = JSON.parse(await readFile(new URL('../emails/hustl3-news/campaign-settings.draft.json', import.meta.url), 'utf8'));
  assert.equal(settings.issue001.schedule, null);
  assert.equal(settings.status, 'draft_requires_account_review');
});
