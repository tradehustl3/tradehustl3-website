import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { sampleResume } from '../../docs/pr186/sample-resume';
import { createResumePdf, createResumeDocx } from '../../worker/resume-documents';
import { createCoverLetterPdf, createCoverLetterDocx } from '../../worker/cover-letter-documents';
import { defaultStyle, type TemplateKey } from '../../worker/resume-templates';
await mkdir('docs/pr186/samples', { recursive: true });
const timings: Record<string, number> = {};
for (const theme of ['plain', 'navy', 'lead'] as TemplateKey[]) {
  const style = defaultStyle(theme), start = performance.now();
  const [pdf, docx] = await Promise.all([createResumePdf(sampleResume, false, theme, theme, style), createResumeDocx(sampleResume, theme, theme, style)]);
  timings[theme] = Math.round(performance.now() - start);
  await writeFile(`docs/pr186/samples/${theme}.pdf`, pdf);
  await writeFile(`docs/pr186/samples/${theme}.docx`, docx);
  const letter = { basics: sampleResume.basics, date: 'October 3, 2026', companyName: 'Example Mechanical', targetJobTitle: 'HVAC Lead Technician', salutation: 'Dear Hiring Manager,', paragraphs: ['I am applying for the HVAC Lead Technician position. My experience includes commercial and residential HVAC service, equipment diagnostics, and preventive maintenance.', 'At Ridgeway Mechanical, I lead a two-person service crew, train apprentices, and document completed work orders. I hold EPA 608 Universal and OSHA 30 credentials.', 'I welcome the opportunity to discuss how my hands-on service experience can support your team.'], closing: 'Sincerely,' };
  await writeFile(`docs/pr186/samples/${theme}-cover.pdf`, await createCoverLetterPdf(letter, theme, false, style));
  await writeFile(`docs/pr186/samples/${theme}-cover.docx`, await createCoverLetterDocx(letter, theme, style));
}
await writeFile('docs/pr186/render-timings.json', JSON.stringify({ environment: 'local Node 24; resume PDF and DOCX generated together; excludes storage/network', milliseconds: timings }, null, 2) + '\n');
