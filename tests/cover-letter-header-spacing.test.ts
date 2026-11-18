import assert from 'node:assert/strict';
import test from 'node:test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCoverLetterPdf, type GeneratedCoverLetter } from '../worker/cover-letter-documents';
import { defaultStyle } from '../worker/resume-templates';

const letter: GeneratedCoverLetter = {
  basics: { fullName: 'Jordan Taylor', location: 'Atlanta, GA', phone: '(555) 010-0000', email: 'jordan.taylor@example.com' },
  date: 'September 13, 2026', companyName: 'Sample Property Group', targetJobTitle: 'HVAC Maintenance Technician',
  salutation: 'Dear Hiring Manager,', paragraphs: ['First paragraph.', 'Second paragraph.'], closing: 'Sincerely,',
};

async function lines(bytes: Uint8Array) {
  const task = getDocument({ data: Uint8Array.from(bytes), isEvalSupported: false });
  const pdf = await task.promise;
  try {
    const page = await pdf.getPage(1);
    return (await page.getTextContent()).items.flatMap(item => 'str' in item && item.str.trim() ? [{ str: item.str, y: item.transform[5], size: Math.abs(item.transform[3]) }] : []);
  } finally { await task.destroy(); }
}

// Regression: v1 records on the Clean, Red Accent and Lead looks drew the contact line into
// the name because every line advanced a fixed 14.2 pt regardless of font size.
for (const theme of ['plain', 'navy', 'lead'] as const) {
  test(`v1 ${theme} cover letter keeps the contact line clear of the name`, async () => {
    const items = await lines(await createCoverLetterPdf(letter, theme, false, defaultStyle(theme, 1)));
    const name = items.find(item => item.str.includes('Jordan Taylor'))!;
    const contact = items.find(item => item.str.includes('jordan.taylor@example.com'))!;
    assert.ok(name && contact, 'name and contact line are drawn');
    // Gap between the name's baseline and the top of the contact line's capitals (~0.72 em).
    const gap = name.y - (contact.y + contact.size * 0.72);
    assert.ok(gap >= name.size * 0.21 + 2, `contact capitals sit below the name's descenders (gap ${gap.toFixed(1)} pt)`);
  });
}
