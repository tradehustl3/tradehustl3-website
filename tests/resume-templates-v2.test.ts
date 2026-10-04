import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createResumeDocx, createResumePdf } from '../worker/resume-documents';
import { FONTS, TEXT_SIZES, SPACINGS, ACCENTS, BODY_SIZES, FONT_FAMILIES, defaultStyle, validStylePatch, type TemplateKey } from '../worker/resume-templates';
import { sampleResume } from '../docs/pr186/sample-resume';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const themes: TemplateKey[] = ['plain', 'navy', 'lead'];
async function parse(bytes: Uint8Array) {
  const task = getDocument({ data: Uint8Array.from(bytes), isEvalSupported: false });
  const pdf = await task.promise;
  return { pdf, task };
}

test('all 486 template/customization combinations render readable PDFs and tab-based DOCX', { timeout: 600_000 }, async () => {
  let count = 0;
  for (const theme of themes) for (const font of FONTS) for (const textSize of TEXT_SIZES) for (const spacing of SPACINGS) for (const accent of ACCENTS) {
    const style = { font, textSize, spacing, accent, templateVersion: 2 as const };
    const [pdfBytes, docx] = await Promise.all([createResumePdf(sampleResume, false, theme, theme, style), createResumeDocx(sampleResume, theme, theme, style)]);
    const { pdf, task } = await parse(pdfBytes);
    try {
      const items = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        for (const item of content.items) if ('str' in item && item.str.trim()) {
          assert.ok(item.height >= 9.99, `${theme}/${font}/${textSize}: text below 10 pt`);
          assert.ok(item.transform[4] >= 47 && item.transform[4] + item.width <= 565, `${theme}/${font}: clipped text ${item.str}`);
          assert.ok(item.transform[5] >= 47, 'text below bottom margin');
          items.push(item);
        }
      }
      const text = items.map(item => item.str).join(' ').replace(/\s+/g, ' ');
      assert.match(text, /Marcus Reed|MARCUS REED/);
      assert.match(text, /Ridgeway Mechanical/); assert.match(text, /Brightline Comfort Services/);
      assert.ok(text.indexOf('Ridgeway Mechanical') < text.indexOf('Brightline Comfort Services'), 'experience reading order');
      assert.ok(items.some(item => Math.abs(item.height - BODY_SIZES[textSize]) < .01), 'selected body size is rendered');
      for (const skill of sampleResume.skills) assert.ok(text.replace(/\s/g, '').includes(skill.replace(/\s/g, '')), `${theme}/${font}/${textSize}/${spacing}/${accent}: missing source skill ${skill}\n${text}`);
    } finally { await task.destroy(); }
    const zip = await JSZip.loadAsync(docx), xml = await zip.file('word/document.xml')!.async('string');
    assert.doesNotMatch(xml, /<w:tbl[ >]/); assert.match(xml, /<w:tabs>/);
    assert.ok(xml.includes(`w:ascii="${FONT_FAMILIES[font].docx}"`));
    assert.ok(xml.includes(`w:sz w:val="${BODY_SIZES[textSize] * 2}"`));
    for (const match of xml.matchAll(/<w:sz w:val="(\d+)"/g)) assert.ok(Number(match[1]) >= 20 || Number(match[1]) === 2, 'DOCX readable text size (empty underline excluded)');
    count++;
    if (count % 162 === 0) console.log(`Verified ${count} / 486 output combinations`);
  }
  assert.equal(count, 486);
});

test('actual PDF structures distinguish mockups: centered header, solid top bar, tinted band, skill columns', async () => {
  for (const theme of themes) {
    const { pdf, task } = await parse(await createResumePdf(sampleResume, false, theme, theme, defaultStyle(theme)));
    try {
      const page = await pdf.getPage(1), content = await page.getTextContent(), operators = await page.getOperatorList();
      const items = content.items.filter((item): item is Extract<typeof item, { str: string }> => 'str' in item && Boolean(item.str));
      const name = items.find(item => /MARCUS REED|Marcus Reed/.test(item.str))!;
      assert.ok(name);
      if (theme === 'plain') assert.ok(Math.abs(name.transform[4] + name.width / 2 - 306) < 3, 'Field Pro centered name');
      else assert.equal(name.transform[4], 48, 'left-aligned name');
      const rectangles = operators.fnArray.flatMap((fn, i) => fn === OPS.constructPath ? [operators.argsArray[i]] : []);
      if (theme !== 'plain') assert.ok(rectangles.length > 0, 'layout contains drawn bar/band');
      // Pixel inspection of the actual rendered PDF checks geometry and tint.
      const canvasModule = await import('@napi-rs/canvas');
      const canvas = canvasModule.createCanvas(612, 792);
      const context = canvas.getContext('2d');
      await page.render({ canvas: canvas as never, canvasContext: context as never, viewport: page.getViewport({ scale: 1 }) }).promise;
      const pixel = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data].slice(0, 3);
      if (theme === 'navy') assert.deepEqual(pixel(2, 2), [215, 25, 32], 'Modern Trade full-width red top bar');
      if (theme === 'lead') {
        assert.ok(pixel(2, 2).every(channel => channel < 255 && channel > 230), 'Lead tinted full-width band');
        assert.deepEqual(pixel(2, 109), [32, 61, 96], 'Lead thick accent band border');
      }
      if (theme === 'plain') assert.deepEqual(pixel(2, 2), [255, 255, 255]);
      const skills = items.filter(item => sampleResume.skills.some(skill => item.str.includes(skill)));
      const xs = new Set(skills.map(item => Math.round(item.transform[4])));
      assert.equal(xs.size, theme === 'navy' ? 2 : 3, 'actual skill columns');
      const text = items.map(item => item.str).join(' ');
      const compact = text.replace(/\s/g, '');
      assert.ok(compact.indexOf(theme === 'lead' ? 'CREDENTIALS' : 'CERTIFICATIONS') < compact.indexOf(theme === 'lead' ? 'PROFESSIONALEXPERIENCE' : 'WORKEXPERIENCE'));
    } finally { await task.destroy(); }
  }
});

