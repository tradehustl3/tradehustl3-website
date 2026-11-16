import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import JSZip from 'jszip';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createResumeDocx, createResumePdf, type GeneratedResume } from '../worker/resume-documents';
import { createCoverLetterDocx, createCoverLetterPdf } from '../worker/cover-letter-documents';
import { timelineGutter } from '../worker/resume-layout-v2';
import {
  CAREER_TRACKS, PICKER_TEMPLATES, RESUME_TEMPLATES, TEMPLATE_KEYS, TEMPLATE_LABELS, TRACK_LABELS,
  defaultStyle, firstBuildTrack, isCareerTrack, pickerTemplatesFor, trackForTemplate, validStylePatch,
} from '../worker/resume-templates';
import { CAROUSEL_SETTLE_MS, carouselStep, shownLook, swipeDirection } from '../app/resume-builder/review/style-carousel-logic';
import { sampleResume } from '../docs/pr186/sample-resume';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

async function pdfItems(bytes: Uint8Array) {
  const task = getDocument({ data: Uint8Array.from(bytes), isEvalSupported: false });
  const pdf = await task.promise;
  try {
    const items: Array<{ str: string; x: number; y: number; width: number; height: number; page: number }> = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const content = await (await pdf.getPage(pageNumber)).getTextContent();
      for (const item of content.items) if ('str' in item && item.str.trim()) items.push({ str: item.str, x: item.transform[4], y: item.transform[5], width: item.width, height: item.height, page: pageNumber });
    }
    return { items, pages: pdf.numPages };
  } finally { await task.destroy(); }
}
const joined = (items: Array<{ str: string }>) => items.map(item => item.str).join(' ').replace(/\s+/g, ' ');
const compact = (text: string) => text.replace(/\s/g, '');
const documentXml = async (docx: Uint8Array) => (await JSZip.loadAsync(docx)).file('word/document.xml')!.async('string');
const style = defaultStyle('technical');

// ---------------------------------------------------------------------------
// Template registry: what the carousel offers, and what stays valid in storage.
// ---------------------------------------------------------------------------

test('the carousel offers four looks; retired looks stay valid stored keys', () => {
  assert.deepEqual([...PICKER_TEMPLATES], ['plain', 'blueprint', 'premier', 'technical']);
  for (const key of PICKER_TEMPLATES) assert.ok((TEMPLATE_KEYS as readonly string[]).includes(key));
  // Existing resumes saved with a retired look must keep loading and re-rendering.
  for (const retired of ['navy', 'lead'] as const) {
    assert.ok((TEMPLATE_KEYS as readonly string[]).includes(retired));
    assert.ok(validStylePatch({ theme: retired }));
    assert.equal((PICKER_TEMPLATES as readonly string[]).includes(retired), false);
    assert.deepEqual(pickerTemplatesFor(retired), ['plain', 'blueprint', 'premier', 'technical', retired], 'a resume on a retired look still sees its own look');
  }
  for (const key of PICKER_TEMPLATES) assert.deepEqual(pickerTemplatesFor(key), [...PICKER_TEMPLATES]);
  for (const key of TEMPLATE_KEYS) {
    assert.ok(TEMPLATE_LABELS[key].label.length > 0 && TEMPLATE_LABELS[key].tagline.length > 0, key);
  }
  assert.equal(new Set(PICKER_TEMPLATES.map(key => TEMPLATE_LABELS[key].label)).size, PICKER_TEMPLATES.length, 'no two offered looks share a name');
  // The stored `premier` key is unchanged; only its customer-facing name is.
  assert.equal(TEMPLATE_LABELS.premier.label, 'Executive');
  for (const track of CAREER_TRACKS) assert.ok(TRACK_LABELS[track].label.length > 0 && TRACK_LABELS[track].note.length > 0);
});

test('offered looks differ in structure, not only in colour', () => {
  const structure = (key: typeof PICKER_TEMPLATES[number]) => {
    const { header, headings, skills, sections } = RESUME_TEMPLATES[key];
    return JSON.stringify({ header, headings, skills, sections });
  };
  const headers = new Set(PICKER_TEMPLATES.map(key => RESUME_TEMPLATES[key].header));
  const headings = new Set(PICKER_TEMPLATES.map(key => RESUME_TEMPLATES[key].headings));
  assert.equal(headers.size, PICKER_TEMPLATES.length, 'every offered look has its own header architecture');
  assert.equal(headings.size, PICKER_TEMPLATES.length, 'every offered look has its own heading treatment');
  assert.equal(new Set(PICKER_TEMPLATES.map(structure)).size, PICKER_TEMPLATES.length);
});

