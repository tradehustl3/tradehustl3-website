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

// Premier (shown to customers as "Executive"), Blueprint, Technical and Sidebar are
// design-only looks: they change presentation, never the writing track, and they
// render only through the v2 layout.
const designOnly = ['premier', 'blueprint', 'technical', 'sidebar'] as const satisfies readonly TemplateKey[];
/** Leftmost text x: the Sidebar rail's text starts inside the rail. */
const leftEdge = (theme: TemplateKey) => theme === 'sidebar' ? 19 : 47;

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
  assert.deepEqual([...TEMPLATE_KEYS], ['plain', 'navy', 'lead', 'premier', 'blueprint', 'technical', 'sidebar']);
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

test('every design-only look renders every customization as readable, ATS-safe PDF and table-free DOCX', { timeout: 600_000 }, async () => {
  let count = 0;
  for (const theme of designOnly) for (const font of FONTS) for (const textSize of TEXT_SIZES) for (const spacing of SPACINGS) for (const accent of ACCENTS) {
    const style = { font, textSize, spacing, accent, templateVersion: 2 as const };
    const [pdfBytes, docx] = await Promise.all([createResumePdf(sampleResume, false, theme, 'plain', style), createResumeDocx(sampleResume, theme, 'plain', style)]);
    const items = await pdfItems(pdfBytes);
    for (const item of items) {
      assert.ok(item.height >= 9.99, `${theme}/${font}/${textSize}: text below 10 pt`);
      assert.ok(item.x >= leftEdge(theme) && item.x + item.width <= 565, `${theme}/${font}: clipped text ${item.str}`);
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
    // Runs made only of non-breaking spaces carry no text (Blueprint's shaded heading marker).
    for (const [runXml] of xml.matchAll(/<w:r>[\s\S]*?<\/w:r>/g)) {
      const size = runXml.match(/<w:sz w:val="(\d+)"/);
      if (size && !/<w:t[^>]*>\u00a0+<\/w:t>/.test(runXml)) assert.ok(Number(size[1]) >= 20, `${theme}: DOCX text below 10 pt`);
    }
    count++;
  }
  assert.equal(count, 648);
});

test('Executive sets contact beside the name, labels in a left column, and experience first', async () => {
  const items = await pdfItems(await createResumePdf(sampleResume, false, 'premier', 'plain', defaultStyle('premier')));
  const exact = (text: string) => items.find(item => item.str.trim() === text)!;
  const name = items.find(item => item.str.includes('Marcus Reed'))!;
  assert.equal(Math.round(name.x), 48, 'left-aligned name');
  const email = exact('marcus.reed@example.com');
  assert.ok(email && Math.abs(email.x + email.width - 564) < 1.5, 'contact right-aligned to the margin');
  assert.ok(exact('Atlanta, GA') && Math.abs(exact('Atlanta, GA').y - name.y) < 6, 'contact starts on the name line');
  // Standard section labels sit in the left column; their content starts at the column.
  for (const label of ['SUMMARY', 'EXPERIENCE', 'CERTIFICATIONS', 'EDUCATION', 'SKILLS']) {
    const item = items.find(entry => entry.str.replace(/\s/g, '') === label)!;
    assert.ok(item, `${label} label drawn`);
    assert.equal(Math.round(item.x), 48, `${label} in the left column`);
  }
  const job = exact('Lead HVAC Technician');
  assert.equal(Math.round(job.x), 48 + 128, 'content starts at the label column');
  assert.ok(Math.abs(items.find(entry => entry.str.replace(/\s/g, '') === 'EXPERIENCE')!.y - job.y) < 0.5, 'label shares the first line of its section');
  assert.ok(items.some(item => /Ridgeway Mechanical, Atlanta, GA · Mar 2021 – Present/.test(item.str)), 'one italic line with employer, place and dates');
  const text = compact(joined(items));
  let previous = -1;
  for (const label of ['SUMMARY', 'EXPERIENCE', 'CERTIFICATIONS', 'EDUCATION', 'SKILLS']) {
    const at = text.indexOf(label, previous + 1);
    assert.ok(at > previous, `section order: ${label}`);
    previous = at;
  }
  assert.ok(text.includes('HVACLEADTECHNICIAN'), 'title set in capitals');
  assert.ok(text.includes(`${compact(sampleResume.skills[0])}·${compact(sampleResume.skills[1])}`), 'inline skills line');
  const xml = await (await JSZip.loadAsync(await createResumeDocx(sampleResume, 'premier', 'plain', defaultStyle('premier')))).file('word/document.xml')!.async('string');
  assert.match(xml, /w:val="thickThinSmallGap"/, 'DOCX double-rule header');
  assert.equal(xml.match(/<w:ind w:left="2560" w:hanging="2560"\/>/g)?.length, 5, 'DOCX: one hanging label paragraph per section');
  assert.equal(xml.match(/<w:top w:val="single" w:color="BDBDBD"/g)?.length, 4, 'DOCX: a thin rule above every section but the first');
  assert.match(xml, /<w:tab w:val="right" w:pos="10320"\/>/, 'DOCX contact on a right tab');
  assert.doesNotMatch(xml, /<w:tbl[ >]|<w:framePr/);
});

test('Executive stacks the contact under the title when it would not fit beside the name', async () => {
  const long = { ...sampleResume, basics: { ...sampleResume.basics, fullName: 'Maximiliano Alessandro Bartholomew-Rodriguez', email: 'maximiliano.bartholomew.rodriguez@example-hvac-services.com' } };
  const items = await pdfItems(await createResumePdf(long, false, 'premier', 'plain', defaultStyle('premier')));
  const line = items.find(item => item.str.includes('Atlanta, GA |'))!;
  assert.ok(line, 'contact drawn as one line');
  assert.equal(Math.round(line.x), 48);
  const xml = await (await JSZip.loadAsync(await createResumeDocx(long, 'premier', 'plain', defaultStyle('premier')))).file('word/document.xml')!.async('string');
  assert.match(xml, /Atlanta, GA \| \(555\) 010-0142 \| maximiliano/, 'DOCX makes the same choice');
});

test('Blueprint draws a header panel with contact at the right, a credential strip, marker headings and three skill columns', async () => {
  const pdf = await createResumePdf(sampleResume, false, 'blueprint', 'plain', defaultStyle('blueprint'));
  const items = await pdfItems(pdf);
  const exact = (text: string) => items.find(item => item.str.trim() === text)!;
  const email = exact('marcus.reed@example.com');
  assert.ok(email && Math.abs(email.x + email.width - 564) < 1.5, 'contact right-aligned in the panel');
  // Credentials sit on one strip line, each drawn as its own text, after the label.
  const label = exact('CERTIFICATIONS');
  const credentials = sampleResume.certifications.map(c => exact(c.name));
  assert.ok(label && credentials.every(Boolean), 'label and each credential drawn');
  for (const credential of credentials) {
    assert.ok(Math.abs(credential.y - label.y) < 0.5, `${credential.str} on the strip line`);
    assert.ok(credential.x > label.x + label.width, `${credential.str} after the label`);
  }
  const text = compact(joined(items));
  assert.ok(text.indexOf('CERTIFICATIONS') < text.indexOf('PROFESSIONALSUMMARY'), 'credentials come first, in the strip');
  assert.equal(text.match(/CERTIFICATIONS/g)?.length, 1, 'no separate certifications section');
  const skillXs = new Set(items.filter(item => sampleResume.skills.some(skill => item.str.includes(skill))).map(item => Math.round(item.x)));
  assert.equal(skillXs.size, 3, 'three skill columns');
  const heading = items.find(item => item.str.replace(/\s/g, '') === 'PROFESSIONALSUMMARY')!;
  assert.equal(Math.round(heading.x), 48 + 13, 'heading text follows the marker square');
  // Pixel check: the panel starts at the top margin and reaches past the text margin;
  // the strip under it is tinted.
  const task = getDocument({ data: Uint8Array.from(pdf), isEvalSupported: false });
  try {
    const page = await (await task.promise).getPage(1);
    const canvasModule = await import('@napi-rs/canvas');
    const canvas = canvasModule.createCanvas(612, 792), context = canvas.getContext('2d');
    await page.render({ canvas: canvas as never, canvasContext: context as never, viewport: page.getViewport({ scale: 1 }) }).promise;
    const pixel = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data].slice(0, 3);
    assert.deepEqual(pixel(2, 2), [255, 255, 255], 'page corner outside the panel');
    assert.deepEqual(pixel(60, 40), [255, 255, 255], 'nothing above the top margin');
    assert.deepEqual(pixel(25, 60), [32, 61, 96], 'Navy panel reaches past the text margin');
    // Beside the credential label, past the last box, at the label's own height.
    assert.deepEqual(pixel(556, Math.round(792 - label.y - 3)), [233, 236, 239], 'tinted credential strip');
  } finally { await task.destroy(); }
  const xml = await (await JSZip.loadAsync(await createResumeDocx(sampleResume, 'blueprint', 'plain', defaultStyle('blueprint')))).file('word/document.xml')!.async('string');
  assert.match(xml, /<w:shd [^>]*w:fill="203D60"/, 'DOCX solid panel shading');
  assert.match(xml, /<w:color w:val="FFFFFF"\/>/, 'DOCX white header text');
  assert.equal(xml.match(/<w:bdr w:val="single" w:color="203D60"/g)?.length, sampleResume.certifications.length, 'DOCX: each credential is a boxed run');
  assert.match(xml, /<w:tab w:val="right" w:leader="underscore"/, 'DOCX heading rule leader');
  assert.doesNotMatch(xml, /<w:tbl[ >]|<w:framePr/);
});