test('presentation settings do not change the writing track or invent scope', async () => {
  const resume = { ...sampleResume, experience: sampleResume.experience.map(({ scope: _scope, ...job }) => { void _scope; return job; }) };
  const { pdf, task } = await parse(await createResumePdf(resume, false, 'lead', 'plain', defaultStyle('lead')));
  try {
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) text += (await (await pdf.getPage(i)).getTextContent()).items.map(item => 'str' in item ? item.str : '').join(' ');
    assert.ok(text.replace(/\s/g, '').includes('PROFESSIONALSUMMARY')); assert.ok(text.replace(/\s/g, '').includes('CORESKILLS')); assert.doesNotMatch(text, /Scope:/);
  } finally { await task.destroy(); }
});

test('version 1 routes to the unchanged legacy output bytes with fixed clock', async () => {
  const RealDate = Date;
  class FixedDate extends RealDate { constructor(value?: string | number) { super(value ?? '2026-10-03T12:00:00Z'); } }
  globalThis.Date = FixedDate as DateConstructor;
  try {
    for (const theme of themes) {
      const legacy = await createResumePdf(sampleResume, false, theme, theme);
      const version1 = await createResumePdf(sampleResume, false, theme, theme, defaultStyle(theme, 1));
      assert.deepEqual(version1, legacy);
      assert.deepEqual(await createResumeDocx(sampleResume, theme, theme, defaultStyle(theme, 1)), await createResumeDocx(sampleResume, theme, theme));
    }
  } finally { globalThis.Date = RealDate; }
});

test('migration 0009 constrains settings, preserves existing rows, and rolls back locally', () => {
  const db = new DatabaseSync(':memory:');
  db.exec("CREATE TABLE resumes (resume_id TEXT PRIMARY KEY, theme TEXT); INSERT INTO resumes VALUES ('old','plain')");
  db.exec(readFileSync(new URL('../drizzle/0009_resume_customization.sql', import.meta.url), 'utf8'));
  assert.equal(db.prepare('SELECT template_version FROM resumes').get()!.template_version, 1);
  for (const [column, value] of [['font','Comic'], ['text_size','Tiny'], ['spacing','Huge'], ['accent','Pink'], ['template_version',3]]) assert.throws(() => db.prepare(`UPDATE resumes SET ${column} = ?`).run(value));
  db.exec(readFileSync(new URL('../drizzle/0009_resume_customization_down.sql', import.meta.url), 'utf8'));
  assert.deepEqual({ ...db.prepare('SELECT * FROM resumes').get() }, { resume_id: 'old', theme: 'plain' });
  db.close();
});

test('only exact presentation values and keys are accepted', () => {
  for (const body of [{ font: 'Classic' }, { theme: 'lead', textSize: 'Large', spacing: 'Compact', accent: 'Forest Green' }]) assert.ok(validStylePatch(body));
  for (const body of [{}, { font: 'classic' }, { accent: '#ffffff' }, { textSize: 9 }, { templateVersion: 2 }, { creditsUsed: 0 }, { theme: 'navy', bogus: true }]) assert.equal(validStylePatch(body), false);
});

test('v2 Lead PDF and DOCX use technical operations competencies', async () => {
  const { pdf, task } = await parse(await createResumePdf(sampleResume, false, 'lead', 'lead', defaultStyle('lead')));
  try {
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) text += (await (await pdf.getPage(i)).getTextContent()).items.map(item => 'str' in item ? item.str : '').join(' ');
    assert.ok(text.replace(/\s+/g, '').includes('TECHNICAL&OPERATIONSCOMPETENCIES'));
    assert.ok(!text.replace(/\s+/g, '').includes('LEADERSHIP&OPERATIONSCOMPETENCIES'));
  } finally { await task.destroy(); }
  const zip = await JSZip.loadAsync(await createResumeDocx(sampleResume, 'lead', 'lead', defaultStyle('lead')));
  const xml = await zip.file('word/document.xml')!.async('string');
  assert.match(xml, /TECHNICAL &amp; OPERATIONS COMPETENCIES/);
  assert.doesNotMatch(xml, /LEADERSHIP &amp; OPERATIONS COMPETENCIES/);
});
