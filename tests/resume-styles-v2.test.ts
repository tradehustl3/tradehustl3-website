import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import test from 'node:test';
import JSZip from 'jszip';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createResumeDocx, createResumePdf, type GeneratedResume } from '../worker/resume-documents';
import { createCoverLetterDocx, createCoverLetterPdf } from '../worker/cover-letter-documents';
import { sidebarPlan, solidPng } from '../worker/resume-layout-v2';
import { SKILL_ROW_LABELS, defaultStyle, skillRows } from '../worker/resume-templates';
import { sampleResume } from '../docs/pr186/sample-resume';

async function pdfItems(bytes: Uint8Array) {
  const task = getDocument({ data: Uint8Array.from(bytes), isEvalSupported: false });
  const pdf = await task.promise;
  try {
    const items: Array<{ str: string; x: number; y: number; width: number; height: number; page: number }> = [];
    const pathsPerPage: number[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      for (const item of (await page.getTextContent()).items) if ('str' in item && item.str.trim()) items.push({ str: item.str, x: item.transform[4], y: item.transform[5], width: item.width, height: item.height, page: pageNumber });
      pathsPerPage.push((await page.getOperatorList()).fnArray.filter(fn => fn === OPS.constructPath).length);
    }
    return { items, pages: pdf.numPages, pathsPerPage };
  } finally { await task.destroy(); }
}
const joined = (items: Array<{ str: string }>) => items.map(item => item.str).join(' ').replace(/\s+/g, ' ');
const compact = (text: string) => text.replace(/\s/g, '');
const documentXml = async (docx: Uint8Array) => (await JSZip.loadAsync(docx)).file('word/document.xml')!.async('string');
const headerXml = async (docx: Uint8Array) => {
  const zip = await JSZip.loadAsync(docx);
  const file = Object.keys(zip.files).find(name => /^word\/header\d*\.xml$/.test(name));
  return file ? zip.file(file)!.async('string') : '';
};
const visibleText = (xml: string) => xml.replace(/<w:tab\/>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

// ---------------------------------------------------------------------------
// Labelled skill rows.
// ---------------------------------------------------------------------------

test('skill rows place every source skill exactly once, in order, without renaming it', () => {
  const skills = ['RTUs', 'Split Systems', 'Heat Pumps', 'Diagnostics', 'Preventive Maintenance', 'Refrigerant Work', 'Compressor Service', 'Installation / Changeouts', 'Brazing', 'Gauge Manifold', 'Vacuum Pump', 'Recovery Machine', 'Multimeter', 'Brazing Torch', 'ServiceTitan', 'Customer Service', 'Lockout/tagout (LOTO) procedures', 'Notary public'];
  const rows = skillRows(skills);
  assert.deepEqual(rows.map(row => row.label), ['Systems', 'Service work', 'Tools & equipment', 'Software', 'Safety', 'Professional', 'Other skills'], 'rows follow the fixed label order');
  assert.deepEqual(rows.flatMap(row => row.skills).sort(), [...skills].sort(), 'every skill once, unchanged');
  const row = (label: string) => rows.find(entry => entry.label === label)!.skills;
  assert.deepEqual(row('Systems'), ['RTUs', 'Split Systems', 'Heat Pumps']);
  assert.deepEqual(row('Tools & equipment'), ['Gauge Manifold', 'Vacuum Pump', 'Recovery Machine', 'Multimeter', 'Brazing Torch'], 'a tool wins over its trade word');
  assert.ok(row('Service work').includes('Brazing') && row('Service work').includes('Compressor Service'));
  assert.deepEqual(row('Software'), ['ServiceTitan']);
  assert.deepEqual(row('Professional'), ['Customer Service'], 'customer service is not service work');
  assert.deepEqual(row('Other skills'), ['Notary public'], 'an unknown skill is kept, never dropped');
  // Work on a system reads as service work; a name ending in "systems" is a system.
  assert.equal(skillRows(['Ductwork repair'])[0].label, 'Service work');
  assert.equal(skillRows(['Electrical systems'])[0].label, 'Systems');
  assert.equal(skillRows(['Work order systems'])[0].label, 'Software');
  assert.deepEqual(skillRows([]), []);
  assert.equal(SKILL_ROW_LABELS.length, 7);
});

// ---------------------------------------------------------------------------
// Field Pro.
// ---------------------------------------------------------------------------

test('Field Pro puts credentials on one line before labelled skill lines, in PDF and DOCX', async () => {
  const style = defaultStyle('plain');
  const { items } = await pdfItems(await createResumePdf(sampleResume, false, 'plain', 'plain', style));
  const text = joined(items);
  assert.match(text, /EPA 608 Universal \| OSHA 30 \| NATE Core/);
  const flat = compact(text);
  assert.ok(flat.indexOf('CERTIFICATIONS&LICENSES') < flat.indexOf('CORESKILLS'), 'credentials before skills');
  assert.ok(flat.indexOf('CORESKILLS') < flat.indexOf('WORKEXPERIENCE'));
  assert.ok(flat.includes('Servicework:CommercialRTUservice'), 'labelled skill line');
  for (const skill of sampleResume.skills) assert.ok(flat.includes(compact(skill)), `missing source skill ${skill}`);
  const name = items.find(item => item.str.includes('MARCUS REED'))!;
  assert.ok(Math.abs(name.x + name.width / 2 - 306) < 3, 'centered capital name');
  const employer = items.find(item => item.str.includes('Ridgeway Mechanical'))!;
  assert.doesNotMatch(employer.str, /Italic/);
  const xml = await documentXml(await createResumeDocx(sampleResume, 'plain', 'plain', style));
  const visible = visibleText(xml);
  assert.match(visible, /EPA 608 Universal \| OSHA 30 \| NATE Core/);
  assert.match(visible, /Service work:\s+Commercial RTU service · Chiller & boiler maintenance/);
  assert.ok(visible.indexOf('CERTIFICATIONS & LICENSES') < visible.indexOf('CORE SKILLS'));
  assert.doesNotMatch(xml, /<w:tbl[ >]/);
});

// ---------------------------------------------------------------------------
// Sidebar.
// ---------------------------------------------------------------------------

const style = defaultStyle('sidebar');

test('Sidebar rail holds contact, credentials, education and skill rows; the main column holds the rest', async () => {
  const plan = sidebarPlan(sampleResume, 10.5);
  assert.deepEqual(plan.rail.map(section => section.label), ['CONTACT', 'CERTIFICATIONS', 'EDUCATION', 'SYSTEMS', 'SERVICE WORK', 'SOFTWARE']);
  assert.deepEqual(plan.mainSkills, []);
  const { items, pages } = await pdfItems(await createResumePdf(sampleResume, false, 'sidebar', 'plain', style));
  assert.equal(pages, 1);
  for (const item of items) {
    assert.ok(item.height >= 9.99, `text below 10 pt: ${item.str}`);
    assert.ok(item.y >= 47 && item.y <= 792 - 47, `text outside the vertical margins: ${item.str}`);
    const inRail = item.x < 172;
    if (inRail) assert.ok(item.x >= 19.9 && item.x + item.width <= 152.5, `rail text outside the rail: ${item.str}`);
    else assert.ok(item.x >= 199.9 && item.x + item.width <= 565, `main text outside the column: ${item.str}`);
  }
  const exact = (text: string) => items.find(item => item.str.trim() === text)!;
  assert.equal(Math.round(exact('CONTACT').x), 20, 'rail labels in the rail');
  assert.equal(Math.round(exact('marcus.reed@example.com').x), 20, 'contact in the rail');
  assert.equal(Math.round(items.find(item => item.str.includes('Marcus Reed'))!.x), 200, 'name opens the main column');
  assert.equal(Math.round(exact('Lead HVAC Technician').x), 200, 'experience in the main column');
  // Reading order: name and title, then the rail, then the summary and experience.
  const text = compact(joined(items));
  const order = ['MarcusReed', 'HVACLeadTechnician', 'CONTACT', 'CERTIFICATIONS', 'EDUCATION', 'SERVICEWORK', 'PROFESSIONALSUMMARY', 'WORKEXPERIENCE', 'Mar2021–Present', 'LeadHVACTechnician', 'RidgewayMechanical', 'Jun2017–Feb2021'];
  let previous = -1;
  for (const part of order) {
    const at = text.indexOf(part, previous + 1);
    assert.ok(at > previous, `reading order: ${part}`);
    previous = at;
  }
  for (const skill of sampleResume.skills) assert.ok(text.includes(compact(skill)), `missing source skill ${skill}`);
  assert.doesNotMatch(text, /CORESKILLS/, 'every skill fits the rail, so no main-column skills');
});

test('Sidebar moves skill rows that do not fit the rail into the main column, in both formats', async () => {
  const many = Array.from({ length: 70 }, (_, index) => `Customer skill number ${index + 1}`);
  const crowded: GeneratedResume = { ...sampleResume, skills: [...sampleResume.skills, ...many] };
  const plan = sidebarPlan(crowded, 10.5);
  assert.ok(plan.mainSkills.length > 0, 'overflow rows go to the main column');
  assert.ok(plan.mainSkills.every(row => !plan.rail.some(section => section.label === row.label.toUpperCase())), 'a row is never split');
  const { items } = await pdfItems(await createResumePdf(crowded, false, 'sidebar', 'plain', style));
  const text = compact(joined(items));
  assert.ok(text.includes('CORESKILLS'), 'main-column skills heading');
  for (const skill of crowded.skills) assert.ok(text.includes(compact(skill)), `missing source skill ${skill}`);
  for (const item of items.filter(entry => entry.page === 1 && entry.x < 172)) assert.ok(item.y >= 47, `rail text below the bottom margin: ${item.str}`);
  const visible = visibleText(await documentXml(await createResumeDocx(crowded, 'sidebar', 'plain', style)));
  assert.ok(visible.includes('CORE SKILLS'), 'DOCX makes the same split');
  for (const skill of crowded.skills) assert.ok(visible.includes(skill), `DOCX missing source skill ${skill}`);
});

test('Sidebar draws the rail on every page of a long resume and paginates the main column', async () => {
  const long: GeneratedResume = { ...sampleResume, experience: Array.from({ length: 6 }, (_, index) => ({ ...sampleResume.experience[index % 2], employer: `Employer ${index + 1}` })) };
  const { items, pages, pathsPerPage } = await pdfItems(await createResumePdf(long, false, 'sidebar', 'plain', style));
  assert.ok(pages >= 2, 'continues on a second page');
  assert.ok(pathsPerPage.every(count => count > 0), 'the rail is drawn on every page');
  for (const item of items) assert.ok(item.y >= 47 && item.y <= 792 - 47, `text outside the margins: ${item.str}`);
  for (let index = 1; index <= 6; index++) assert.ok(joined(items).includes(`Employer ${index}`));
  assert.ok(items.filter(item => item.page > 1).every(item => item.x >= 199.9), 'later pages keep the main column clear of the rail');
});

test('Sidebar rail and job rules render in the accent colour', async () => {
  const pdf = await createResumePdf(sampleResume, false, 'sidebar', 'plain', style);
  const task = getDocument({ data: Uint8Array.from(pdf), isEvalSupported: false });
  try {
    const page = await (await task.promise).getPage(1);
    const canvasModule = await import('@napi-rs/canvas');
    const canvas = canvasModule.createCanvas(612, 792), context = canvas.getContext('2d');
    await page.render({ canvas: canvas as never, canvasContext: context as never, viewport: page.getViewport({ scale: 1 }) }).promise;
    const pixel = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data].slice(0, 3);
    for (const [x, y] of [[2, 2], [10, 700], [160, 700], [160, 20], [171, 780]]) assert.deepEqual(pixel(x, y), [32, 61, 96], `Navy rail at ${x},${y}`);
    assert.deepEqual(pixel(173, 400), [255, 255, 255], 'the rail ends at its edge');
  } finally { await task.destroy(); }
});

