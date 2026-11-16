import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createResumeDocx, createResumePdf } from '../worker/resume-documents';
import { createCoverLetterDocx, createCoverLetterPdf } from '../worker/cover-letter-documents';
import { handleResumeBuilderRoute } from '../worker/resume-builder';
import {
  ACCENTS, BODY_SIZES, FONTS, FONT_FAMILIES, SPACINGS, TEXT_SIZES, TEMPLATE_KEYS,
  defaultStyle, isCareerTrack, normalizeTemplate, storedStyle, trackForTemplate, validStylePatch, type TemplateKey,
} from '../worker/resume-templates';
import { sampleResume } from '../docs/pr186/sample-resume';
import { sqliteD1, seedSession, TEST_SESSION } from './helpers/sqlite-d1';

// Premier and Blueprint are design-only looks: they change presentation, never the
// writing track, and they render only through the v2 layout.
const designOnly = ['premier', 'blueprint'] as const satisfies readonly TemplateKey[];

async function pdfItems(bytes: Uint8Array) {
  const task = getDocument({ data: Uint8Array.from(bytes), isEvalSupported: false });
  const pdf = await task.promise;
  try {
    const items: Array<{ str: string; x: number; y: number; width: number; height: number; page: number }> = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const content = await (await pdf.getPage(pageNumber)).getTextContent();
      for (const item of content.items) if ('str' in item && item.str.trim()) items.push({ str: item.str, x: item.transform[4], y: item.transform[5], width: item.width, height: item.height, page: pageNumber });
    }
    return items;
  } finally { await task.destroy(); }
}
const joined = (items: Array<{ str: string }>) => items.map(item => item.str).join(' ').replace(/\s+/g, ' ');
const compact = (text: string) => text.replace(/\s/g, '');

test('template keys separate design-only looks from career tracks', () => {
  assert.deepEqual([...TEMPLATE_KEYS], ['plain', 'navy', 'lead', 'premier', 'blueprint']);
  for (const key of designOnly) {
    assert.equal(isCareerTrack(key), false);
    assert.ok(validStylePatch({ theme: key }));
    assert.equal(normalizeTemplate(key), key);
    // A design-only look keeps the stored track and never becomes one.
    assert.equal(trackForTemplate(key, 'lead'), 'lead');
    assert.equal(trackForTemplate(key, null), 'plain');
    assert.equal(trackForTemplate(key, key), 'plain');
    // There is no v1 renderer for these looks, so stored settings always resolve to v2.
    assert.equal(storedStyle({ template_version: 1 }, key).templateVersion, 2);
  }
  assert.equal(trackForTemplate('navy', 'lead'), 'navy', 'a track-bearing look still carries its own track');
  for (const theme of ['executive', 'Premier', '', null, 3]) {
    assert.equal(validStylePatch({ theme }), false);
    assert.equal(normalizeTemplate(theme), 'plain');
  }
});

test('Premier and Blueprint render every customization as readable, ATS-safe PDF and table-free DOCX', { timeout: 600_000 }, async () => {
  let count = 0;
  for (const theme of designOnly) for (const font of FONTS) for (const textSize of TEXT_SIZES) for (const spacing of SPACINGS) for (const accent of ACCENTS) {
    const style = { font, textSize, spacing, accent, templateVersion: 2 as const };
    const [pdfBytes, docx] = await Promise.all([createResumePdf(sampleResume, false, theme, 'plain', style), createResumeDocx(sampleResume, theme, 'plain', style)]);
    const items = await pdfItems(pdfBytes);
    for (const item of items) {
      assert.ok(item.height >= 9.99, `${theme}/${font}/${textSize}: text below 10 pt`);
      assert.ok(item.x >= 47 && item.x + item.width <= 565, `${theme}/${font}: clipped text ${item.str}`);
      assert.ok(item.y >= 47, `${theme}: text below bottom margin`);
    }
    const text = joined(items);
    assert.match(text, /Marcus Reed/);
    assert.ok(text.indexOf('Ridgeway Mechanical') < text.indexOf('Brightline Comfort Services'), `${theme}: experience reading order`);
    for (const skill of sampleResume.skills) assert.ok(compact(text).includes(compact(skill)), `${theme}/${font}/${textSize}/${spacing}/${accent}: missing source skill ${skill}`);
    for (const credential of sampleResume.certifications) assert.ok(compact(text).includes(compact(credential.name)), `${theme}: missing credential ${credential.name}`);
    assert.ok(items.some(item => Math.abs(item.height - BODY_SIZES[textSize]) < .01), 'selected body size is rendered');
    const xml = await (await JSZip.loadAsync(docx)).file('word/document.xml')!.async('string');
    assert.doesNotMatch(xml, /<w:tbl[ >]/, 'no tables in DOCX');
    assert.ok(xml.includes(`w:ascii="${FONT_FAMILIES[font].docx}"`));
    for (const match of xml.matchAll(/<w:sz w:val="(\d+)"/g)) assert.ok(Number(match[1]) >= 20, `${theme}: DOCX text below 10 pt`);
    count++;
  }
  assert.equal(count, 324);
});

