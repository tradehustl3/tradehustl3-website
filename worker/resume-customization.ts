import { withCustomerScope } from './resume-presentation-content';
import { acquireCoverLock, releaseCoverLock } from './cover-letter';
import { authorizeResumePresentation, type ResumeBuilderEnv, type ResumeBuilderDependencies } from './resume-builder-base';
import { createResumeDocx, createResumePdf, type GeneratedResume, type ResumeTheme } from './resume-documents';
import { createCoverLetterDocx, createCoverLetterPdf, type GeneratedCoverLetter } from './cover-letter-documents';
import { defaultStyle, storedStyle, validStylePatch, type ResumeStyle } from './resume-templates';
import { errorKind } from './resume-safe-log';

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
/** Stage every package file before atomically switching settings and file pointers.
 * Uses the existing PATCH authorization, origin, rate, ownership and running-generation checks.
 * No AI call, credit reservation, factual edits, or entitlement mutation occurs here.
 */
export async function customizeResume(request: Request, env: ResumeBuilderEnv, dependencies: ResumeBuilderDependencies, resumeId: string, body: Record<string, unknown>): Promise<Response> {
  if (!validStylePatch(body)) return json({ ok: false, message: 'Invalid presentation setting.' }, 400);
  const authorized = await authorizeResumePresentation(request, env, resumeId);
  if (authorized instanceof Response) return authorized;
  const record = authorized;
  const theme = (body.theme ?? record.theme) as ResumeTheme;
  const previousTheme: ResumeTheme = record.theme === 'navy' || record.theme === 'lead' ? record.theme : 'plain';
  const previous = storedStyle(record, previousTheme);
  const style: ResumeStyle = { ...(previous.templateVersion === 1 ? defaultStyle(theme) : previous), ...('theme' in body && previous.templateVersion === 2 ? { ...defaultStyle(theme), textSize: previous.textSize, spacing: previous.spacing } : {}), ...body, templateVersion: 2 };
  if (!await acquireCoverLock(env, record.user_id, resumeId)) return json({ ok: false, message: 'A package update is already in progress.' }, 409);
  const lock = await env.DB.prepare("UPDATE resumes SET status = 'generating', updated_at = CURRENT_TIMESTAMP WHERE resume_id = ? AND user_id = ? AND deleted_at IS NULL AND status <> 'generating'").bind(resumeId, record.user_id).run();
  if ((lock.meta.changes ?? 0) !== 1) { await releaseCoverLock(env, resumeId); return json({ ok: false, message: 'A resume update is already in progress.' }, 409); }
  const unlock = () => env.DB.prepare('UPDATE resumes SET status = ?, updated_at = ? WHERE resume_id = ? AND user_id = ? AND status = \'generating\'').bind(record.status, record.updated_at ?? new Date().toISOString(), resumeId, record.user_id).run();
  const settings = env.DB.prepare('UPDATE resumes SET theme = ?, font = ?, text_size = ?, spacing = ?, accent = ?, template_version = 2, status = ?, updated_at = CURRENT_TIMESTAMP WHERE resume_id = ? AND user_id = ? AND deleted_at IS NULL').bind(theme, style.font, style.textSize, style.spacing, style.accent, record.status, resumeId, record.user_id);
  if (!record.generated_json) { try { await settings.run(); return json({ ok: true, runConsumed: false, style, theme }); } finally { await unlock(); await releaseCoverLock(env, resumeId); } }
  if (!env.BOOKS) { await unlock(); await releaseCoverLock(env, resumeId); return json({ ok: false, message: 'File storage is unavailable.' }, 503); }
  const generationId = crypto.randomUUID(), stagedKeys: string[] = [];
  try {
    const generated = withCustomerScope(JSON.parse(record.generated_json) as GeneratedResume, record.intake_json);
    const track: ResumeTheme = record.generation_track === 'navy' || record.generation_track === 'lead' ? record.generation_track : record.generation_track === 'plain' ? 'plain' : previousTheme;
    const files: Array<{ format: string; bytes: Uint8Array }> = await Promise.all([
      (dependencies.createDocx ?? createResumeDocx)(generated, theme, track, style).then(bytes => ({ format: 'docx', bytes })),
      (dependencies.createPdf ?? createResumePdf)(generated, false, theme, track, style).then(bytes => ({ format: 'pdf', bytes })),
      (dependencies.createPdf ?? createResumePdf)(generated, true, theme, track, style).then(bytes => ({ format: 'preview', bytes })),
    ]);
    const coverRow = await env.DB.prepare("SELECT object_key FROM resume_files WHERE resume_id = ? AND user_id = ? AND format = 'cover_json'").bind(resumeId, record.user_id).first<{ object_key: string }>();
    if (coverRow) {
      const object = await env.BOOKS.get(coverRow.object_key);
      if (!object) throw new Error('Cover letter source missing');
      const letter = JSON.parse(await object.text()) as GeneratedCoverLetter;
      files.push(...await Promise.all([
        createCoverLetterPdf(letter, theme, false, style).then(bytes => ({ format: 'cover_pdf', bytes })),
        createCoverLetterDocx(letter, theme, style).then(bytes => ({ format: 'cover_docx', bytes })),
      ]));
    }
    const statements = [];
    for (const { format, bytes } of files) {
      const extension = format.endsWith('docx') ? 'docx' : 'pdf';
      const key = `resume-builder/${record.user_id}/${resumeId}/generations/${generationId}/${format}.${extension}`;
      stagedKeys.push(key);
      await env.BOOKS.put(key, bytes, { httpMetadata: { contentType: extension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } });
      const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer);
      const sha = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      statements.push(env.DB.prepare(`INSERT INTO resume_files (file_id, resume_id, user_id, format, object_key, byte_size, sha256) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(file_id) DO UPDATE SET object_key = excluded.object_key, byte_size = excluded.byte_size, sha256 = excluded.sha256, created_at = CURRENT_TIMESTAMP`).bind(`${resumeId}:${format}`, resumeId, record.user_id, format, key, bytes.byteLength, sha));
    }
    await env.DB.batch([...statements, settings]);
    // Keep old immutable objects for rollback and lifecycle cleanup. No old file
    // is deleted before the whole package transaction has committed.
    return json({ ok: true, runConsumed: false, filesRefreshed: true, coverLetterRefreshed: Boolean(coverRow), style, theme, message: 'Design updated. Free — no correction used.' });
  } catch (error) {
    await Promise.allSettled(stagedKeys.map(key => env.BOOKS!.delete(key)));
    console.error('Resume customization failed', errorKind(error));
    return json({ ok: false, runConsumed: false, message: 'We could not update the design. Your settings and existing files were preserved.' }, 500);
  } finally { await unlock(); await releaseCoverLock(env, resumeId); }
}
