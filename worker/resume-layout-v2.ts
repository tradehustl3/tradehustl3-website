import { subsetTrueType } from './resume-font-subset';
import { AlignmentType, BorderStyle, Document, LeaderType, Packer, Paragraph, TextRun, TabStopType, LevelFormat } from 'docx';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, degrees, beginText, endText, setCharacterSpacing, type PDFFont, type PDFPage } from 'pdf-lib';
import type { GeneratedResume } from './resume-documents';
import type { GeneratedCoverLetter } from './cover-letter-documents';
import { decodeFont } from './roboto-fonts';
import { RESUME_WATERMARK_LOGO_BASE64 } from './resume-watermark-logo';
import { TEMPLATE_FONTS } from './resume-template-fonts';
import { ACCENT_HEX, BODY_SIZES, FONT_FAMILIES, RESUME_TEMPLATES, SPACE_FACTORS, TRACK_HEADINGS, skillGroups, type CareerTrack, type ResumeStyle, type TemplateKey } from './resume-templates';
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
/** Blueprint header panel and heading band reach this far past the text margin. */
const PANEL_PAD = 10;
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
type Block = { kind: 'heading' | 'text' | 'grid' | 'job' | 'education'; text?: string; bold?: boolean; italic?: boolean; accent?: boolean; muted?: boolean; right?: string; columns?: string[][]; labels?: string[]; bullet?: boolean; keepNext?: boolean; locked?: boolean };
// `lock` is only passed for the unpaid watermarked PDF; DOCX and paid files never lock.
function blocksForResume(resume: GeneratedResume, theme: TemplateKey, track: CareerTrack, bodyPt: number, lock?: ResumePreviewLock): Block[] {
  const blocks: Block[] = [], headings = TRACK_HEADINGS[track];
  const heading = (text: string) => blocks.push({ kind: 'heading', text, keepNext: true });
  for (const section of RESUME_TEMPLATES[theme].sections) {
    switch (section) {
      case 'summary': if (clean(resume.summary)) { heading(headings.summary); blocks.push({ kind: 'text', text: resume.summary }); } break;
      case 'skills': {
        const skills = presentableSkills(resume.skills);
        if (!skills.length) break;
        heading(headings.skills);
        if (RESUME_TEMPLATES[theme].skills === 'inline') {
          // One flowing line of source skills: no columns for an ATS to interleave.
          blocks.push({ kind: 'text', text: skills.map(clean).join(' · ') });
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
        heading(theme === 'lead' ? 'CREDENTIALS' : theme === 'navy' ? 'CERTIFICATIONS' : 'CERTIFICATIONS & LICENSES');
        const credentials = resume.certifications.map(c => [c.name, c.issuer, c.year].map(clean).filter(Boolean).join(' — '));
        // Blueprint lists each credential on its own line; the others keep one line.
        if (theme === 'blueprint') for (const text of credentials) blocks.push({ kind: 'text', text, bold: true, bullet: true });
        else blocks.push({ kind: 'text', bold: true, text: credentials.join(theme === 'lead' ? ' | ' : '   ·   ') });
      } break;
      case 'experience': if (resume.experience.length) {
        heading(track === 'lead' ? 'PROFESSIONAL EXPERIENCE' : 'WORK EXPERIENCE');
        resume.experience.forEach((job, jobIndex) => {
          blocks.push({ kind: 'job', text: job.jobTitle, bold: true, right: [job.startDate, job.endDate].map(clean).filter(Boolean).join(' – '), keepNext: true });
          const org = [job.employer, job.location].map(clean).filter(Boolean).join(' — ');
          if (org) blocks.push({ kind: 'text', text: org, bold: theme === 'lead', italic: theme === 'plain', accent: theme === 'lead' || theme === 'blueprint', muted: theme === 'premier', keepNext: job.bullets.length > 0 });
          // No inferred scope, duties, or numbers are introduced by presentation.
          if (theme === 'lead' && clean(job.scope)) blocks.push({ kind: 'text', text: `Scope: ${clean(job.scope)}`, italic: true, keepNext: job.bullets.length > 0 });
          job.bullets.forEach((item, bulletIndex) => blocks.push({ kind: 'text', text: item, bullet: true, locked: lock?.bulletLocked(jobIndex, bulletIndex) }));
        });
      } break;
      case 'education': if (resume.education.length) {
        heading('EDUCATION & TRAINING');
        for (const ed of resume.education) blocks.push({ kind: 'education', text: [ed.credential, ed.institution, ed.location].map(clean).filter(Boolean).join(' — '), right: ed.year });
      } break;
      case 'additional': if (resume.additionalInformation.length) {
        heading(headings.additional);
        for (const text of resume.additionalInformation) blocks.push({ kind: 'text', text, bullet: true, locked: lock?.additionalLocked });
      } break;
    }
  }
  return blocks;
}
function blocksForLetter(letter: GeneratedCoverLetter, locked = false): Block[] {
  const text = (value: string | undefined): Block[] => value ? [{ kind: 'text', text: value }] : [];
  return [
    ...[letter.date, letter.hiringManager, letter.companyName, letter.targetJobTitle ? `Re: ${letter.targetJobTitle}` : '', letter.salutation].flatMap(text),
    ...letter.paragraphs.flatMap((paragraph, index): Block[] => paragraph ? [{ kind: 'text', text: paragraph, locked: locked && letterParagraphLocked(index) }] : []),
    ...[letter.closing, letter.basics.fullName].flatMap(text),
  ];
}
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = []; let line = '';
  for (const word of clean(text).split(' ').filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) { line = next; continue; }
    if (line) { lines.push(line); line = ''; }
    // Split unusually long unbroken strings rather than clipping them.
    for (const char of word) {
      if (line && font.widthOfTextAtSize(line + char, size) > width) { lines.push(line); line = ''; }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}
/** Date / year text at the right of a job or education line. */
function rightStyle(theme: TemplateKey): { bold: boolean; tone: 'ink' | 'accent' | 'muted' } {
  if (theme === 'blueprint') return { bold: true, tone: 'accent' };
  if (theme === 'premier') return { bold: false, tone: 'muted' };
  return { bold: theme === 'lead', tone: 'ink' };
}
export async function renderPdfV2(input: GeneratedResume | GeneratedCoverLetter, theme: TemplateKey, style: ResumeStyle, watermarked: boolean, track: CareerTrack = 'plain', letter = false): Promise<Uint8Array> {
  const document = await PDFDocument.create(); document.registerFontkit(fontkit);
  const source = TEMPLATE_FONTS[FONT_FAMILIES[style.font].pdf];
  const title = letter ? (input as GeneratedCoverLetter).targetJobTitle : (input as GeneratedResume).basics.targetTitle;
  const usedText = JSON.stringify(input) + JSON.stringify(TRACK_HEADINGS) + 'Systems & equipment Tools & methods CERTIFICATIONS & LICENSES CREDENTIALS CERTIFICATIONS EDUCATION & TRAINING WORK EXPERIENCE PROFESSIONAL EXPERIENCE Scope: PREVIEW — PAY $9.99 TO REMOVE WATERMARK • · – | ' + input.basics.fullName.toUpperCase() + clean(title).toUpperCase();
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
  let page: PDFPage = document.addPage([WIDTH, HEIGHT]), y = HEIGHT - MARGIN;
  const newPage = () => { page = document.addPage([WIDTH, HEIGHT]); y = HEIGHT - MARGIN; };
  const ensure = (height: number) => { if (y - height < MARGIN) newPage(); };
  const draw = (text: string, x: number, baseline: number, font: PDFFont, pointSize: number, c = black) => page.drawText(text, { x, y: baseline, font, size: pointSize, color: c });
  const basics = input.basics;
  const headerStyle = RESUME_TEMPLATES[theme].header;
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
  // [text, font, size, colour, letter tracking] for name, title and contact.
  const headerRows: Array<readonly [string, PDFFont, number, ReturnType<typeof rgb>, number]> = theme === 'premier'
    ? [[name, bold, 24, black, 0], [clean(title).toUpperCase(), bold, 11, accent, 0.8], [contact({ ...basics, targetTitle: title }), regular, size, muted, 0]]
    : panel
      ? [[name, bold, 24, white, 0], [title, bold, 12, white, 0], [contact({ ...basics, targetTitle: title }), regular, size, white, 0]]
      : [[name, bold, 24, theme === 'lead' ? accent : black, centered ? 1.3 : 0], [title, theme === 'plain' ? regular : bold, 12, theme === 'navy' ? accent : black, 0], [contact({ ...basics, targetTitle: title }), regular, size, black, 0]];
  const headerLines = headerRows.map(([text, font, pointSize, c, tracking]) => ({ lines: wrap(text, font, pointSize, WIDTH - 2 * MARGIN - tracking * text.length), font, pointSize, c, tracking }));
  if (panel) {
    // Solid header panel, drawn first so the white text sits on top of it.
    const textHeight = headerLines.reduce((sum, row) => sum + row.lines.length * row.pointSize * 1.3, 0);
    page.drawRectangle({ x: MARGIN - PANEL_PAD, y: y - textHeight - PANEL_PAD, width: WIDTH - 2 * MARGIN + 2 * PANEL_PAD, height: textHeight + 2 * PANEL_PAD + 4, color: accent });
  }
  for (const { lines, font, pointSize, c, tracking } of headerLines) {
    for (const line of lines) {
      page.pushOperators(beginText(), setCharacterSpacing(tracking), endText());
      draw(line, centered ? (WIDTH - font.widthOfTextAtSize(line, pointSize) - tracking * (line.length - 1)) / 2 : MARGIN, y - pointSize, font, pointSize, c);
      page.pushOperators(beginText(), setCharacterSpacing(0), endText());
      y -= pointSize * 1.3;
    }
  }
  if (centered) { y -= 7; page.drawLine({ start: { x: MARGIN, y }, end: { x: WIDTH - MARGIN, y }, thickness: 1.5, color: accent }); y -= 5; }
  if (headerStyle === 'tinted-band') y = Math.min(y - 8, HEIGHT - 119);
  else if (headerStyle === 'double-rule') {
    // Thick-thin double rule, matching Word's thickThinSmallGap paragraph border.
    y -= 6; page.drawLine({ start: { x: MARGIN, y }, end: { x: WIDTH - MARGIN, y }, thickness: 1.8, color: accent });
    y -= 2.6; page.drawLine({ start: { x: MARGIN, y }, end: { x: WIDTH - MARGIN, y }, thickness: 0.6, color: accent });
    y -= 12;
  } else if (panel) y -= PANEL_PAD + 16;
  else y -= 9;

  const width = WIDTH - MARGIN * 2;
  const heights = (b: Block, space: number): number => {
    const lh = size * (1 + 0.28 * space);
    if (b.kind === 'heading') return size * 1.12 + 13 * space;
    if (b.kind === 'grid') {
      const cols = b.columns!; const cw = width / cols.length;
      let h = b.labels ? lh + 3 : 0;
      for (let row = 0; row < Math.max(...cols.map(c => c.length)); row++) h += Math.max(...cols.map(c => Math.max(1, wrap(c[row] ?? '', regular, size, cw - 12).length))) * lh + 2 * space;
      return h + 3 * space;
    }
    const font = b.bold ? bold : b.italic ? italic : regular;
    const rightFont = rightStyle(theme).bold ? bold : regular;
    const rightWidth = b.right ? rightFont.widthOfTextAtSize(clean(b.right), size) + 18 : 0;
    return Math.max(1, wrap(b.text ?? '', font, size, width - (b.bullet ? 14 : 0) - rightWidth).length) * lh + (letter ? 9 : b.kind === 'job' ? 7 : 2) * space;
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
      if (headingStyle === 'banded') {
        // Tinted band with an accent bar, matching Word's shaded paragraph and left border.
        const [r, g, bl] = [0, 2, 4].map(offset => parseInt(tintOf(ACCENT_HEX[style.accent], 0.9, 0.1).slice(offset, offset + 2), 16) / 255);
        page.drawRectangle({ x: MARGIN - PANEL_PAD + 3, y: baseline - 3.5, width: WIDTH - 2 * MARGIN + 2 * PANEL_PAD - 3, height: headingSize + 6, color: rgb(r, g, bl) });
        page.drawRectangle({ x: MARGIN - PANEL_PAD, y: baseline - 3.5, width: 3, height: headingSize + 6, color: accent });
      }
      page.pushOperators(beginText(), setCharacterSpacing(tracking), endText());
      draw(b.text!, MARGIN, baseline, bold, headingSize, theme === 'navy' || headingStyle === 'banded' || headingStyle === 'leader-rule' ? accent : black);
      page.pushOperators(beginText(), setCharacterSpacing(0), endText());
      if (headingStyle === 'leader-rule') {
        // Hairline from the end of the heading to the margin, like Word's tab leader.
        const end = MARGIN + bold.widthOfTextAtSize(b.text!, headingSize) + tracking * (b.text!.length - 1) + 8;
        if (end < WIDTH - MARGIN) page.drawLine({ start: { x: end, y: baseline + 1 }, end: { x: WIDTH - MARGIN, y: baseline + 1 }, thickness: 0.6, color: accent });
      }
      y -= headingSize + 4 * space;
      if (headingStyle !== 'banded' && headingStyle !== 'leader-rule') page.drawLine({ start: { x: MARGIN, y }, end: { x: headingStyle === 'short-underline' ? MARGIN + 30 : WIDTH - MARGIN, y }, thickness: theme === 'lead' ? 1.3 : 0.8, color: theme === 'plain' ? black : accent });
      y -= 2 * space;
    } else if (b.kind === 'grid') {
      const cols = b.columns!, cw = width / cols.length;
      if (b.labels) { b.labels.forEach((label, col) => draw(label, MARGIN + col * cw, y - size, bold, size)); y -= lh + 3; }
      for (let row = 0; row < Math.max(...cols.map(c => c.length)); row++) {
        const lines = cols.map(c => wrap(c[row] ?? '', regular, size, cw - 12));
        const rowHeight = Math.max(...lines.map(l => Math.max(1, l.length))) * lh + 2 * space;
        ensure(rowHeight);
        lines.forEach((ls, col) => ls.forEach((line, lineIndex) => draw(`${!b.labels && lineIndex === 0 ? '• ' : ''}${line}`, MARGIN + col * cw, y - size - lineIndex * lh, regular, size)));
        y -= rowHeight;
      }
      y -= 3 * space;
    } else {
      const font = b.bold ? bold : b.italic ? italic : regular;
      if (b.kind === 'job') y -= 5 * space;
      const right = rightStyle(theme), rightFont = right.bold ? bold : regular;
      const rightWidth = b.right ? rightFont.widthOfTextAtSize(clean(b.right), size) + 18 : 0;
      const lines = wrap(b.text ?? '', font, size, width - (b.bullet ? 14 : 0) - rightWidth);
      const rightY = y - size;
      for (let i = 0; i < lines.length; i++) {
        ensure(lh);
        if (b.bullet && i === 0) draw('•', MARGIN + 2, y - size, regular, size);
        if (b.locked) drawLockedLine(page, lines[i], { x: MARGIN + (b.bullet ? 14 : 0), baseline: y - size, font, size });
        else draw(lines[i], MARGIN + (b.bullet ? 14 : 0), y - size, font, size, b.accent ? accent : b.muted ? muted : black);
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
  const usableTwips = (WIDTH - MARGIN * 2) * 20;
  const contactText = contact({ ...input.basics, targetTitle: title });
  if (theme === 'premier') {
    children.push(new Paragraph({ spacing: { after: 30 }, children: [run(input.basics.fullName, { bold: true, size: 48 })] }),
      new Paragraph({ spacing: { after: 30 }, children: [run(clean(title).toUpperCase(), { bold: true, size: 22, color: accent, characterSpacing: 16 })] }),
      new Paragraph({ border: { bottom: { color: accent, size: 18, style: BorderStyle.THICK_THIN_SMALL_GAP, space: 6 } }, spacing: { after: 220 }, children: [run(contactText, { color: MUTED_HEX })] }));
  } else if (theme === 'blueprint') {
    // One solid panel: identical shading and borders on consecutive paragraphs merge
    // into one box; the border spacing is the panel padding outside the text margin.
    const edge = { color: accent, size: 4, style: BorderStyle.SINGLE, space: PANEL_PAD };
    const panel = { shading: { fill: accent }, border: { top: edge, bottom: edge, left: edge, right: edge } };
    children.push(new Paragraph({ ...panel, spacing: { after: 30 }, children: [run(input.basics.fullName, { bold: true, size: 48, color: 'FFFFFF' })] }),
      new Paragraph({ ...panel, spacing: { after: 30 }, children: [run(title, { bold: true, size: 24, color: 'FFFFFF' })] }),
      new Paragraph({ ...panel, spacing: { after: 0 }, children: [run(contactText, { color: 'FFFFFF' })] }),
      new Paragraph({ spacing: { after: 200 }, children: [] }));
  } else {
    if (theme === 'navy') children.push(new Paragraph({ border: { top: border(accent, 48) }, spacing: { after: 160 }, children: [] }));
    children.push(new Paragraph({ alignment, shading: shade, spacing: { after: 30 }, children: [run(theme === 'plain' ? input.basics.fullName.toUpperCase() : input.basics.fullName, { bold: true, size: 48, characterSpacing: theme === 'plain' ? 26 : undefined, color: theme === 'lead' ? accent : '111111' })] }),
      new Paragraph({ alignment, shading: shade, spacing: { after: 30 }, children: [run(title, { size: 24, bold: theme !== 'plain', color: theme === 'navy' ? accent : '111111' })] }),
      new Paragraph({ alignment, shading: shade, border: theme === 'navy' ? undefined : { bottom: border(accent, theme === 'lead' ? 16 : 8) }, spacing: { after: 140 }, children: [run(contactText)] }));
  }
  const headingStyle = RESUME_TEMPLATES[theme].headings;
  // Ink dates keep the document default colour, so existing templates' DOCX is unchanged.
  const right = rightStyle(theme), rightColor = right.tone === 'accent' ? accent : MUTED_HEX;
  for (const b of blocks) {
    if (b.kind === 'heading') {
      const headingRun = (text: string) => run(text, { bold: true, size: Math.round(size * 1.12), color: theme === 'navy' || headingStyle === 'banded' || headingStyle === 'leader-rule' ? accent : '111111', characterSpacing: theme === 'navy' ? 24 : 12 });
      if (headingStyle === 'leader-rule') {
        // Heading then a tab whose underscore leader rules out to the margin.
        children.push(new Paragraph({ keepNext: true, keepLines: true, tabStops: [{ type: TabStopType.RIGHT, position: usableTwips, leader: LeaderType.UNDERSCORE }],
          spacing: { before: 200 * space, after: 80 * space }, children: [headingRun(b.text!), new TextRun({ text: '\t', font, size: Math.round(size * 1.12), color: accent })] }));
        continue;
      }
      if (headingStyle === 'banded') {
        children.push(new Paragraph({ keepNext: true, keepLines: true, shading: { fill: tintOf(accent, 0.9, 0.1) },
          // The tint-coloured right border only carries the band out to the panel edge.
          border: { left: { color: accent, size: 24, style: BorderStyle.SINGLE, space: PANEL_PAD - 3 }, right: { color: tintOf(accent, 0.9, 0.1), size: 4, style: BorderStyle.SINGLE, space: PANEL_PAD } },
          spacing: { before: 200 * space, after: 80 * space }, children: [headingRun(b.text!)] }));
        continue;
      }
      children.push(new Paragraph({ keepNext: true, keepLines: true,
        border: theme === 'navy' ? undefined : { bottom: border(theme === 'plain' ? '111111' : accent, theme === 'lead' ? 8 : 4) },
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
      children.push(new Paragraph({ keepNext: b.keepNext, keepLines: true, numbering: b.bullet ? { reference: 'resume-bullets', level: 0 } : undefined,
        tabStops: b.right ? [{ type: TabStopType.RIGHT, position: usableTwips }] : undefined,
        spacing: { before: b.kind === 'job' ? 100 * space : 0, after: (letter ? 170 : 40) * space, line: Math.round(240 * (1 + 0.15 * space)) },
        children: [run(b.text!, { bold: b.bold, italics: b.italic, color: b.accent ? accent : b.muted ? MUTED_HEX : '111111' }), ...(b.right ? [new TextRun({ text: `\t${clean(b.right)}`, font, size, bold: right.bold, color: right.tone === 'ink' ? undefined : rightColor })] : [])] }));
    }
  }
  return new Uint8Array(await Packer.toBuffer(new Document({ numbering: { config: [{ reference: 'resume-bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { run: { font, size }, paragraph: { indent: { left: 280, hanging: 240 } } } }] }] }, styles: { default: { document: { run: { font, size, color: '111111' } } } }, sections: [{ properties: { page: { size: { width: WIDTH * 20, height: HEIGHT * 20 }, margin: { top: MARGIN * 20, right: MARGIN * 20, bottom: MARGIN * 20, left: MARGIN * 20 } } }, children }] })));
}
