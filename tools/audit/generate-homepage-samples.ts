import { mkdir, writeFile } from 'node:fs/promises';
import { createCoverLetterDocx, createCoverLetterPdf, type GeneratedCoverLetter } from '../../worker/cover-letter-documents';
import { createResumeDocx, createResumePdf } from '../../worker/resume-documents';
import { defaultStyle } from '../../worker/resume-templates';
import { sampleResume } from '../../docs/pr186/sample-resume';

// Reproduce the public illustrative sample without API calls or customer data.
const letter: GeneratedCoverLetter = {
  basics: { fullName: 'Jordan Taylor', location: 'Atlanta, GA', phone: '(404) 555-0142', email: 'jordan.taylor@example.com' },
  date: 'September 13, 2026', companyName: 'Sample Property Group',
  targetJobTitle: 'HVAC Maintenance Technician', salutation: 'Dear Hiring Manager,',
  paragraphs: [
    'I am applying for the HVAC Maintenance Technician opening. I bring more than 10 years of hands-on experience supporting commercial and multifamily properties through preventive maintenance, HVAC troubleshooting, electrical diagnostics, and work-order execution.',
    'My background includes diagnosing and repairing split systems, working with 24V controls, and documenting completed work in a CMMS. I hold EPA 608 Universal certification and have completed OSHA 10-Hour Construction training.',
    'I would welcome the opportunity to discuss how my field experience can support your maintenance team. Thank you for considering my application.',
  ], closing: 'Sincerely,',
};
const output = 'output/homepage-audit';
await mkdir(output, { recursive: true });
await writeFile(`${output}/jordan-cover-letter.pdf`, await createCoverLetterPdf(letter, 'navy'));
await writeFile(`${output}/jordan-cover-letter.docx`, await createCoverLetterDocx(letter, 'navy'));
const style = defaultStyle('navy');
await writeFile(`${output}/sample-resume.pdf`, await createResumePdf(sampleResume, false, 'navy', 'navy', style));
await writeFile(`${output}/sample-resume.docx`, await createResumeDocx(sampleResume, 'navy', 'navy', style));
console.log(`Generated illustrative PDF and DOCX pairs in ${output}`);