test('Premier is experience-first with a double-rule header and a single flowing skills line', async () => {
  const items = await pdfItems(await createResumePdf(sampleResume, false, 'premier', 'plain', defaultStyle('premier')));
  const name = items.find(item => item.str.includes('Marcus Reed'))!;
  assert.equal(Math.round(name.x), 48, 'left-aligned name');
  const text = compact(joined(items));
  assert.ok(text.indexOf('WORKEXPERIENCE') < text.indexOf('CORESKILLS'), 'experience comes before skills');
  assert.ok(text.indexOf('CORESKILLS') < text.indexOf('CERTIFICATIONS&LICENSES'));
  assert.ok(text.includes('HVACLEADTECHNICIAN'), 'title set in capitals');
  // One flowing line, not a grid: consecutive skills share a line with a separator.
  assert.ok(text.includes(`${compact(sampleResume.skills[0])}·${compact(sampleResume.skills[1])}`), 'inline skills line');
  const xml = await (await JSZip.loadAsync(await createResumeDocx(sampleResume, 'premier', 'plain', defaultStyle('premier')))).file('word/document.xml')!.async('string');
  assert.match(xml, /w:val="thickThinSmallGap"/, 'DOCX double-rule header');
  assert.match(xml, /w:leader="underscore"/, 'DOCX heading rule leader');
});

test('Blueprint draws a solid header panel, banded headings and one credential per line', async () => {
  const pdf = await createResumePdf(sampleResume, false, 'blueprint', 'plain', defaultStyle('blueprint'));
  const items = await pdfItems(pdf);
  // Exact matches: the summary also mentions some credentials in running text.
  const credentials = sampleResume.certifications.map(c => items.find(item => item.str.trim() === c.name)!);
  assert.ok(credentials.every(Boolean), 'each credential drawn as its own line');
  assert.equal(new Set(credentials.map(item => Math.round(item.y))).size, credentials.length, 'each credential on its own line');
  const text = compact(joined(items));
  assert.ok(text.indexOf('CERTIFICATIONS&LICENSES') < text.indexOf('WORKEXPERIENCE'), 'credentials come before experience');
  const skillXs = new Set(items.filter(item => sampleResume.skills.some(skill => item.str.includes(skill))).map(item => Math.round(item.x)));
  assert.equal(skillXs.size, 2, 'two skill columns');
  // Pixel check: the panel is inset to the text margin (the page corner stays white)
  // and filled with the accent colour behind the name.
  const task = getDocument({ data: Uint8Array.from(pdf), isEvalSupported: false });
  try {
    const page = await (await task.promise).getPage(1);
    const canvasModule = await import('@napi-rs/canvas');
    const canvas = canvasModule.createCanvas(612, 792), context = canvas.getContext('2d');
    await page.render({ canvas: canvas as never, canvasContext: context as never, viewport: page.getViewport({ scale: 1 }) }).promise;
    const pixel = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data].slice(0, 3);
    assert.deepEqual(pixel(2, 2), [255, 255, 255], 'page corner outside the panel');
    assert.deepEqual(pixel(42, 40), [32, 61, 96], 'Navy panel fill');
  } finally { await task.destroy(); }
  const xml = await (await JSZip.loadAsync(await createResumeDocx(sampleResume, 'blueprint', 'plain', defaultStyle('blueprint')))).file('word/document.xml')!.async('string');
  assert.match(xml, /<w:shd [^>]*w:fill="203D60"/, 'DOCX solid panel shading');
  assert.match(xml, /<w:color w:val="FFFFFF"\/>/, 'DOCX white header text');
});

test('design-only looks keep the writing track: headings follow the track, never the look', async () => {
  for (const theme of designOnly) {
    const lead = compact(joined(await pdfItems(await createResumePdf(sampleResume, false, theme, 'lead', defaultStyle(theme)))));
    assert.ok(lead.includes('LEADERSHIPPROFILE') && lead.includes('PROFESSIONALEXPERIENCE'), `${theme} with lead track`);
    const plain = compact(joined(await pdfItems(await createResumePdf(sampleResume, false, theme, 'plain', defaultStyle(theme)))));
    assert.ok(plain.includes('PROFESSIONALSUMMARY') && plain.includes('WORKEXPERIENCE'), `${theme} with Field Pro track`);
    assert.doesNotMatch(plain, /Scope:/, 'presentation never adds scope lines');
    // Legacy callers with no v2 style still get the v2 layout for these looks.
    assert.ok(compact(joined(await pdfItems(await createResumePdf(sampleResume, false, theme)))).includes('MarcusReed'));
    assert.ok((await createResumeDocx(sampleResume, theme)).byteLength > 0);
  }
});

