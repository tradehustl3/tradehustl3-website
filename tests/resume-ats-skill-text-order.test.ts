import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createResumeDocx, createResumePdf } from '../worker/resume-documents';
import { TEXT_SIZES, defaultStyle, type TemplateKey } from '../worker/resume-templates';
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
  return [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map(([paragraph]) =>
    [...paragraph.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g)].map(([, text]) => text ?? ' ').join(''),
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
