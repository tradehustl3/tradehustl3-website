import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createResumeDocx, createResumePdf } from '../worker/resume-documents';
import { BODY_SIZES, RESUME_TEMPLATES, TEXT_SIZES, defaultStyle, type TemplateKey } from '../worker/resume-templates';
import { skillCharsPerColumn, skillColumnsThatFit } from '../worker/resume-layout-v2';
import { sampleResume } from '../docs/pr186/sample-resume';

// ATS check (audit finding #2). Skills render in 2-3 tab-stop columns. A skill
// longer than its column used to wrap onto a second line per column, so a
// parser reading left to right got "Variable frequency drive (VFD) Brazing ...
// diagnostics": the skill no longer matched a recruiter's keyword search.
// Realistic long skills from field resumes, mixed with short ones.
const LONG_SKILLS = [
  'Building automation system (BAS) troubleshooting',
  'Variable frequency drive (VFD) diagnostics',
  'Preventive maintenance program scheduling',
  'Commercial kitchen equipment repair',
  'Lockout/tagout (LOTO) procedures',
  'Chiller & boiler maintenance',
  'Brazing & soldering',
  'Work order systems',
  'Ductwork repair',
];
const themes: TemplateKey[] = ['plain', 'navy', 'lead'];
const squash = (value: string) => value.replace(/\s+/g, '');

async function pdfText(bytes: Uint8Array): Promise<string> {
  const task = getDocument({ data: Uint8Array.from(bytes), isEvalSupported: false });
  try {
    const pdf = await task.promise;
    let text = '';
    for (let page = 1; page <= pdf.numPages; page++) {
      const content = await (await pdf.getPage(page)).getTextContent();
      // Content-stream order, the order text extractors and many ATS parsers read.
      text += ' ' + content.items.map(item => ('str' in item ? item.str : '')).join(' ');
    }
    return text;
  } finally {
    await task.destroy();
  }
}

async function docxText(bytes: Uint8Array): Promise<string> {
  const xml = await (await JSZip.loadAsync(bytes)).file('word/document.xml')!.async('string');
  // Paragraphs in document order; tabs and breaks read as whitespace.
  const decode = (value: string) => value
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  return [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map(([paragraph]) =>
    [...paragraph.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g)].map(([, text]) => (text === undefined ? ' ' : decode(text))).join(''),
  ).join(' ');
}

test('every skill reads as one unbroken phrase in PDF and DOCX text, in every template and text size', { timeout: 300_000 }, async () => {
  const resume = { ...sampleResume, skills: LONG_SKILLS };
  const failures: string[] = [];
  for (const theme of themes) for (const textSize of TEXT_SIZES) {
    const style = { ...defaultStyle(theme), textSize };
    const [pdf, docx] = await Promise.all([
      createResumePdf(resume, false, theme, theme, style),
      createResumeDocx(resume, theme, theme, style),
    ]);
    for (const [format, text] of [['PDF', await pdfText(pdf)], ['DOCX', await docxText(docx)]] as const) {
      const flat = squash(text);
      for (const skill of LONG_SKILLS) {
        if (!flat.includes(squash(skill))) failures.push(`${theme}/${textSize}/${format}: "${skill}"`);
      }
    }
  }
  assert.deepEqual(failures, [], `skills split by column wrapping (ATS reads them as broken phrases):\n${failures.join('\n')}`);
});

test('short skills keep each template\'s designed columns; long skills cost columns, never a split', () => {
  const standard = BODY_SIZES.Standard;
  // The current sample resume (longest skill 28 chars) keeps every template's layout.
  for (const theme of themes) {
    const preferred = RESUME_TEMPLATES[theme].skillsColumns;
    assert.equal(skillColumnsThatFit(sampleResume.skills, preferred, standard), preferred, `${theme} keeps ${preferred} columns`);
  }
  // A 32-character skill no longer fits 3 columns at Standard but fits 2.
  assert.equal(skillColumnsThatFit(['Lockout/tagout (LOTO) procedures'], 3, standard), 2);
  // A 48-character skill fits only a single column.
  assert.equal(skillColumnsThatFit(['Building automation system (BAS) troubleshooting'], 3, standard), 1);
  // Larger text means fewer characters per column, never more.
  for (const count of [1, 2, 3]) {
    assert.ok(skillCharsPerColumn(count, BODY_SIZES.Large) <= skillCharsPerColumn(count, BODY_SIZES.Small));
  }
});

// Every skill classifies into a Modern Trade group, so the labelled layout applies.
const GROUPED_LONG_SKILLS = [
  'Building automation system (BAS) troubleshooting',
  'Rooftop unit (RTU) preventive maintenance',
  'Variable frequency drive (VFD) diagnostics',
  'Brazing & soldering',
  'Work order systems',
];

test('Modern Trade keeps its skill group labels when long skills stack the groups', async () => {
  const resume = { ...sampleResume, skills: GROUPED_LONG_SKILLS };
  for (const textSize of TEXT_SIZES) {
    const style = { ...defaultStyle('navy'), textSize };
    for (const [format, text] of [
      ['PDF', await pdfText(await createResumePdf(resume, false, 'navy', 'navy', style))],
      ['DOCX', await docxText(await createResumeDocx(resume, 'navy', 'navy', style))],
    ] as const) {
      assert.match(text, /Systems & equipment/, `${textSize}/${format}`);
      assert.match(text, /Tools & methods/, `${textSize}/${format}`);
      const flat = squash(text);
      for (const skill of GROUPED_LONG_SKILLS) assert.ok(flat.includes(squash(skill)), `${textSize}/${format}: "${skill}" split`);
    }
  }
});