test('Technical is a design-only look', () => {
  assert.equal(isCareerTrack('technical'), false);
  assert.ok(validStylePatch({ theme: 'technical' }));
  assert.equal(trackForTemplate('technical', 'lead'), 'lead');
  assert.equal(trackForTemplate('technical', null), 'plain');
});

test('a first build honours the chosen writing focus; without one the old rules apply', () => {
  // The look no longer decides the wording when a focus was chosen.
  assert.equal(firstBuildTrack('lead', 'plain', null), 'lead');
  assert.equal(firstBuildTrack('navy', 'technical', 'lead'), 'navy');
  assert.equal(firstBuildTrack('plain', 'lead', 'lead'), 'plain');
  // Older clients send nothing: unchanged behaviour.
  for (const requested of [undefined, null, '', 'technical', 'executive', 3]) {
    assert.equal(firstBuildTrack(requested, 'lead', null), 'lead');
    assert.equal(firstBuildTrack(requested, 'premier', 'navy'), 'navy');
    assert.equal(firstBuildTrack(requested, 'technical', null), 'plain');
  }
  const base = read('worker/resume-builder-base.ts');
  assert.match(base, /resume\.generated_json \? resumeTrack\(resume\) : firstBuildTrack\(requestedFirstTrack, resume\.theme, resume\.generation_track\)/, 'only a first build reads the requested focus');
  assert.match(base, /requestedFirstTrack !== undefined && !isCareerTrack\(requestedFirstTrack\)/, 'an invalid focus is rejected');
});

// ---------------------------------------------------------------------------
// Technical look: PDF and DOCX structure.
// ---------------------------------------------------------------------------

test('Technical sets dates in a left timeline column in the PDF', async () => {
  const gutter = timelineGutter(sampleResume, 10.5);
  assert.ok(gutter > 60 && gutter <= 150, `timeline column width ${gutter}`);
  const { items, pages } = await pdfItems(await createResumePdf(sampleResume, false, 'technical', 'plain', style));
  assert.equal(pages, 1);
  for (const item of items) {
    assert.ok(item.height >= 9.99, `text below 10 pt: ${item.str}`);
    assert.ok(item.x >= 47 && item.x + item.width <= 565, `clipped text: ${item.str}`);
    assert.ok(item.y >= 47, 'text below bottom margin');
  }
  const exact = (text: string) => items.find(item => item.str.trim() === text)!;
  for (const [date, title] of [['Mar 2021 – Present', 'Lead HVAC Technician'], ['Jun 2017 – Feb 2021', 'HVAC Service Technician'], ['2017', 'HVAC Technology Diploma — Atlanta Technical College — Atlanta, GA']] as const) {
    const dateItem = exact(date), titleItem = exact(title);
    assert.ok(dateItem && titleItem, `${date} and ${title} drawn as their own text`);
    assert.equal(Math.round(dateItem.x), 48, `${date} starts at the left margin`);
    assert.equal(Math.round(titleItem.x), 48 + gutter, `${title} starts at the timeline indent`);
    assert.ok(Math.abs(dateItem.y - titleItem.y) < 0.5, `${date} shares a line with ${title}`);
    assert.ok(dateItem.x + dateItem.width < titleItem.x, 'the date never runs into the text beside it');
  }
  const bullet = items.find(item => item.str.startsWith('Lead a two-person crew'))!;
  assert.ok(bullet.x > 48 + gutter, 'bullets sit inside the timeline indent');
  const text = compact(joined(items));
  let previous = -1;
  for (const heading of ['PROFESSIONALSUMMARY', 'CORESKILLS', 'CERTIFICATIONS&LICENSES', 'WORKEXPERIENCE', 'EDUCATION&TRAINING']) {
    const at = text.indexOf(heading);
    assert.ok(at > previous, `section order: ${heading}`);
    previous = at;
  }
  // Each date is still read next to its own job, in order.
  assert.ok(text.indexOf('Mar2021–Present') < text.indexOf('RidgewayMechanical'));
  assert.ok(text.indexOf('RidgewayMechanical') < text.indexOf('Jun2017–Feb2021'));
  assert.ok(text.indexOf('Jun2017–Feb2021') < text.indexOf('BrightlineComfortServices'));
});

