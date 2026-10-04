import assert from 'node:assert/strict';
import test from 'node:test';
import { handleResumeBuilderRoute } from '../worker/resume-builder';
import { sqliteD1, seedSession, TEST_SESSION } from './helpers/sqlite-d1';
import { sampleResume } from '../docs/pr186/sample-resume';

function setup(failPut = false, failRender = false) {
  const { DB, sqlite } = sqliteD1(); seedSession(sqlite);
  sqlite.prepare("INSERT INTO resumes (resume_id,user_id,trade,title,intake_json,generated_json,status,theme,generation_track) VALUES ('r','user-1','hvac','HVAC','{}',?,'ready','plain','plain')").run(JSON.stringify(sampleResume));
  sqlite.exec("INSERT INTO entitlements (entitlement_id,user_id,resume_id,credits_total,credits_used,status,kind,plan) VALUES ('e','user-1','r',4,1,'active','resume','one_time')");
  const objects = new Map<string, Uint8Array>();
  for (const format of ['pdf', 'docx', 'preview', 'cover_pdf', 'cover_docx', 'cover_json']) {
    const key = `old/${format}`;
    const letter = { basics: sampleResume.basics, date: 'October 3, 2026', targetJobTitle: 'HVAC Lead Technician', salutation: 'Dear Hiring Manager,', paragraphs: ['I service HVAC equipment.'], closing: 'Sincerely,' };
    const bytes = format === 'cover_json' ? new TextEncoder().encode(JSON.stringify(letter)) : new Uint8Array([7]);
    objects.set(key, bytes);
    sqlite.prepare('INSERT INTO resume_files (file_id,resume_id,user_id,format,object_key,byte_size,sha256) VALUES (?,?,?,?,?,?,?)').run(`r:${format}`, 'r', 'user-1', format, key, bytes.length, 'old');
  }
  const BOOKS = {
    async get(key: string) { const bytes = objects.get(key); return bytes ? { text: async () => new TextDecoder().decode(bytes), body: bytes } : null; },
    async put(key: string, bytes: Uint8Array) { if (failPut && key.endsWith('preview.pdf')) throw new Error('storage failure'); objects.set(key, bytes); },
    async delete(key: string) { objects.delete(key); },
  } as unknown as R2Bucket;
  const env = { DB, BOOKS };
  const renderStyles: unknown[] = [];
  const dependencies = {
    createPdf: async (...args: unknown[]) => { if (failRender) throw new Error('render failure'); renderStyles.push(args.at(-1)); return new Uint8Array([1]); },
    createDocx: async (...args: unknown[]) => { renderStyles.push(args.at(-1)); return new Uint8Array([2]); },
    geminiFetch: (async () => { throw new Error('AI must never be called'); }) as typeof fetch,
  };
  const call = (body: object, headers: Record<string,string> = {}, id = 'r') => handleResumeBuilderRoute(new Request(`https://tradehustl3.com/api/resume-builder/resumes/${id}`, { method: 'PATCH', headers: { Cookie: `tradehustl3_resume_session=${TEST_SESSION}`, Origin: 'https://tradehustl3.com', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }), env, dependencies);
  const row = () => ({ ...sqlite.prepare("SELECT * FROM resumes WHERE resume_id='r'").get() });
  const pointers = () => sqlite.prepare("SELECT format,object_key FROM resume_files WHERE resume_id='r' ORDER BY format").all();
  return { sqlite, env, dependencies, objects, renderStyles, call, row, pointers };
}

test('free customization refreshes the complete package without AI, factual edits or correction credits', async () => {
  const s = setup(), before = s.row();
  const result = await s.call({ theme: 'navy', font: 'Traditional', textSize: 'Large', spacing: 'Spacious', accent: 'Forest Green' });
  assert.equal(result!.status, 200); const body = await result!.json() as { runConsumed: boolean; coverLetterRefreshed: boolean };
  assert.equal(body.runConsumed, false); assert.equal(body.coverLetterRefreshed, true);
  assert.equal(s.sqlite.prepare('SELECT credits_used FROM entitlements').get()!.credits_used, 1);
  const after = s.row(); assert.equal(after.generated_json, before.generated_json); assert.equal(after.generation_track, 'plain');
  assert.equal(after.template_version, 2); assert.equal(after.font, 'Traditional'); assert.equal(after.theme, 'navy'); assert.equal(after.status, 'ready');
  for (const style of s.renderStyles) assert.deepEqual(style, { font: 'Traditional', textSize: 'Large', spacing: 'Spacious', accent: 'Forest Green', templateVersion: 2, theme: 'navy' });
  for (const row of s.pointers()) assert.ok(row.format === 'cover_json' || !String(row.object_key).startsWith('old/'));
  assert.ok(s.objects.has('old/pdf'), 'old immutable outputs retained for rollback');
});

for (const [name, failPut, failRender] of [['storage', true, false], ['renderer', false, true]] as const) test(`${name} failure preserves settings and every old file pointer`, async () => {
  const s = setup(failPut, failRender), before = s.row(), pointers = s.pointers();
  assert.equal((await s.call({ font: 'Modern' }))!.status, 500);
  assert.deepEqual(s.row(), before); assert.deepEqual(s.pointers(), pointers);
  assert.equal(s.objects.size, 6, 'staged files cleaned up');
  assert.equal(s.sqlite.prepare('SELECT credits_used FROM entitlements').get()!.credits_used, 1);
  assert.equal(s.sqlite.prepare("SELECT count(*) AS n FROM resume_generations WHERE outcome='running'").get()!.n, 0);
});

test('presentation endpoint enforces origin, session, ownership, allowed values and package locks', async () => {
  const s = setup(), before = s.row();
  assert.equal((await s.call({ font: 'Modern' }, { Origin: 'https://evil.example' }))!.status, 403);
  assert.equal((await s.call({ font: 'Modern' }, { Cookie: '' }))!.status, 401);
  assert.equal((await s.call({ font: 'Modern' }, {}, 'someone-elses-resume'))!.status, 404);
  s.sqlite.exec("INSERT INTO users (user_id,email,full_name) VALUES ('other','other@example.com','Other'); INSERT INTO resumes (resume_id,user_id,trade,title,intake_json,status) VALUES ('foreign','other','hvac','HVAC','{}','draft')");
  assert.equal((await s.call({ font: 'Modern' }, {}, 'foreign'))!.status, 404);
  for (const body of [{ font: 'Comic Sans' }, { textSize: '9' }, { accent: '#ff0000' }, { theme: 'navy', creditsUsed: 0 }]) assert.equal((await s.call(body))!.status, 400);
  assert.deepEqual(s.row(), before);
  s.sqlite.exec("UPDATE resumes SET status='generating' WHERE resume_id='r'");
  assert.equal((await s.call({ spacing: 'Compact' }))!.status, 409);
  s.sqlite.exec("UPDATE resumes SET status='ready' WHERE resume_id='r'; INSERT INTO resume_generations (generation_id,resume_id,user_id,mode,model,outcome) VALUES ('cover-letter-lock:r','r','user-1','cover_letter_lock','lock','running')");
  assert.equal((await s.call({ spacing: 'Compact' }))!.status, 409);
});

test('unpaid users can customize but clean downloads remain entitlement protected', async () => {
  const s = setup(); s.sqlite.exec('DELETE FROM entitlements');
  assert.equal((await s.call({ accent: 'Burgundy' }))!.status, 200);
  assert.equal(s.sqlite.prepare('SELECT count(*) AS n FROM entitlements').get()!.n, 0);
  const download = await handleResumeBuilderRoute(new Request('https://tradehustl3.com/api/resume-builder/resumes/r/files/pdf', { headers: { Cookie: `tradehustl3_resume_session=${TEST_SESSION}` } }), s.env, s.dependencies);
  assert.equal(download!.status, 404, 'unpaid clean files retain the existing non-disclosing response');
});


test('D1 commit failure rolls back all file pointers and settings as one transaction', async () => {
  const s = setup(), before = s.row(), pointers = s.pointers();
  s.env.DB.batch = (async (statements: D1PreparedStatement[]) => {
    s.sqlite.exec('BEGIN');
    try {
      for (let i = 0; i < statements.length; i++) {
        if (i === 2) throw new Error('simulated D1 commit failure');
        await statements[i].run();
      }
      s.sqlite.exec('COMMIT'); return [];
    } catch (error) { s.sqlite.exec('ROLLBACK'); throw error; }
  }) as D1Database['batch'];
  assert.equal((await s.call({ accent: 'Forest Green' }))!.status, 500);
  assert.deepEqual(s.row(), before); assert.deepEqual(s.pointers(), pointers); assert.equal(s.objects.size, 6);
});
