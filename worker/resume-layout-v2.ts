import { subsetTrueType } from './resume-font-subset';
import { AlignmentType, BorderStyle, Document, FrameAnchorType, FrameWrap, Header, HeightRule, HorizontalPositionRelativeFrom, ImageRun, LeaderType, Packer, Paragraph, ShadingType, TextRun, TabStopType, TextWrappingType, VerticalPositionRelativeFrom, LevelFormat } from 'docx';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, degrees, beginText, endText, setCharacterSpacing, type PDFFont, type PDFPage } from 'pdf-lib';
import type { GeneratedResume } from './resume-documents';
import type { GeneratedCoverLetter } from './cover-letter-documents';
import { decodeFont } from './roboto-fonts';
import { RESUME_WATERMARK_LOGO_BASE64 } from './resume-watermark-logo';
import { TEMPLATE_FONTS } from './resume-template-fonts';
import { ACCENT_HEX, BODY_SIZES, FONT_FAMILIES, RESUME_TEMPLATES, SPACE_FACTORS, TRACK_HEADINGS, skillGroups, skillRows, type CareerTrack, type ResumeStyle, type TemplateKey } from './resume-templates';
import { drawLockedLine, letterParagraphLocked, resumePreviewLock, type ResumePreviewLock } from './resume-preview-lock';
import { presentableSkills } from './resume-skill-casing';

const WIDTH = 612, HEIGHT = 792, MARGIN = 48;
const clean = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const color = (hex: string) => rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);
const contact = (b: GeneratedResume['basics']) => [b.location, b.phone, b.email].map(clean).filter(Boolean).join(' | ');
/** Secondary text (Premier contact line, employer line, dates). 7.4:1 on white. */
const MUTED_HEX = '555555';
/** Accent mixed toward white; shared by the Lead band and Blueprint heading bands. */
const tintOf = (hex: string, white = 0.93, share = 0.07) => [0, 2, 4].map(offset => Math.round(255 * white + parseInt(hex.slice(offset, offset + 2), 16) * share).toString(16).padStart(2, '0')).join('').toUpperCase();
/** Technical heading bands reach this far past the text margin. */
const PANEL_PAD = 10;
/** Blueprint's header panel and credential strip reach this far past the text margin (Word's border-space limit is 31 pt). */
const BLUEPRINT_PAD = 30;
/** Blueprint's header panel padding above and below its text. The panel starts at the top margin, as Word draws it. */
const PANEL_INNER = 16;
/** Executive: width of the left column that holds the section labels. */
const LABEL_COLUMN = 128;
/** Executive label letter spacing, in points; kept low so ATS parsers read whole words. */
const LABEL_TRACKING = 0.6;
/** Sidebar: space between rail sections. */
const RAIL_SECTION_GAP = 14;
/** Executive section labels: standard names an ATS recognises, for every writing track. */
const SIDE_LABELS: Record<string, string> = { summary: 'SUMMARY', skills: 'SKILLS', certifications: 'CERTIFICATIONS', experience: 'EXPERIENCE', education: 'EDUCATION', additional: 'ADDITIONAL' };
/** Executive section separator. */
const RULE_HEX = 'BDBDBD';
/** Sidebar: rail width, the rail's inner padding, and where the main column starts. */
const RAIL_WIDTH = 172, RAIL_PAD = 20, MAIN_X = RAIL_WIDTH + 28;
/** Sidebar: rail section rules and labels, mixed from the accent toward white. */
const railTint = (hex: string) => tintOf(hex, 0.62, 0.38);
/** Sidebar: job entries carry a thin rule at their left edge. */
const JOB_RULE_HEX = 'C5CCD6';
/**
 * Sidebar rail content. Contact, credentials and education always sit in the rail;
 * skill rows follow while they fit on the first page, and the rest move to the main
 * column. Heights are estimated from character counts, so the PDF and the DOCX
 * always split the same way.
 */
export function sidebarPlan(resume: GeneratedResume, bodyPt: number): { rail: Array<{ label: string; items: string[]; bold?: boolean }>; mainSkills: ReturnType<typeof skillRows> } {
  const rail: Array<{ label: string; items: string[]; bold?: boolean }> = [];
  const items = contactItems(resume.basics);
  if (items.length) rail.push({ label: 'CONTACT', items });
  const credentials = resume.certifications.map(credentialText).filter(Boolean);
  if (credentials.length) rail.push({ label: 'CERTIFICATIONS', items: credentials, bold: true });
  const education = resume.education.flatMap(ed => [clean(ed.credential), [ed.institution, ed.location].map(clean).filter(Boolean).join(', '), clean(ed.year)].filter(Boolean));
  if (education.length) rail.push({ label: 'EDUCATION', items: education });
  const perLine = Math.max(8, Math.floor((RAIL_WIDTH - 2 * RAIL_PAD) / (bodyPt * 0.56)));
  const sectionHeight = (section: { items: string[] }) => bodyPt * 1.3 + 4 + section.items.reduce((sum, item) => sum + Math.max(1, Math.ceil(clean(item).length / perLine)), 0) * bodyPt * 1.35 + 16;
  let used = rail.reduce((sum, section) => sum + sectionHeight(section), 0);
  const rows = skillRows(presentableSkills(resume.skills));
  const mainSkills: ReturnType<typeof skillRows> = [];
  for (const row of rows) {
    const section = { label: row.label.toUpperCase(), items: row.skills.map(clean) };
    if (!mainSkills.length && used + sectionHeight(section) <= HEIGHT - 2 * MARGIN) { rail.push(section); used += sectionHeight(section); }
    else mainSkills.push(row);
  }
  return { rail, mainSkills };
}
/** A 1×1 PNG of one colour: the DOCX rail is this image stretched behind the page. */
export function solidPng(hex: string): Uint8Array {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (bytes: number[]) => { let c = 0xFFFFFFFF; for (const b of bytes) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const chunk = (type: string, data: number[]) => { const body = [...type].map(ch => ch.charCodeAt(0)).concat(data); return [...u32(data.length), ...body, ...u32(crc(body))]; };
  const raw = [0, ...[0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16))];
  let a = 1, b = 0; for (const byte of raw) { a = (a + byte) % 65521; b = (b + a) % 65521; }
  // zlib stream with one stored (uncompressed) deflate block.
  const zlib = [0x78, 0x01, 0x01, raw.length & 255, raw.length >>> 8, ~raw.length & 255, (~raw.length >>> 8) & 255, ...raw, ...u32(((b << 16) | a) >>> 0)];
  return Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...chunk('IHDR', [...u32(1), ...u32(1), 8, 2, 0, 0, 0]), ...chunk('IDAT', zlib), ...chunk('IEND', [])]);
}
/**
 * Contact at the right of the name (Blueprint, Executive) when both fit on one line;
 * otherwise the contact stays one line under the title. Estimated from character
 * counts, so the PDF and the DOCX always make the same choice.
 */