test('Technical lists skills as labelled rows of source skills only', async () => {
  const { items } = await pdfItems(await createResumePdf(sampleResume, false, 'technical', 'plain', style));
  const text = compact(joined(items));
  assert.ok(text.includes('Systems&equipment:') && text.includes('Tools&methods:'), 'labelled skill rows');
  for (const skill of sampleResume.skills) assert.ok(text.includes(compact(skill)), `missing source skill ${skill}`);
  for (const credential of sampleResume.certifications) assert.ok(text.includes(compact(credential.name)));
  // A skill the grouping rules do not recognise is never forced into a category.
  const ungrouped: GeneratedResume = { ...sampleResume, skills: [...sampleResume.skills, 'Forklift'] };
  const plainGrid = compact(joined((await pdfItems(await createResumePdf(ungrouped, false, 'technical', 'plain', style))).items));
  assert.doesNotMatch(plainGrid, /Systems&equipment:|Tools&methods:/, 'no invented categories');
  for (const skill of ungrouped.skills) assert.ok(plainGrid.includes(compact(skill)), `missing source skill ${skill}`);
});

test('Technical draws solid heading bands and a heavy header rule', async () => {
  const pdf = await createResumePdf(sampleResume, false, 'technical', 'plain', style);
  const { items } = await pdfItems(pdf);
  const heading = items.find(item => item.str.replace(/\s/g, '') === 'PROFESSIONALSUMMARY')!;
  assert.ok(heading, 'heading drawn');
  const task = getDocument({ data: Uint8Array.from(pdf), isEvalSupported: false });
  try {
    const page = await (await task.promise).getPage(1);
    const canvasModule = await import('@napi-rs/canvas');
    const canvas = canvasModule.createCanvas(612, 792), context = canvas.getContext('2d');
    await page.render({ canvas: canvas as never, canvasContext: context as never, viewport: page.getViewport({ scale: 1 }) }).promise;
    const pixel = (x: number, y: number) => [...context.getImageData(Math.round(x), Math.round(y), 1, 1).data].slice(0, 3);
    // Charcoal band just left of the heading text and near the right margin.
    assert.deepEqual(pixel(heading.x - 6, 792 - heading.y - 4), [68, 68, 68], 'band behind the heading');
    assert.deepEqual(pixel(560, 792 - heading.y - 4), [68, 68, 68], 'band runs the full text width');
    assert.deepEqual(pixel(2, 2), [255, 255, 255], 'page corner stays white');
  } finally { await task.destroy(); }
});

