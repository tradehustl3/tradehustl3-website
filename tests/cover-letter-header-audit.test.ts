import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCoverLetterDocx, createCoverLetterPdf, type GeneratedCoverLetter } from '../worker/cover-letter-documents';
import { createResumeDocx } from '../worker/resume-documents';
import { sampleResume } from '../docs/pr186/sample-resume';
import { defaultStyle, type TemplateKey } from '../worker/resume-templates';

// Illustrative data only; never calls generation, email, storage, or checkout APIs.
const letter: GeneratedCoverLetter = {
  basics: { fullName: 'Jordan Taylor', location: 'Atlanta, GA', phone: '(404) 555-0100', email: 'jordan@example.com' },
  date: 'November 11, 2026', companyName: 'Example Mechanical',
  targetJobTitle: 'HVAC Maintenance Technician', salutation: 'Dear Hiring Manager,',
  paragraphs: [
    'I am applying for the HVAC Maintenance Technician position. My training includes preventive maintenance, equipment inspections, and safe tool use.',
    'I document completed work and communicate repair needs clearly. I would welcome the opportunity to discuss how my training could support your team.',
  ], closing: 'Sincerely,',
};

for (const theme of ['plain', 'navy', 'lead'] as TemplateKey[]) {
  for (const version of [1, 2] as const) {
    test(`Jordan Taylor cover letter: ${theme} v${version} has separated PDF header and readable DOCX`, async () => {
      const style = defaultStyle(theme, version);
      const pdf = await createCoverLetterPdf(letter, theme, false, style);
      const loaded = await getDocument({ data: pdf }).promise;
      try {
        assert.equal(loaded.numPages, 1, 'short cover letter fits one page');
        const page = await loaded.getPage(1);
        const content = await page.getTextContent();
        const items = content.items.flatMap(item => 'str' in item && item.str.trim() ? [item] : []);
        const names = items.filter(item => /^Jordan Taylor$/i.test(item.str));
        assert.equal(names.length, 2, 'header and signature remain extractable');
        const contact = items.find(item => item.str.includes('jordan@example.com'));
        assert.ok(contact, 'contact information remains extractable');
        const name = names[0];
        assert.ok(name.transform[5] > contact.transform[5] + contact.height + 1,
          'contact line top must sit below the name baseline with a visible gap');
        for (const item of items) {
          assert.ok(item.transform[4] >= 47, `left margin: ${item.str}`);
          assert.ok(item.transform[4] + item.width <= 565, `right margin: ${item.str}`);
          assert.ok(item.transform[5] >= 47, `bottom margin: ${item.str}`);
          assert.ok(item.transform[5] + item.height <= 769, `top margin: ${item.str}`);
        }
        const text = items.map(item => item.str).join(' ');
        assert.ok(text.includes(letter.paragraphs[0]), 'body extracts in reading order for ATS');
        assert.ok(text.indexOf(letter.salutation) < text.indexOf(letter.paragraphs[0]));
      } finally {
        await loaded.destroy();
      }
      const zip = await JSZip.loadAsync(await createCoverLetterDocx(letter, theme, style));
      const xml = await zip.file('word/document.xml')?.async('string');
      assert.ok(xml);
      assert.match(xml, /Jordan Taylor/);
      assert.match(xml, /jordan@example.com/);
      assert.ok(xml.includes(letter.paragraphs[0]), 'body is ordinary selectable text');
      assert.match(xml, /<w:pgSz[^>]*w:w="12240"[^>]*w:h="15840"/);
      assert.match(xml, /w:pgMar/);
      assert.match(xml, /w:rFonts/);
      assert.doesNotMatch(xml, /<w:tbl[ >]|<w:txbxContent[ >]/, 'ATS content uses paragraphs, not tables or text boxes');
    });
  }
}


test('legacy resume DOCX uses the same US Letter page size as its PDF', async () => {
  for (const theme of ['plain', 'navy', 'lead'] as TemplateKey[]) {
    const zip = await JSZip.loadAsync(await createResumeDocx(sampleResume, theme));
    const xml = await zip.file('word/document.xml')?.async('string');
    assert.ok(xml);
    assert.match(xml, /<w:pgSz[^>]*w:w="12240"[^>]*w:h="15840"/);
  }
});