test('Sidebar DOCX: rail image behind the page, rail text in a page frame, main column by margin, no tables', async () => {
  const docx = await createResumeDocx(sampleResume, 'sidebar', 'plain', style);
  const xml = await documentXml(docx), header = await headerXml(docx);
  assert.doesNotMatch(xml, /<w:tbl[ >]/, 'no tables');
  assert.match(xml, /<w:pgMar [^>]*w:left="4000"/, 'main column starts after the rail');
  assert.match(header, /<wp:anchor [^>]*behindDoc="1"/, 'rail image sits behind the text');
  assert.match(header, /<wp:positionH relativeFrom="page"><wp:posOffset>0<\/wp:posOffset>/);
  assert.match(header, /<wp:positionV relativeFrom="page"><wp:posOffset>0<\/wp:posOffset>/);
  const extent = header.match(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/)!;
  const cx = Number(extent[1]), cy = Number(extent[2]);
  assert.ok(Math.abs(cx - 172 * 12700) < 12700, 'rail is 172 pt wide (to the pixel)');
  assert.equal(cy, 792 * 12700, 'rail is the full page tall');
  const frames: string[] = xml.match(/<w:framePr [^>]*\/>/g) ?? [];
  // Labels: CONTACT, CERTIFICATIONS, EDUCATION, SYSTEMS, SERVICE WORK, SOFTWARE.
  // Items: 3 contact + 3 credentials + 3 education lines + 1 + 7 + 1 skills.
  const railParagraphs = 6 + 3 + 3 + 3 + 1 + 7 + 1;
  assert.equal(frames.length, railParagraphs, 'one framed paragraph per rail label and item');
  assert.equal(new Set(frames).size, 1, 'identical frame settings, so Word draws one frame');
  const frame = frames[0] ?? '';
  assert.match(frame, /w:hAnchor="page"/); assert.match(frame, /w:vAnchor="page"/);
  assert.match(frame, /w:x="400"/); assert.match(frame, /w:y="960"/);
  const visible = visibleText(xml);
  const order = ['Marcus Reed', 'HVAC Lead Technician', 'CONTACT', 'CERTIFICATIONS', 'EDUCATION', 'SERVICE WORK', 'PROFESSIONAL SUMMARY', 'WORK EXPERIENCE', 'Mar 2021 – Present', 'Lead HVAC Technician'];
  let previous = -1;
  for (const part of order) {
    const at = visible.indexOf(part, previous + 1);
    assert.ok(at > previous, `DOCX reading order: ${part}`);
    previous = at;
  }
  assert.ok((xml.match(/<w:left w:val="single" w:color="C5CCD6"/g)?.length ?? 0) > 0, 'job entries carry a left rule');
});