test('design-only looks keep the writing track: headings follow the track, never the look', async () => {
  for (const theme of designOnly) {
    const lead = compact(joined(await pdfItems(await createResumePdf(sampleResume, false, theme, 'lead', defaultStyle(theme)))));
    const plain = compact(joined(await pdfItems(await createResumePdf(sampleResume, false, theme, 'plain', defaultStyle(theme)))));
    if (theme === 'premier') {
      // Executive labels its sections with standard names for every writing track.
      for (const text of [lead, plain]) for (const label of ['SUMMARY', 'EXPERIENCE', 'SKILLS']) assert.ok(text.includes(label), `${theme}: ${label}`);
      assert.doesNotMatch(lead, /LEADERSHIPPROFILE|PROFESSIONALEXPERIENCE/);
    } else {
      assert.ok(lead.includes('LEADERSHIPPROFILE') && lead.includes('PROFESSIONALEXPERIENCE'), `${theme} with lead track`);
      assert.ok(plain.includes('PROFESSIONALSUMMARY') && plain.includes('WORKEXPERIENCE'), `${theme} with Field Pro track`);
    }
    assert.doesNotMatch(plain, /Scope:/, 'presentation never adds scope lines');
    // Legacy callers with no v2 style still get the v2 layout for these looks.
    assert.ok(compact(joined(await pdfItems(await createResumePdf(sampleResume, false, theme)))).includes('MarcusReed'));
    assert.ok((await createResumeDocx(sampleResume, theme)).byteLength > 0);
  }
});

test('matching cover letters render in every design-only look', async () => {
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