test('matching cover letters render in both design-only looks', async () => {
  const letter = { basics: sampleResume.basics, date: 'October 3, 2026', companyName: 'Example Mechanical', targetJobTitle: 'HVAC Lead Technician', salutation: 'Dear Hiring Manager,', paragraphs: ['I am applying for the HVAC Lead Technician position.', 'I lead a two-person service crew.'], closing: 'Sincerely,' };
  for (const theme of designOnly) {
    for (const style of [defaultStyle(theme), undefined]) {
      const text = joined(await pdfItems(await createCoverLetterPdf(letter as never, theme, false, style)));
      assert.match(text, /Dear Hiring Manager/); assert.match(text, /two-person service crew/);
      const xml = await (await JSZip.loadAsync(await createCoverLetterDocx(letter as never, theme, style))).file('word/document.xml')!.async('string');
      assert.match(xml, /two-person service crew/); assert.doesNotMatch(xml, /<w:tbl[ >]/);
    }
  }
});

function presentationSetup(row: { generated: boolean; theme: string; track: string | null }) {
  const { DB, sqlite } = sqliteD1(); seedSession(sqlite);
  sqlite.prepare("INSERT INTO resumes (resume_id,user_id,trade,title,intake_json,generated_json,status,theme,generation_track) VALUES ('r','user-1','hvac','HVAC','{}',?,?,?,?)")
    .run(row.generated ? JSON.stringify(sampleResume) : null, row.generated ? 'ready' : 'draft', row.theme, row.track);
  const objects = new Map<string, Uint8Array>();
  const BOOKS = {
    async get(key: string) { const bytes = objects.get(key); return bytes ? { text: async () => new TextDecoder().decode(bytes), body: bytes } : null; },
    async put(key: string, bytes: Uint8Array) { objects.set(key, bytes); },
    async delete(key: string) { objects.delete(key); },
  } as unknown as R2Bucket;
  const renders: Array<{ theme: unknown; track: unknown }> = [];
  const dependencies = {
    createPdf: async (...args: unknown[]) => { renders.push({ theme: args[2], track: args[3] }); return new Uint8Array([1]); },
    createDocx: async (...args: unknown[]) => { renders.push({ theme: args[1], track: args[2] }); return new Uint8Array([2]); },
    geminiFetch: (async () => { throw new Error('AI must never be called'); }) as typeof fetch,
  };
  const call = (body: object) => handleResumeBuilderRoute(new Request('https://tradehustl3.com/api/resume-builder/resumes/r', { method: 'PATCH', headers: { Cookie: `tradehustl3_resume_session=${TEST_SESSION}`, Origin: 'https://tradehustl3.com', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), { DB, BOOKS }, dependencies);
  const resume = () => ({ ...sqlite.prepare("SELECT theme, generation_track, generated_json, template_version FROM resumes WHERE resume_id='r'").get() });
  return { call, resume, renders };
}

test('switching a generated resume to a design-only look is free and keeps its wording and track', async () => {
  for (const theme of designOnly) {
    const s = presentationSetup({ generated: true, theme: 'lead', track: 'lead' }), before = s.resume();
    const response = await s.call({ theme });
    assert.equal(response!.status, 200);
    assert.equal((await response!.json() as { runConsumed: boolean }).runConsumed, false);
    const after = s.resume();
    assert.equal(after.theme, theme); assert.equal(after.generation_track, 'lead'); assert.equal(after.template_version, 2);
    assert.equal(after.generated_json, before.generated_json, 'wording unchanged');
    assert.ok(s.renders.length >= 3);
    for (const render of s.renders) assert.deepEqual(render, { theme, track: 'lead' }, 'files redrawn in the new look with the existing track');
  }
});

test('choosing a design-only look before the first build records the current track', async () => {
  const s = presentationSetup({ generated: false, theme: 'navy', track: null });
  assert.equal((await s.call({ theme: 'premier' }))!.status, 200);
  assert.deepEqual({ theme: s.resume().theme, track: s.resume().generation_track }, { theme: 'premier', track: 'navy' });
  // Picking a track-bearing look afterwards still sets the look; its track wins at first build.
  assert.equal((await s.call({ theme: 'lead' }))!.status, 200);
  assert.equal(s.resume().theme, 'lead');
  assert.equal(trackForTemplate(s.resume().theme, s.resume().generation_track), 'lead');
  assert.equal((await s.call({ theme: 'executive' }))!.status, 400, 'unknown looks are rejected');
});