test('Sidebar unpaid preview keeps the rail readable and locked bullets out of the file', async () => {
  const preview = joined((await pdfItems(await createResumePdf(sampleResume, true, 'sidebar', 'plain', style))).items);
  assert.ok(preview.includes(sampleResume.experience[0].bullets[0]), 'first bullets stay readable');
  assert.equal(preview.includes(sampleResume.experience[1].bullets[2]), false, 'locked bullet text is absent');
  for (const credential of sampleResume.certifications) assert.ok(preview.includes(credential.name));
  assert.match(preview, /PREVIEW — PAY \$9\.99 TO REMOVE WATERMARK/);
});

test('a Sidebar cover letter uses a top bar instead of the rail', async () => {
  const letter = { basics: sampleResume.basics, date: 'October 3, 2026', companyName: 'Example Mechanical', targetJobTitle: 'HVAC Lead Technician', salutation: 'Dear Hiring Manager,', paragraphs: ['I am applying for the HVAC Lead Technician position.', 'I lead a two-person service crew.'], closing: 'Sincerely,' };
  const { items } = await pdfItems(await createCoverLetterPdf(letter as never, 'sidebar', false, style));
  assert.match(joined(items), /two-person service crew/);
  for (const item of items) assert.ok(item.x >= 47, `letter text is not pushed into a rail: ${item.str}`);
  const docx = await createCoverLetterDocx(letter as never, 'sidebar', style);
  const xml = await documentXml(docx);
  assert.doesNotMatch(xml, /<w:framePr|<w:tbl[ >]/);
  assert.match(xml, /<w:top w:val="single" w:color="203D60" w:sz="48"/, 'top bar');
  assert.equal(await headerXml(docx), '', 'no rail image');
});

test('the rail image is a valid one-pixel PNG of the accent colour', () => {
  const png = solidPng('203D60');
  assert.deepEqual([...png.slice(0, 8)], [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const view = new DataView(png.buffer, png.byteOffset);
  assert.equal(String.fromCharCode(...png.slice(12, 16)), 'IHDR');
  assert.equal(view.getUint32(16), 1); assert.equal(view.getUint32(20), 1);
  const idatAt = 8 + 12 + 13;
  const length = view.getUint32(idatAt);
  assert.equal(String.fromCharCode(...png.slice(idatAt + 4, idatAt + 8)), 'IDAT');
  assert.deepEqual([...inflateSync(png.slice(idatAt + 8, idatAt + 8 + length))], [0, 0x20, 0x3D, 0x60]);
});