export function contactBesideName(name: string, title: string, items: readonly string[], bodyPt: number): boolean {
  if (!items.length) return false;
  const left = Math.max(clean(name).length * 24 * 0.6, clean(title).length * 12 * 0.62);
  const right = Math.max(...items.map(item => clean(item).length)) * bodyPt * 0.56;
  return left + right + 28 <= WIDTH - MARGIN * 2;
}
const contactItems = (b: { location?: string; phone?: string; email?: string }) => [b.location, b.phone, b.email].map(clean).filter(Boolean);
/** Header rows when the contact sits at the right: [left text, right text]. */
function splitHeaderRows(name: string, title: string, items: readonly string[]): Array<[string, string]> {
  const left = [name, clean(title)].filter(Boolean);
  return Array.from({ length: Math.max(left.length, items.length) }, (_, row) => [left[row] ?? '', items[row] ?? ''] as [string, string]);
}
/** Average character width as a share of the font size (the DOCX column-wrap estimate). */
const SKILL_CHAR_EM = 0.58;
/** Longest skill, in characters, that fits on one line of a `count`-column skills grid. */
export function skillCharsPerColumn(count: number, bodyPt: number): number {
  return Math.max(16, Math.floor((WIDTH - MARGIN * 2) / count / (bodyPt * SKILL_CHAR_EM)));
}
/**
 * Most columns (at most `preferred`) in which every skill fits on one line. A skill
 * that wraps inside a tab column interleaves with its neighbours when an ATS reads
 * the row ("Variable frequency drive Brazing diagnostics"), so a long skill costs a
 * column instead of being split. One column always works: each skill is its own line.
 * PDF and DOCX both call this, so they always choose the same layout.
 */
export function skillColumnsThatFit(skills: readonly string[], preferred: number, bodyPt: number): number {
  const longest = Math.max(0, ...skills.map(skill => clean(skill).length));
  for (let count = preferred; count > 1; count--) if (longest <= skillCharsPerColumn(count, bodyPt)) return count;
  return 1;
}
/** Clear space under a solid heading band, so the first line does not touch it. */
const BAND_GAP = 3;
/** Space above and below an Executive section rule, at standard spacing. */
const RULE_GAP = 9;
/** Blueprint heading marker: a square this many points wide, then this gap. */
const MARKER_SIZE = 7, MARKER_GAP = 6;
/** Average date-character width as a share of the font size (the timeline estimate). */
const TIMELINE_CHAR_EM = 0.56;
/** Widest left date column the Technical look allows before dates return to the right margin. */
const TIMELINE_MAX = 150;
/**
 * Technical look: width in points of the left date column, or 0 when there are no
 * dates or one is too long to sit in a column. Estimated from character counts, not
 * font metrics, so the PDF and the DOCX always make the same choice.
 */
export function timelineGutter(resume: GeneratedResume, bodyPt: number): number {
  const dates = [
    ...resume.experience.map(job => [job.startDate, job.endDate].map(clean).filter(Boolean).join(' – ')),
    ...resume.education.map(ed => clean(ed.year)),
  ];
  const longest = Math.max(0, ...dates.map(date => date.length));
  if (!longest) return 0;
  const width = Math.ceil(longest * bodyPt * TIMELINE_CHAR_EM) + 12;
  return width <= TIMELINE_MAX ? width : 0;
}
/**
 * `indent` moves a block right by that many points; `gutter` is text (a date) set in
 * that indent on the block's first line; `lead` is a bold label that starts the line.
 */
type Block = { kind: 'heading' | 'text' | 'grid' | 'job' | 'education'; text?: string; bold?: boolean; italic?: boolean; accent?: boolean; muted?: boolean; right?: string; columns?: string[][]; labels?: string[]; bullet?: boolean; keepNext?: boolean; locked?: boolean; indent?: number; gutter?: string; lead?: string;
  /** Heading only: which section it opens. */
  section?: string;
  /** The gutter text is a section label (Executive), not a date. */
  gutterLabel?: boolean;
  /** A thin rule above this block separates it from the previous section (Executive). */
  ruleAbove?: boolean;
  /** A thin rule runs down the block's left edge (Sidebar job entries). */
  leftRule?: boolean };
/**
 * Executive: each section's heading moves into the left column beside the section's
 * first line, the whole section is indented to the column, and a thin rule separates
 * sections. Labels are standard ATS section names.
 */