test('Technical DOCX matches the PDF structure without tables', async () => {
  const twips = timelineGutter(sampleResume, 10.5) * 20;
  const xml = await documentXml(await createResumeDocx(sampleResume, 'technical', 'plain', style));
  assert.doesNotMatch(xml, /<w:tbl[ >]/, 'no tables in DOCX');
  for (const match of xml.matchAll(/<w:sz w:val="(\d+)"/g)) assert.ok(Number(match[1]) >= 20, 'DOCX text below 10 pt');
  // Two jobs and one school: each date hangs in the left column with a tab to the indent.
  assert.equal(xml.match(new RegExp(`<w:ind w:left="${twips}" w:hanging="${twips}"/>`, 'g'))?.length, 3, 'hanging date paragraphs');
  assert.equal(xml.match(new RegExp(`<w:tab w:val="left" w:pos="${twips}"/>`, 'g'))?.length, 3, 'tab stop at the indent');
  assert.equal(xml.match(new RegExp(`<w:ind w:left="${twips + 280}" w:hanging="240"/>`, 'g'))?.length, 7, 'bullets indented beside the timeline');
  assert.doesNotMatch(xml, /<w:tab w:val="right"/, 'no right-aligned dates when the timeline is used');
  assert.match(xml, /<w:shd [^>]*w:fill="444444"/, 'solid heading bands');
  assert.match(xml, /<w:color w:val="FFFFFF"\/>/, 'white heading text');
  const visible = xml.replace(/<w:tab\/>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  assert.match(visible, /Mar 2021 – Present\s+Lead HVAC Technician/, 'date reads before its job title');
  assert.match(visible, /Systems & equipment:\s+Commercial RTU service/);
  for (const skill of sampleResume.skills) assert.ok(visible.includes(skill), `missing source skill ${skill}`);
  let previous = -1;
  for (const heading of ['PROFESSIONAL SUMMARY', 'CORE SKILLS', 'CERTIFICATIONS & LICENSES', 'WORK EXPERIENCE', 'EDUCATION & TRAINING']) {
    const at = visible.indexOf(heading);
    assert.ok(at > previous, `DOCX section order: ${heading}`);
    previous = at;
  }
});

test('a date too long for the timeline column falls back to right-aligned dates in both formats', async () => {
  const longDates: GeneratedResume = {
    ...sampleResume,
    experience: sampleResume.experience.map((job, index) => index === 0 ? { ...job, startDate: 'September 2019', endDate: 'December 2023' } : job),
  };
  assert.equal(timelineGutter(longDates, 10.5), 0);
  const { items } = await pdfItems(await createResumePdf(longDates, false, 'technical', 'plain', style));
  const date = items.find(item => item.str.trim() === 'September 2019 – December 2023')!;
  const title = items.find(item => item.str.trim() === 'Lead HVAC Technician')!;
  assert.ok(date && title);
  assert.equal(Math.round(title.x), 48, 'job title back at the left margin');
  assert.ok(Math.abs(date.x + date.width - 564) < 1.5, 'date right-aligned to the margin');
  for (const item of items) assert.ok(item.x >= 47 && item.x + item.width <= 565, `clipped text: ${item.str}`);
  const xml = await documentXml(await createResumeDocx(longDates, 'technical', 'plain', style));
  assert.doesNotMatch(xml, /w:hanging="(?!240")\d+"/, 'no hanging date column');
  assert.match(xml, /<w:tab w:val="right"/, 'right tab for dates');
  assert.equal(timelineGutter({ ...sampleResume, experience: [], education: [] }, 10.5), 0, 'no dates, no column');
});

test('Technical paginates long resumes inside the margins and keeps locked preview lines out of the file', async () => {
  const long: GeneratedResume = { ...sampleResume, experience: Array.from({ length: 6 }, (_, index) => ({ ...sampleResume.experience[index % 2], employer: `Employer ${index + 1}` })) };
  const { items, pages } = await pdfItems(await createResumePdf(long, false, 'technical', 'plain', style));
  assert.ok(pages >= 2, 'long resume continues on a second page');
  for (const item of items) {
    assert.ok(item.x >= 47 && item.x + item.width <= 565, `clipped text: ${item.str}`);
    assert.ok(item.y >= 47 && item.y <= 792 - 47, 'text inside the top and bottom margins');
  }
  for (let index = 1; index <= 6; index++) assert.ok(joined(items).includes(`Employer ${index}`));
  // Unpaid preview: locked wording is never written into the PDF.
  const preview = joined((await pdfItems(await createResumePdf(sampleResume, true, 'technical', 'plain', style))).items);
  assert.ok(preview.includes(sampleResume.experience[0].bullets[0]), 'first bullets stay readable');
  assert.equal(preview.includes(sampleResume.experience[1].bullets[2]), false, 'locked bullet text is absent');
  assert.match(preview, /Lead HVAC Technician/);
  assert.match(preview, /Mar 2021 – Present/);
});

test('Technical keeps the writing focus headings and renders a matching cover letter', async () => {
  const lead = compact(joined((await pdfItems(await createResumePdf(sampleResume, false, 'technical', 'lead', style))).items));
  assert.ok(lead.includes('LEADERSHIPPROFILE') && lead.includes('PROFESSIONALEXPERIENCE'));
  assert.doesNotMatch(lead, /Scope:/, 'presentation never adds scope lines');
  // Legacy callers with no v2 style still get the v2 layout for this look.
  assert.ok(compact(joined((await pdfItems(await createResumePdf(sampleResume, false, 'technical'))).items)).includes('MarcusReed'));
  const letter = { basics: sampleResume.basics, date: 'October 3, 2026', companyName: 'Example Mechanical', targetJobTitle: 'HVAC Lead Technician', salutation: 'Dear Hiring Manager,', paragraphs: ['I am applying for the HVAC Lead Technician position.', 'I lead a two-person service crew.'], closing: 'Sincerely,' };
  for (const letterStyle of [style, undefined]) {
    const text = joined((await pdfItems(await createCoverLetterPdf(letter as never, 'technical', false, letterStyle))).items);
    assert.match(text, /Dear Hiring Manager/); assert.match(text, /two-person service crew/);
    const xml = await documentXml(await createCoverLetterDocx(letter as never, 'technical', letterStyle));
    assert.match(xml, /two-person service crew/); assert.doesNotMatch(xml, /<w:tbl[ >]/);
  }
});

// ---------------------------------------------------------------------------
// Carousel behaviour.
// ---------------------------------------------------------------------------

test('carousel steps one slide at a time and stops at both ends', () => {
  assert.equal(carouselStep(0, 1, 4), 1);
  assert.equal(carouselStep(3, 1, 4), 3, 'no wrap past the last look');
  assert.equal(carouselStep(0, -1, 4), 0, 'no wrap before the first look');
  assert.equal(carouselStep(2, -5, 4), 1, 'one slide per gesture');
  assert.equal(carouselStep(2, 0, 4), 2);
  assert.equal(carouselStep(9, 1, 4), 1, 'an out-of-range index restarts from the first look');
  assert.equal(carouselStep(0, 1, 0), 0);
});

test('only a clear sideways swipe changes the look', () => {
  assert.equal(swipeDirection(-80, 5), 1, 'swipe left shows the next look');
  assert.equal(swipeDirection(80, -5), -1, 'swipe right shows the previous look');
  assert.equal(swipeDirection(-20, 0), 0, 'too short');
  assert.equal(swipeDirection(-60, 90), 0, 'a vertical scroll is not a swipe');
  assert.equal(swipeDirection(-60, 60), 0, 'a diagonal drag is not a swipe');
  assert.equal(swipeDirection(Number.NaN, 0), 0);
  assert.ok(CAROUSEL_SETTLE_MS >= 300 && CAROUSEL_SETTLE_MS <= 800);
});

test('the carousel shows the swiped-to look until it is saved, then the saved look', () => {
  const looks = ['plain', 'blueprint', 'premier', 'technical'] as const;
  assert.equal(shownLook(null, 'plain', looks), 'plain');
  assert.equal(shownLook('technical', 'plain', looks), 'technical', 'shown at once, before the save finishes');
  assert.equal(shownLook('technical', 'technical', looks), 'technical');
  assert.equal(shownLook('lead' as never, 'plain', looks), 'plain', 'a look that is not offered is never shown');
});

test('the review page uses the carousel instead of the option cards, in both places', () => {
  const review = read('app/resume-builder/review/resume-review.tsx');
  assert.match(review, /import \{ StyleCarousel \} from "\.\/style-carousel"/);
  assert.equal(review.match(/renderStyleCarousel\(/g)?.length, 3, 'defined once; used before the first build and around the live preview');
  assert.match(review, /<StyleCarousel looks=\{pickerTemplatesFor\(resume\.theme\)\} current=\{resume\.theme\}/);
  assert.doesNotMatch(review, /rb-theme-picker|THEME_OPTIONS|renderThemePicker/, 'the card picker is gone');
  // The look and the wording are separate: picking a look never starts a rewrite.
  const choose = review.slice(review.indexOf('async function chooseStyle'), review.indexOf('function renderStyleCarousel'));
  assert.doesNotMatch(choose, /runGeneration|setPendingTrack|generationTrack/);
  assert.match(review, /role="radiogroup" aria-label="Writing focus"/);
  assert.match(review, /firstBuildFocus \? \{ writingTrack: firstBuildFocus \} : \{\}/, 'the first build sends the chosen focus');
  assert.match(review, /<details className="rb-adjust">/, 'font, size and colour sit behind one control');

  const carousel = read('app/resume-builder/review/style-carousel.tsx');
  assert.match(carousel, /aria-roledescription="carousel"/);
  assert.match(carousel, /aria-label="Previous style"/);
  assert.match(carousel, /aria-label="Next style"/);
  assert.match(carousel, /aria-current=\{look === shown \? "true" : undefined\}/);
  assert.match(carousel, /onTouchStart=\{onTouchStart\} onTouchEnd=\{onTouchEnd\}/);
  assert.match(carousel, /src=\{`\/resume-templates\/\$\{shown\}\.png`\}/);
  // Every look that can appear in the carousel has a sample image to show.
  for (const key of TEMPLATE_KEYS) assert.ok(readFileSync(new URL(`../public/resume-templates/${key}.png`, import.meta.url)).byteLength > 1000, `${key}.png`);

  const css = read('app/resume-builder/resume-builder.css');
  assert.match(css, /\.rb-carousel-arrow \{[^}]*width: 48px; height: 48px/, 'arrow touch target');
  assert.match(css, /\.rb-carousel-dot \{[^}]*width: 32px; height: 44px/, 'dot touch target');
  assert.match(css, /\.rb-focus-option \{[^}]*min-height: 44px/);
  assert.match(css, /\.rb-carousel-stage \{[^}]*touch-action: pan-y/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.rb-carousel-sample-next, \.rb-carousel-sample-prev \{ animation: none; \}/);
  assert.doesNotMatch(css, /\.rb-theme-picker|\.rb-theme-preview|\.rb-blueprint/);
});