function sideLabelled(blocks: Block[]): Block[] {
  const result: Block[] = [];
  let label: string | null = null, first = true;
  for (const block of blocks) {
    if (block.kind === 'heading') { label = SIDE_LABELS[block.section ?? ''] ?? clean(block.text); continue; }
    const opening = label !== null;
    result.push({ ...block, indent: LABEL_COLUMN, ...(opening ? { gutter: label!, gutterLabel: true, ruleAbove: !first, keepNext: true } : {}) });
    if (opening) { label = null; first = false; }
  }
  return result;
}
// `lock` is only passed for the unpaid watermarked PDF; DOCX and paid files never lock.
function blocksForResume(resume: GeneratedResume, theme: TemplateKey, track: CareerTrack, bodyPt: number, lock?: ResumePreviewLock): Block[] {
  const blocks: Block[] = [], headings = TRACK_HEADINGS[track];
  const heading = (text: string, section: string) => blocks.push({ kind: 'heading', text, section, keepNext: true });
  const executive = theme === 'premier';
  // Technical only: dates sit in a left column and the job text is indented beside them.
  const timeline = theme === 'technical' ? timelineGutter(resume, bodyPt) : 0;
  const dated = (date: string): Pick<Block, 'right' | 'gutter' | 'indent'> => timeline ? { gutter: date, indent: timeline } : { right: date };
  const beside: Pick<Block, 'indent'> = timeline ? { indent: timeline } : {};
  for (const section of RESUME_TEMPLATES[theme].sections) {
    switch (section) {
      case 'summary': if (clean(resume.summary)) { heading(headings.summary, 'summary'); blocks.push({ kind: 'text', text: resume.summary }); } break;
      case 'skills': {
        const skills = presentableSkills(resume.skills);
        if (!skills.length) break;
        if (RESUME_TEMPLATES[theme].skills === 'rail') {
          // Sidebar: only the skill rows that did not fit the rail appear here.
          const overflow = sidebarPlan(resume, bodyPt).mainSkills;
          if (!overflow.length) break;
          heading(headings.skills, 'skills');
          for (const row of overflow) blocks.push({ kind: 'text', lead: row.label, text: row.skills.map(clean).join(' · ') });
          break;
        }
        heading(headings.skills, 'skills');
        if (RESUME_TEMPLATES[theme].skills === 'inline') {
          // One flowing line of source skills: no columns for an ATS to interleave.
          blocks.push({ kind: 'text', text: skills.map(clean).join(' · ') });
          break;
        }
        if (RESUME_TEMPLATES[theme].skills === 'matrix') {
          // One labelled row per group of source skills: no columns for an ATS to interleave.
          for (const row of skillRows(skills)) blocks.push({ kind: 'text', lead: row.label, text: row.skills.map(clean).join(' · ') });
          break;
        }
        const grouped = theme === 'navy' ? skillGroups(skills) : null;
        if (grouped) {
          if (skillColumnsThatFit(skills, grouped.columns.length, bodyPt) === grouped.columns.length) {
            blocks.push({ kind: 'grid', columns: grouped.columns, labels: grouped.labels });
          } else {
            // A skill too long for its group column: stack the groups, each a single labelled column.
            grouped.columns.forEach((column, index) => {
              if (column.length) blocks.push({ kind: 'grid', columns: [column], labels: [grouped.labels[index]] });
            });
          }
          break;
        }
        const count = skillColumnsThatFit(skills, RESUME_TEMPLATES[theme].skillsColumns, bodyPt);
        // Row-major order in both formats for predictable ATS extraction.
        const columns = Array.from({ length: count }, (_, col) => skills.filter((_, i) => i % count === col));
        blocks.push({ kind: 'grid', columns });
        break;
      }
      case 'certifications': if (resume.certifications.length) {
        heading(theme === 'lead' ? 'CREDENTIALS' : theme === 'navy' ? 'CERTIFICATIONS' : 'CERTIFICATIONS & LICENSES', 'certifications');
        const credentials = resume.certifications.map(credentialText);
        // Executive lists each credential on its own line; the others keep one line.
        if (executive) for (const text of credentials) blocks.push({ kind: 'text', text, bold: true });
        else blocks.push({ kind: 'text', bold: true, text: credentials.join(theme === 'lead' || theme === 'plain' ? ' | ' : '   ·   ') });
      } break;
      case 'experience': if (resume.experience.length) {
        heading(track === 'lead' ? 'PROFESSIONAL EXPERIENCE' : 'WORK EXPERIENCE', 'experience');
        resume.experience.forEach((job, jobIndex) => {
          const dates = [job.startDate, job.endDate].map(clean).filter(Boolean).join(' – ');
          if (theme === 'sidebar') {
            // Sidebar: dates over the title, then the employer, all beside a left rule.
            if (dates) blocks.push({ kind: 'job', text: dates, muted: true, keepNext: true, leftRule: true });
            blocks.push({ kind: dates ? 'text' : 'job', text: job.jobTitle, bold: true, keepNext: true, leftRule: true });
            const org = [job.employer, job.location].map(clean).filter(Boolean).join(' · ');
            if (org) blocks.push({ kind: 'text', text: org, muted: true, keepNext: job.bullets.length > 0, leftRule: true });
            job.bullets.forEach((item, bulletIndex) => blocks.push({ kind: 'text', text: item, bullet: true, locked: lock?.bulletLocked(jobIndex, bulletIndex), leftRule: true }));
            return;
          }
          if (executive) {
            // Executive: the title alone, then one italic line with employer, place and dates.
            blocks.push({ kind: 'job', text: job.jobTitle, bold: true, keepNext: true });
            const line = [[job.employer, job.location].map(clean).filter(Boolean).join(', '), dates].filter(Boolean).join(' · ');
            if (line) blocks.push({ kind: 'text', text: line, italic: true, keepNext: job.bullets.length > 0 });
          } else {
            blocks.push({ kind: 'job', text: job.jobTitle, bold: true, ...dated(dates), keepNext: true });
            const org = [job.employer, job.location].map(clean).filter(Boolean).join(' — ');
            // Field Pro's employer line is no longer italic; `false` keeps the other looks' DOCX byte-identical.
            if (org) blocks.push({ kind: 'text', text: org, bold: theme === 'lead', italic: false, accent: theme === 'lead' || theme === 'blueprint', muted: theme === 'technical', keepNext: job.bullets.length > 0, ...beside });
          }
          // No inferred scope, duties, or numbers are introduced by presentation.
          if (theme === 'lead' && clean(job.scope)) blocks.push({ kind: 'text', text: `Scope: ${clean(job.scope)}`, italic: true, keepNext: job.bullets.length > 0 });
          job.bullets.forEach((item, bulletIndex) => blocks.push({ kind: 'text', text: item, bullet: true, locked: lock?.bulletLocked(jobIndex, bulletIndex), ...beside }));
        });
      } break;
      case 'education': if (resume.education.length) {
        heading('EDUCATION & TRAINING', 'education');
        for (const ed of resume.education) blocks.push({ kind: 'education', text: [ed.credential, ed.institution, ed.location].map(clean).filter(Boolean).join(' — '), ...(clean(ed.year) ? dated(clean(ed.year)) : beside) });
      } break;
      case 'additional': if (resume.additionalInformation.length) {
        heading(headings.additional, 'additional');
        // Executive keeps the left column clear of bullets: one flowing line instead.
        if (executive) blocks.push({ kind: 'text', text: resume.additionalInformation.map(clean).join(' · '), locked: lock?.additionalLocked });
        else for (const text of resume.additionalInformation) blocks.push({ kind: 'text', text, bullet: true, locked: lock?.additionalLocked });
      } break;
    }
  }
  return RESUME_TEMPLATES[theme].headings === 'side-label' ? sideLabelled(blocks) : blocks;
}
const credentialText = (c: GeneratedResume['certifications'][number]) => [c.name, c.issuer, c.year].map(clean).filter(Boolean).join(' — ');
function blocksForLetter(letter: GeneratedCoverLetter, locked = false): Block[] {
  const text = (value: string | undefined): Block[] => value ? [{ kind: 'text', text: value }] : [];
  return [
    ...[letter.date, letter.hiringManager, letter.companyName, letter.targetJobTitle ? `Re: ${letter.targetJobTitle}` : '', letter.salutation].flatMap(text),
    ...letter.paragraphs.flatMap((paragraph, index): Block[] => paragraph ? [{ kind: 'text', text: paragraph, locked: locked && letterParagraphLocked(index) }] : []),
    ...[letter.closing, letter.basics.fullName].flatMap(text),
  ];
}
function wrap(text: string, font: PDFFont, size: number, width: number, firstWidth = width): string[] {
  const lines: string[] = []; let line = '';
  // Only the first line can be narrower (it follows a bold label).
  const limit = () => lines.length ? width : firstWidth;
  for (const word of clean(text).split(' ').filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= limit()) { line = next; continue; }
    if (line) { lines.push(line); line = ''; }
    // Split unusually long unbroken strings rather than clipping them.
    for (const char of word) {
      if (line && font.widthOfTextAtSize(line + char, size) > limit()) { lines.push(line); line = ''; }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}
/** Date / year text at the right of a job or education line. */
function rightStyle(theme: TemplateKey): { bold: boolean; tone: 'ink' | 'accent' | 'muted' } {
  if (theme === 'blueprint') return { bold: true, tone: 'accent' };
  if (theme === 'premier' || theme === 'technical') return { bold: false, tone: 'muted' };
  return { bold: theme === 'lead', tone: 'ink' };
}
export async function renderPdfV2(input: GeneratedResume | GeneratedCoverLetter, theme: TemplateKey, style: ResumeStyle, watermarked: boolean, track: CareerTrack = 'plain', letter = false): Promise<Uint8Array> {
  const document = await PDFDocument.create(); document.registerFontkit(fontkit);
  const source = TEMPLATE_FONTS[FONT_FAMILIES[style.font].pdf];
  const title = letter ? (input as GeneratedCoverLetter).targetJobTitle : (input as GeneratedResume).basics.targetTitle;
  const usedText = JSON.stringify(input) + JSON.stringify(TRACK_HEADINGS) + 'CONTACT SYSTEMS SERVICE WORK TOOLS & EQUIPMENT SOFTWARE SAFETY PROFESSIONAL OTHER SKILLS Systems & equipment Tools & methods Service work Software Safety Professional Other skills SUMMARY SKILLS EDUCATION ADDITIONAL CERTIFICATIONS & LICENSES CREDENTIALS CERTIFICATIONS EDUCATION & TRAINING WORK EXPERIENCE PROFESSIONAL EXPERIENCE Scope: PREVIEW — PAY $9.99 TO REMOVE WATERMARK • · – | ' + input.basics.fullName.toUpperCase() + clean(title).toUpperCase();
  const regular = await document.embedFont(subsetTrueType(decodeFont(source.regular), usedText), { subset: false, features: { liga: false, clig: false, calt: false } });
  const bold = await document.embedFont(subsetTrueType(decodeFont(source.bold), usedText), { subset: false, features: { liga: false, clig: false, calt: false } });
  const italic = await document.embedFont(subsetTrueType(decodeFont(source.italic), usedText), { subset: false, features: { liga: false, clig: false, calt: false } });
  const accent = color(ACCENT_HEX[style.accent]), black = color('111111'), muted = color(MUTED_HEX), white = color('FFFFFF');
  const tone = (t: 'ink' | 'accent' | 'muted') => t === 'accent' ? accent : t === 'muted' ? muted : black;
  const size = BODY_SIZES[style.textSize], factor = SPACE_FACTORS[style.spacing];
  // The unpaid preview locks most AI-written lines; see resume-preview-lock.ts.
  const blocks = letter
    ? blocksForLetter(input as GeneratedCoverLetter, watermarked)
    : blocksForResume(input as GeneratedResume, theme, track, BODY_SIZES[style.textSize], watermarked ? resumePreviewLock((input as GeneratedResume).experience) : undefined);
  // Sidebar resumes: an accent rail down every page; text starts in the main column.
  const sidebar = theme === 'sidebar' && !letter;
  const LEFT = sidebar ? MAIN_X : MARGIN;
  const drawRail = (target: PDFPage) => { if (sidebar) target.drawRectangle({ x: 0, y: 0, width: RAIL_WIDTH, height: HEIGHT, color: accent }); };
  let page: PDFPage = document.addPage([WIDTH, HEIGHT]), y = HEIGHT - MARGIN;
  drawRail(page);
  const newPage = () => { page = document.addPage([WIDTH, HEIGHT]); drawRail(page); y = HEIGHT - MARGIN; };
  const ensure = (height: number) => { if (y - height < MARGIN) newPage(); };
  const draw = (text: string, x: number, baseline: number, font: PDFFont, pointSize: number, c = black) => page.drawText(text, { x, y: baseline, font, size: pointSize, color: c });
  const basics = input.basics;
  // A Sidebar cover letter has no rail: it uses a top bar in the accent colour.
  const headerStyle = letter && theme === 'sidebar' ? 'top-bar' : RESUME_TEMPLATES[theme].header;
  const name = theme === 'plain' ? clean(basics.fullName).toUpperCase() : clean(basics.fullName);
  if (headerStyle === 'top-bar') page.drawRectangle({ x: 0, y: HEIGHT - 8, width: WIDTH, height: 8, color: accent });
  if (headerStyle === 'tinted-band') {
    const tint = rgb(0.93 + accent.red * 0.07, 0.93 + accent.green * 0.07, 0.93 + accent.blue * 0.07);
    page.drawRectangle({ x: 0, y: HEIGHT - 108, width: WIDTH, height: 108, color: tint });
    page.drawRectangle({ x: 0, y: HEIGHT - 110, width: WIDTH, height: 2, color: accent });
    y = HEIGHT - 24;
  }
  const centered = headerStyle === 'centered';
  const panel = headerStyle === 'solid-panel';
  const items = contactItems(basics);
  const shownTitle = theme === 'premier' ? clean(title).toUpperCase() : clean(title);
  // Blueprint and Executive set the contact at the right of the name when it fits.
  const split = (theme === 'premier' || panel) && contactBesideName(name, shownTitle, items, size);
  type HeaderRow = { left: string; font: PDFFont; pointSize: number; c: ReturnType<typeof rgb>; tracking: number; right?: string };
  const leftStyle = (row: number): Omit<HeaderRow, 'left' | 'right'> => row === 0
    ? { font: bold, pointSize: 24, c: panel ? white : theme === 'lead' ? accent : black, tracking: centered ? 1.3 : 0 }
    : theme === 'premier' ? { font: bold, pointSize: 11, c: accent, tracking: 0.8 }
      : { font: theme === 'plain' ? regular : bold, pointSize: 12, c: panel ? white : theme === 'navy' || theme === 'technical' ? accent : black, tracking: 0 };
  const contactColor = panel ? white : theme === 'premier' ? muted : black;
  let headerRows: HeaderRow[];
  if (sidebar) {
    // Contact lives in the rail; the main column opens with the name and title.
    headerRows = [{ left: name, font: bold, pointSize: 26, c: black, tracking: 0 }, { left: shownTitle, font: bold, pointSize: 13, c: accent, tracking: 0 }];
  } else if (split) {
    headerRows = splitHeaderRows(name, shownTitle, items).map(([left, right], row) => left
      ? { left, right, ...leftStyle(row) }
      : { left, right, font: regular, pointSize: size, c: contactColor, tracking: 0 });
  } else {
    headerRows = [{ left: name, ...leftStyle(0) }, { left: shownTitle, ...leftStyle(1) }, { left: contact({ ...basics, targetTitle: title }), font: regular, pointSize: size, c: contactColor, tracking: 0 }];
  }
  // Each row may wrap; the right-hand contact text sits on a row's first line.
  const rightWidth = (row: HeaderRow) => row.right ? regular.widthOfTextAtSize(row.right, size) + 16 : 0;
  const headerLines = headerRows.map(row => ({ ...row, lines: row.left ? wrap(row.left, row.font, row.pointSize, WIDTH - LEFT - MARGIN - rightWidth(row) - row.tracking * row.left.length) : [''] }));
  const headerHeight = headerLines.reduce((sum, row) => sum + row.lines.length * row.pointSize * 1.3, 0);
  if (panel) {
    // Solid header panel, drawn first so the white text sits on top of it.
    page.drawRectangle({ x: MARGIN - BLUEPRINT_PAD, y: y - headerHeight - 2 * PANEL_INNER, width: WIDTH - 2 * MARGIN + 2 * BLUEPRINT_PAD, height: headerHeight + 2 * PANEL_INNER, color: accent });
    y -= PANEL_INNER;
  }
  for (const row of headerLines) {
    row.lines.forEach((line, lineIndex) => {
      const baseline = y - row.pointSize;
      if (line) {
        page.pushOperators(beginText(), setCharacterSpacing(row.tracking), endText());
        draw(line, centered ? (WIDTH - row.font.widthOfTextAtSize(line, row.pointSize) - row.tracking * (line.length - 1)) / 2 : LEFT, baseline, row.font, row.pointSize, row.c);
        page.pushOperators(beginText(), setCharacterSpacing(0), endText());
      }
      if (lineIndex === 0 && row.right) draw(row.right, WIDTH - MARGIN - regular.widthOfTextAtSize(row.right, size), baseline, regular, size, contactColor);
      y -= row.pointSize * 1.3;
    });
  }
  if (centered) { y -= 7; page.drawLine({ start: { x: MARGIN, y }, end: { x: WIDTH - MARGIN, y }, thickness: 1.5, color: accent }); y -= 5; }
  if (sidebar) {
    // Heavy ink rule under the title (Word: a 2 pt bottom border), then the rail text.
    y -= 6; page.drawLine({ start: { x: LEFT, y }, end: { x: WIDTH - MARGIN, y }, thickness: 2, color: black }); y -= 8;
    const lightRail = color(railTint(ACCENT_HEX[style.accent]));
    const railWidth = RAIL_WIDTH - 2 * RAIL_PAD;
    let railY = HEIGHT - MARGIN;
    sidebarPlan(input as GeneratedResume, size).rail.forEach((section, index) => {
      if (index) railY -= RAIL_SECTION_GAP;
      page.pushOperators(beginText(), setCharacterSpacing(LABEL_TRACKING), endText());
      draw(section.label, RAIL_PAD, railY - size, bold, size, lightRail);
      page.pushOperators(beginText(), setCharacterSpacing(0), endText());
      railY -= size * 1.3 + 4;
      for (const item of section.items) for (const line of wrap(item, section.bold ? bold : regular, size, railWidth)) {
        draw(line, RAIL_PAD, railY - size, section.bold ? bold : regular, size, white);
        railY -= size * 1.35;
      }
    });
  } else if (headerStyle === 'tinted-band') y = Math.min(y - 8, HEIGHT - 119);
  else if (headerStyle === 'double-rule') {
    // Thick-thin double rule, matching Word's thickThinSmallGap paragraph border.
    y -= 6; page.drawLine({ start: { x: MARGIN, y }, end: { x: WIDTH - MARGIN, y }, thickness: 1.8, color: accent });
    y -= 2.6; page.drawLine({ start: { x: MARGIN, y }, end: { x: WIDTH - MARGIN, y }, thickness: 0.6, color: accent });
    y -= 12;
  } else if (panel) {
    y -= PANEL_INNER;
    const credentials = letter ? [] : (input as GeneratedResume).certifications.map(credentialText).filter(Boolean);
    if (credentials.length) {
      // Credential strip under the panel: a label, then each credential in a box,
      // matching Word's shaded paragraph with bordered runs. Boxes wrap like words.
      const label = 'CERTIFICATIONS', gap = size * 0.9, padX = 4, chipH = size * 1.5;
      const labelWidth = bold.widthOfTextAtSize(label, size) + gap;
      const chipLines: Array<Array<{ text: string; x: number; w: number }>> = [[]];
      let x = MARGIN + labelWidth;
      for (const text of credentials) {
        const w = bold.widthOfTextAtSize(text, size) + 2 * padX;
        if (x + w > WIDTH - MARGIN && chipLines[chipLines.length - 1].length) { chipLines.push([]); x = MARGIN + labelWidth; }
        chipLines[chipLines.length - 1].push({ text, x, w });
        x += w + gap;
      }
      const lineH = size * 2, stripH = chipLines.length * lineH + 10;
      page.drawRectangle({ x: MARGIN - BLUEPRINT_PAD, y: y - stripH, width: WIDTH - 2 * MARGIN + 2 * BLUEPRINT_PAD, height: stripH, color: color(tintOf(ACCENT_HEX[style.accent], 0.9, 0.1)) });
      let lineTop = y - 5;
      chipLines.forEach((chips, lineIndex) => {
        const baseline = lineTop - (lineH + size * 0.7) / 2;
        if (lineIndex === 0) draw(label, MARGIN, baseline, bold, size, black);
        for (const chip of chips) {
          page.drawRectangle({ x: chip.x, y: baseline - size * 0.35, width: chip.w, height: chipH, borderColor: accent, borderWidth: 1, color: white });
          draw(chip.text, chip.x + padX, baseline, bold, size, accent);
        }
        lineTop -= lineH;
      });
      y -= stripH;
    }
    y -= 16;
  } else if (headerStyle === 'heavy-rule') {
    // One heavy ink rule under the header, matching Word's 2 pt paragraph border.
    y -= 6; page.drawLine({ start: { x: MARGIN, y }, end: { x: WIDTH - MARGIN, y }, thickness: 2, color: black });
    y -= 10;
  } else y -= 9;

  const width = WIDTH - LEFT - MARGIN;
  /** Shared by measuring and drawing, so page breaks always match what is drawn. */
  const textLayout = (b: Block) => {
    const font = b.bold ? bold : b.italic ? italic : regular;
    const right = rightStyle(theme), rightFont = right.bold ? bold : regular;
    const rightWidth = b.right ? rightFont.widthOfTextAtSize(clean(b.right), size) + 18 : 0;
    const indent = b.indent ?? 0, inset = indent + (b.bullet ? 14 : 0);
    const leadText = b.lead ? `${clean(b.lead)}: ` : '';
    const leadWidth = leadText ? bold.widthOfTextAtSize(leadText, size) : 0;
    const available = width - inset - rightWidth;
    const lines = wrap(b.text ?? '', font, size, available, available - leadWidth);
    // A date wider than its column wraps inside it instead of running into the text.
    const gutterLines = b.gutter && indent ? wrap(b.gutter, b.gutterLabel ? bold : regular, size, indent - 8) : [];
    return { font, right, rightFont, rightWidth, indent, inset, leadText, leadWidth, lines, gutterLines };
  };
  const heights = (b: Block, space: number): number => {
    const lh = size * (1 + 0.28 * space);
    if (b.kind === 'heading') return size * 1.12 + 13 * space + (RESUME_TEMPLATES[theme].headings === 'solid-band' ? BAND_GAP : 0);
    const rule = b.ruleAbove ? RULE_GAP * 2 * space : 0;
    if (b.kind === 'grid') {
      const cols = b.columns!; const cw = width / cols.length;
      let h = b.labels ? lh + 3 : 0;
      for (let row = 0; row < Math.max(...cols.map(c => c.length)); row++) h += Math.max(...cols.map(c => Math.max(1, wrap(c[row] ?? '', regular, size, cw - 12).length))) * lh + 2 * space;
      return h + 3 * space;
    }
    const { lines, gutterLines } = textLayout(b);
    return rule + Math.max(1, lines.length, gutterLines.length) * lh + (letter ? 9 : b.kind === 'job' ? 7 : 2) * space;
  };
  // Tighten gaps, never font size, before choosing a clean second page.
  const total = blocks.reduce((sum, b) => sum + heights(b, factor), 0);
  const compactTotal = blocks.reduce((sum, b) => sum + heights(b, 0.75), 0);
  const space = total > y - MARGIN && compactTotal <= y - MARGIN ? 0.75 : factor;
  const lh = size * (1 + 0.28 * space);
  for (let index = 0; index < blocks.length; index++) {
    const b = blocks[index];
    let reserve = heights(b, space);
    let next = index;
    while (blocks[next]?.keepNext && blocks[next + 1]) { next++; reserve += heights(blocks[next], space); }
    ensure(Math.min(reserve, HEIGHT - MARGIN * 2));
    if (b.kind === 'heading') {
      y -= 7 * space;
      const headingStyle = RESUME_TEMPLATES[theme].headings;
      const headingSize = size * 1.12, baseline = y - headingSize;
      // Keep tracking well under 0.1 em: PDF text extractors (and ATS parsers) read
      // wider letter gaps as word breaks, turning a heading into spaced letters.
      const tracking = theme === 'navy' ? 0.9 : theme === 'plain' ? 0.7 : theme === 'premier' ? 0.6 : 0.4;
      // Solid accent band with white text, matching Word's shaded paragraph.
      if (headingStyle === 'solid-band') page.drawRectangle({ x: MARGIN - PANEL_PAD, y: baseline - 3.5, width: WIDTH - 2 * MARGIN + 2 * PANEL_PAD, height: headingSize + 6, color: accent });
      // Blueprint: a small accent square before the heading, matching Word's shaded run.
      const marker = headingStyle === 'marker-rule' ? MARKER_SIZE + MARKER_GAP : 0;
      if (marker) page.drawRectangle({ x: LEFT, y: baseline - 0.5, width: MARKER_SIZE, height: MARKER_SIZE, color: accent });
      page.pushOperators(beginText(), setCharacterSpacing(tracking), endText());
      draw(b.text!, LEFT + marker, baseline, bold, headingSize, headingStyle === 'solid-band' ? white : theme === 'navy' || headingStyle === 'marker-rule' || headingStyle === 'accent-caps' ? accent : black);
      page.pushOperators(beginText(), setCharacterSpacing(0), endText());
      if (headingStyle === 'marker-rule') {
        // Rule from the end of the heading to the margin, like Word's tab leader.
        const end = LEFT + marker + bold.widthOfTextAtSize(b.text!, headingSize) + tracking * (b.text!.length - 1) + 8;
        if (end < WIDTH - MARGIN) page.drawLine({ start: { x: end, y: baseline + 1 }, end: { x: WIDTH - MARGIN, y: baseline + 1 }, thickness: 1.2, color: accent });
      }
      y -= headingSize + 4 * space;
      if (headingStyle === 'solid-band') y -= BAND_GAP;
      if (headingStyle !== 'solid-band' && headingStyle !== 'marker-rule' && headingStyle !== 'accent-caps') page.drawLine({ start: { x: LEFT, y }, end: { x: headingStyle === 'short-underline' ? LEFT + 30 : WIDTH - MARGIN, y }, thickness: theme === 'lead' ? 1.3 : 0.8, color: theme === 'plain' ? black : accent });
      y -= 2 * space;
    } else if (b.kind === 'grid') {
      const cols = b.columns!, cw = width / cols.length;
      if (b.labels) { b.labels.forEach((label, col) => draw(label, LEFT + col * cw, y - size, bold, size)); y -= lh + 3; }
      for (let row = 0; row < Math.max(...cols.map(c => c.length)); row++) {
        const lines = cols.map(c => wrap(c[row] ?? '', regular, size, cw - 12));
        const rowHeight = Math.max(...lines.map(l => Math.max(1, l.length))) * lh + 2 * space;
        ensure(rowHeight);
        lines.forEach((ls, col) => ls.forEach((line, lineIndex) => draw(`${!b.labels && lineIndex === 0 ? '• ' : ''}${line}`, LEFT + col * cw, y - size - lineIndex * lh, regular, size)));
        y -= rowHeight;
      }
      y -= 3 * space;
    } else {
      const { font, right, rightFont, rightWidth, indent, inset, leadText, leadWidth, lines, gutterLines } = textLayout(b);
      if (b.ruleAbove) {
        y -= RULE_GAP * space;
        page.drawLine({ start: { x: LEFT, y }, end: { x: WIDTH - MARGIN, y }, thickness: 0.6, color: color(RULE_HEX) });
        y -= RULE_GAP * space;
      }
      if (b.kind === 'job') y -= 5 * space;
      const rightY = y - size;
      for (let i = 0; i < Math.max(lines.length, gutterLines.length); i++) {
        ensure(lh);
        if (b.leftRule) page.drawLine({ start: { x: LEFT - 1, y: y + (i === 0 && b.kind === 'job' ? 0 : 2 * space) }, end: { x: LEFT - 1, y: y - lh }, thickness: 1.5, color: color(JOB_RULE_HEX) });
        if (gutterLines[i] && b.gutterLabel) {
          page.pushOperators(beginText(), setCharacterSpacing(LABEL_TRACKING), endText());
          draw(gutterLines[i], LEFT, y - size, bold, size, muted);
          page.pushOperators(beginText(), setCharacterSpacing(0), endText());
        } else if (gutterLines[i]) draw(gutterLines[i], LEFT, y - size, regular, size, muted);
        if (b.bullet && i === 0) draw('•', LEFT + indent + 2, y - size, regular, size);
        if (i === 0 && leadText) draw(leadText, LEFT + inset, y - size, bold, size);
        const x = LEFT + inset + (i === 0 ? leadWidth : 0);
        if (lines[i] === undefined) { /* only the date column continues on this line */ }
        else if (b.locked) drawLockedLine(page, lines[i], { x, baseline: y - size, font, size });
        else draw(lines[i], x, y - size, font, size, b.accent ? accent : b.muted ? muted : black);
        if (i === 0 && b.right) draw(clean(b.right), WIDTH - MARGIN - rightWidth + 18, rightY, rightFont, size, tone(right.tone));
        y -= lh;
      }
      y -= (letter ? 9 : 2) * space;
    }
  }
  if (watermarked) {
    const logo = await document.embedPng(decodeFont(RESUME_WATERMARK_LOGO_BASE64));
    for (const p of document.getPages()) {
      p.drawImage(logo, { x: 48, y: 225, width: 515, height: 344, rotate: degrees(28), opacity: 0.18 });
      p.drawText('PREVIEW — PAY $9.99 TO REMOVE WATERMARK', { x: 58, y: 82, size: 18, font: bold, color: black, rotate: degrees(28), opacity: 0.34 });
    }
  }
  return document.save();
}

/**
 * Sidebar DOCX rail: a one-pixel accent image stretched to the rail's size, anchored
 * to the page corner behind the text. Kept in the page header so it repeats on every
 * page, like the PDF rail. Images carry no text, so ATS reading is unaffected.
 */
function railHeader(accent: string): Header {
  const emu = (points: number) => Math.round(points * 12700);
  return new Header({ children: [new Paragraph({ children: [new ImageRun({ type: 'png', data: solidPng(accent),
    transformation: { width: Math.round(RAIL_WIDTH * 4 / 3), height: Math.round(HEIGHT * 4 / 3) },
    altText: { name: 'Sidebar', description: 'Decorative sidebar', title: 'Sidebar' },
    floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: emu(0) }, verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: emu(0) },
      behindDocument: true, allowOverlap: true, wrap: { type: TextWrappingType.NONE } } })] })] });
}
export async function renderDocxV2(input: GeneratedResume | GeneratedCoverLetter, theme: TemplateKey, style: ResumeStyle, track: CareerTrack = 'plain', letter = false): Promise<Uint8Array> {
  const size = BODY_SIZES[style.textSize] * 2, space = SPACE_FACTORS[style.spacing];
  const font = FONT_FAMILIES[style.font].docx, accent = ACCENT_HEX[style.accent];
  const blocks = letter ? blocksForLetter(input as GeneratedCoverLetter) : blocksForResume(input as GeneratedResume, theme, track, BODY_SIZES[style.textSize]);
  const run = (text: string, opts: { bold?: boolean; italics?: boolean; color?: string; size?: number; characterSpacing?: number } = {}) => new TextRun({ text: clean(text), font, size, ...opts });
  const border = (color: string, thickness: number) => ({ color, size: thickness, style: BorderStyle.SINGLE });
  const alignment = theme === 'plain' ? AlignmentType.CENTER : AlignmentType.LEFT;
  const tintHex = tintOf(accent);
  const shade = theme === 'lead' ? { fill: tintHex } : undefined;
  const title = letter ? (input as GeneratedCoverLetter).targetJobTitle : (input as GeneratedResume).basics.targetTitle;
  const children: Paragraph[] = [];
  const sidebar = theme === 'sidebar' && !letter;
  const left = sidebar ? MAIN_X : MARGIN;
  const usableTwips = (WIDTH - left - MARGIN) * 20;
  const contactText = contact({ ...input.basics, targetTitle: title });
  const items = contactItems(input.basics);
  const shownTitle = theme === 'premier' ? clean(title).toUpperCase() : clean(title);
  // Same choice as the PDF: contact at the right of the name when it fits.
  const split = (theme === 'premier' || theme === 'blueprint') && contactBesideName(input.basics.fullName, shownTitle, items, size / 2);
  const rightTab = [{ type: TabStopType.RIGHT, position: usableTwips }];
  const titleRun = (text: string, panelText: boolean) => theme === 'premier'
    ? run(text, { bold: true, size: 22, color: accent, characterSpacing: 16 })
    : run(text, { bold: true, size: 24, color: panelText ? 'FFFFFF' : undefined });
  /** Header rows as paragraph children: name, title and contact, split or stacked. */
  const headerRows = (panelText: boolean): Array<Array<TextRun>> => {
    const contactColor = panelText ? 'FFFFFF' : MUTED_HEX;
    if (!split) return [[run(input.basics.fullName, { bold: true, size: 48, color: panelText ? 'FFFFFF' : undefined })], [titleRun(shownTitle, panelText)], [run(contactText, { color: contactColor })]];
    return splitHeaderRows(input.basics.fullName, shownTitle, items).map(([left, rightText], row) => [
      ...(left ? [row === 0 ? run(left, { bold: true, size: 48, color: panelText ? 'FFFFFF' : undefined }) : titleRun(left, panelText)] : []),
      ...(rightText ? [new TextRun({ text: `\t${rightText}`, font, size, color: contactColor })] : []),
    ]);
  };
  if (sidebar) {
    // Main column: name and title over a heavy rule. The rail text is a frame fixed
    // to the page over the rail image; it follows the name in reading order.
    const plan = sidebarPlan(input as GeneratedResume, size / 2);
    const railTextTwips = (RAIL_WIDTH - 2 * RAIL_PAD) * 20, light = railTint(accent);
    const frame = { type: 'absolute' as const, position: { x: RAIL_PAD * 20, y: MARGIN * 20 }, width: railTextTwips, height: (HEIGHT - 2 * MARGIN) * 20,
      rule: HeightRule.AUTO, wrap: FrameWrap.AROUND, anchor: { horizontal: FrameAnchorType.PAGE, vertical: FrameAnchorType.PAGE } };
    children.push(new Paragraph({ spacing: { after: 30 }, children: [run(input.basics.fullName, { bold: true, size: 52 })] }),
      new Paragraph({ border: { bottom: { color: '111111', size: 16, style: BorderStyle.SINGLE, space: 6 } }, spacing: { after: 160 }, children: [run(shownTitle, { bold: true, size: 26, color: accent })] }));
    plan.rail.forEach((section, index) => {
      children.push(new Paragraph({ frame, spacing: { before: index ? RAIL_SECTION_GAP * 20 : 0, after: 80 },
        children: [run(section.label, { bold: true, color: light, characterSpacing: Math.round(LABEL_TRACKING * 20) })] }));
      for (const item of section.items) children.push(new Paragraph({ frame, spacing: { after: 40 }, children: [run(item, { bold: section.bold, color: 'FFFFFF' })] }));
    });
  } else if (theme === 'premier') {
    const rows = headerRows(false);
    rows.forEach((row, index) => children.push(new Paragraph({ tabStops: rightTab, spacing: { after: index === rows.length - 1 ? 220 : 30 },
      border: index === rows.length - 1 ? { bottom: { color: accent, size: 18, style: BorderStyle.THICK_THIN_SMALL_GAP, space: 6 } } : undefined, children: row })));
  } else if (theme === 'blueprint') {
    // One solid panel: identical shading and borders on consecutive paragraphs merge
    // into one box; the border spacing is the panel padding outside the text margin.
    const edge = { color: accent, size: 4, style: BorderStyle.SINGLE, space: BLUEPRINT_PAD };
    const inner = { ...edge, space: PANEL_INNER };
    const panel = { shading: { fill: accent }, border: { top: inner, bottom: inner, left: edge, right: edge } };
    const rows = headerRows(true);
    rows.forEach((row, index) => children.push(new Paragraph({ ...panel, tabStops: rightTab, spacing: { after: index === rows.length - 1 ? 0 : 30 }, children: row })));
    const credentials = letter ? [] : (input as GeneratedResume).certifications.map(credentialText).filter(Boolean);
    if (credentials.length) {
      // Credential strip: a tinted paragraph under the panel, each credential a boxed run.
      const tint = tintOf(accent, 0.9, 0.1), stripEdge = { color: tint, size: 4, style: BorderStyle.SINGLE, space: BLUEPRINT_PAD };
      const box = { color: accent, size: 8, style: BorderStyle.SINGLE, space: 1 };
      children.push(new Paragraph({ shading: { fill: tint }, border: { top: { ...stripEdge, space: 4 }, bottom: { ...stripEdge, space: 4 }, left: stripEdge, right: stripEdge },
        spacing: { before: 0, after: 0, line: 360 }, children: [
          run('CERTIFICATIONS', { bold: true, color: '111111' }),
          ...credentials.flatMap(text => [new TextRun({ text: '   ', font, size }), new TextRun({ text: clean(text), font, size, bold: true, color: accent, border: box, shading: { fill: 'FFFFFF', type: ShadingType.CLEAR, color: 'auto' } })]),
        ] }));
    }
    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  } else {
    if (theme === 'navy' || theme === 'sidebar') children.push(new Paragraph({ border: { top: border(accent, 48) }, spacing: { after: 160 }, children: [] }));
    children.push(new Paragraph({ alignment, shading: shade, spacing: { after: 30 }, children: [run(theme === 'plain' ? input.basics.fullName.toUpperCase() : input.basics.fullName, { bold: true, size: 48, characterSpacing: theme === 'plain' ? 26 : undefined, color: theme === 'lead' ? accent : '111111' })] }),
      new Paragraph({ alignment, shading: shade, spacing: { after: 30 }, children: [run(title, { size: 24, bold: theme !== 'plain', color: theme === 'navy' || theme === 'technical' ? accent : '111111' })] }),
      new Paragraph({ alignment, shading: shade, border: theme === 'navy' ? undefined : { bottom: theme === 'technical' ? border('111111', 16) : border(accent, theme === 'lead' ? 16 : 8) }, spacing: { after: 140 }, children: [run(contactText)] }));
  }
  const headingStyle = RESUME_TEMPLATES[theme].headings;
  // Ink dates keep the document default colour, so existing templates' DOCX is unchanged.
  const right = rightStyle(theme), rightColor = right.tone === 'accent' ? accent : MUTED_HEX;
  for (const b of blocks) {
    if (b.kind === 'heading') {
      const headingRun = (text: string) => run(text, { bold: true, size: Math.round(size * 1.12), color: theme === 'navy' || headingStyle === 'marker-rule' || headingStyle === 'accent-caps' ? accent : '111111', characterSpacing: theme === 'navy' ? 24 : 12 });
      if (headingStyle === 'marker-rule') {
        // A small shaded run is the square marker; a tab leader rules out to the margin.
        children.push(new Paragraph({ keepNext: true, keepLines: true, tabStops: [{ type: TabStopType.RIGHT, position: usableTwips, leader: LeaderType.UNDERSCORE }],
          spacing: { before: 200 * space, after: 80 * space }, children: [
            new TextRun({ text: '\u00a0\u00a0\u00a0\u00a0', font, size: 14, shading: { fill: accent, type: ShadingType.CLEAR, color: 'auto' } }),
            new TextRun({ text: '\u00a0\u00a0', font, size: Math.round(size * 1.12) }),
            headingRun(b.text!), new TextRun({ text: '\t', font, size: Math.round(size * 1.12), color: accent })] }));
        continue;
      }
      if (headingStyle === 'solid-band') {
        // The accent-coloured side borders carry the band out to the same edge as the PDF.
        const edge = { color: accent, size: 4, style: BorderStyle.SINGLE, space: PANEL_PAD };
        children.push(new Paragraph({ keepNext: true, keepLines: true, shading: { fill: accent }, border: { left: edge, right: edge },
          spacing: { before: 200 * space, after: 80 * space }, children: [run(b.text!, { bold: true, size: Math.round(size * 1.12), color: 'FFFFFF', characterSpacing: 12 })] }));
        continue;
      }
      children.push(new Paragraph({ keepNext: true, keepLines: true,
        border: theme === 'navy' || headingStyle === 'accent-caps' ? undefined : { bottom: border(theme === 'plain' ? '111111' : accent, theme === 'lead' ? 8 : 4) },
        spacing: { before: 180 * space, after: 60 * space }, children: [headingRun(b.text!)] }));
      if (theme === 'navy') children.push(new Paragraph({ keepNext: true, border: { bottom: border(accent, 8) }, indent: { right: usableTwips - 600 }, spacing: { before: 0, after: 100, line: 20 }, children: [new TextRun({ text: '', size: 2 })] }));
    } else if (b.kind === 'grid') {
      const cols = b.columns!, count = cols.length;
      const tabs = Array.from({ length: count - 1 }, (_, i) => ({ type: TabStopType.LEFT, position: Math.round(usableTwips / count * (i + 1)) }));
      if (b.labels) children.push(new Paragraph({ keepNext: true, tabStops: tabs, children: b.labels.map((label, i) => new TextRun({ text: `${i ? '\t' : ''}${label}`, font, size, bold: true })) }));
      for (let row = 0; row < Math.max(...cols.map(c => c.length)); row++) {
        // Columns were chosen so every skill fits one line (skillColumnsThatFit). The
        // explicit wrap is a backstop that keeps text out of the next tab column; a
        // single column needs no tabs, so Word wraps the whole skill as one paragraph.
        const maxChars = skillCharsPerColumn(count, size / 2);
        const lines = count === 1 ? cols.map(col => [clean(col[row])].filter(Boolean)) : cols.map(col => {
          const words = clean(col[row]).split(' '); const result: string[] = []; let line = '';
          for (const word of words) { if (line && (line + ' ' + word).length > maxChars) { result.push(line); line = ''; } line += (line ? ' ' : '') + word; }
          if (line) result.push(line); return result;
        });
        for (let i = 0; i < Math.max(...lines.map(l => l.length)); i++) children.push(new Paragraph({ keepLines: true, tabStops: tabs, spacing: { after: 25 * space }, children: lines.map((ls, col) => new TextRun({ text: `${col ? '\t' : ''}${ls[i] ? (!b.labels && i === 0 ? '• ' : '') + ls[i] : ''}`, font, size })) }));
      }
    } else {
      // Timeline blocks: the date hangs in the left column and a tab starts the text at
      // the indent. No table, so the document stays one linear, ATS-readable flow.
      const indentTwips = Math.round((b.indent ?? 0) * 20);
      const hangingDate = Boolean(b.gutter && indentTwips);
      const indent = b.bullet && indentTwips ? { left: indentTwips + 280, hanging: 240 }
        : hangingDate ? { left: indentTwips, hanging: indentTwips }
          : indentTwips ? { left: indentTwips }
            // Sidebar job rule: the bullets' first line starts 40 twips in, so the rule lines up.
            : b.leftRule && !b.bullet ? { left: 40 } : undefined;
      const stops = [
        ...(hangingDate ? [{ type: TabStopType.LEFT, position: indentTwips }] : []),
        ...(b.right ? [{ type: TabStopType.RIGHT, position: usableTwips }] : []),
      ];
      // Executive section rule: a top border, spaced like the PDF's rule.
      const rule = b.ruleAbove ? { top: { color: RULE_HEX, size: 4, style: BorderStyle.SINGLE, space: Math.round(RULE_GAP * space) } }
        : b.leftRule ? { left: { color: JOB_RULE_HEX, size: 12, style: BorderStyle.SINGLE, space: 1 } } : undefined;
      children.push(new Paragraph({ keepNext: b.keepNext, keepLines: true, numbering: b.bullet ? { reference: 'resume-bullets', level: 0 } : undefined,
        tabStops: stops.length ? stops : undefined, indent, border: rule,
        spacing: { before: b.ruleAbove ? Math.round(RULE_GAP * 20 * space) : b.kind === 'job' ? 100 * space : 0, after: (letter ? 170 : 40) * space, line: Math.round(240 * (1 + 0.15 * space)) },
        children: [
          ...(hangingDate ? [b.gutterLabel
            ? new TextRun({ text: `${clean(b.gutter)}\t`, font, size, bold: true, color: MUTED_HEX, characterSpacing: Math.round(LABEL_TRACKING * 20) })
            : new TextRun({ text: `${clean(b.gutter)}\t`, font, size, color: MUTED_HEX })] : []),
          ...(b.lead ? [new TextRun({ text: `${clean(b.lead)}: `, font, size, bold: true })] : []),
          run(b.text!, { bold: b.bold, italics: b.italic, color: b.accent ? accent : b.muted ? MUTED_HEX : '111111' }),
          ...(b.right ? [new TextRun({ text: `\t${clean(b.right)}`, font, size, bold: right.bold, color: right.tone === 'ink' ? undefined : rightColor })] : []),
        ] }));
    }
  }
  return new Uint8Array(await Packer.toBuffer(new Document({ numbering: { config: [{ reference: 'resume-bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { run: { font, size }, paragraph: { indent: { left: 280, hanging: 240 } } } }] }] }, styles: { default: { document: { run: { font, size, color: '111111' } } } }, sections: [{ properties: { page: { size: { width: WIDTH * 20, height: HEIGHT * 20 }, margin: { top: MARGIN * 20, right: MARGIN * 20, bottom: MARGIN * 20, left: left * 20 } } }, headers: sidebar ? { default: railHeader(accent) } : undefined, children }] })));
}
