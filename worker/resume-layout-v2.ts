import { subsetTrueType } from './resume-font-subset';
import { AlignmentType, BorderStyle, Document, Packer, Paragraph, TextRun, TabStopType, LevelFormat } from 'docx';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, degrees, beginText, endText, setCharacterSpacing, type PDFFont, type PDFPage } from 'pdf-lib';
import type { GeneratedResume, ResumeTheme } from './resume-documents';
import type { GeneratedCoverLetter } from './cover-letter-documents';
import { decodeFont } from './roboto-fonts';
import { RESUME_WATERMARK_LOGO_BASE64 } from './resume-watermark-logo';
import { TEMPLATE_FONTS } from './resume-template-fonts';
import { ACCENT_HEX, BODY_SIZES, FONT_FAMILIES, RESUME_TEMPLATES, SPACE_FACTORS, TRACK_HEADINGS, skillGroups, type ResumeStyle } from './resume-templates';

const WIDTH = 612, HEIGHT = 792, MARGIN = 48;
const clean = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const color = (hex: string) => rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);
const contact = (b: GeneratedResume['basics']) => [b.location, b.phone, b.email].map(clean).filter(Boolean).join(' | ');
type Block = { kind: 'heading' | 'text' | 'grid' | 'job' | 'education'; text?: string; bold?: boolean; italic?: boolean; accent?: boolean; right?: string; columns?: string[][]; labels?: string[]; bullet?: boolean; keepNext?: boolean };
function blocksForResume(resume: GeneratedResume, theme: ResumeTheme, track: ResumeTheme): Block[] {
  const blocks: Block[] = [], headings = TRACK_HEADINGS[track];
  const heading = (text: string) => blocks.push({ kind: 'heading', text, keepNext: true });
  for (const section of RESUME_TEMPLATES[theme].sections) {
    switch (section) {
      case 'summary': if (clean(resume.summary)) { heading(headings.summary); blocks.push({ kind: 'text', text: resume.summary }); } break;
      case 'skills': {
        const skills = resume.skills.map(clean).filter(Boolean);
        if (!skills.length) break;
        heading(headings.skills);
        const grouped = theme === 'navy' ? skillGroups(skills) : null;
        const count = RESUME_TEMPLATES[theme].skillsColumns;
        // Row-major order in both formats for predictable ATS extraction.
        const columns = grouped?.columns ?? Array.from({ length: count }, (_, col) => skills.filter((_, i) => i % count === col));
        blocks.push({ kind: 'grid', columns, labels: grouped?.labels });
        break;
      }
      case 'certifications': if (resume.certifications.length) {
        heading(theme === 'lead' ? 'CREDENTIALS' : theme === 'navy' ? 'CERTIFICATIONS' : 'CERTIFICATIONS & LICENSES');
        blocks.push({ kind: 'text', bold: true, text: resume.certifications.map(c => [c.name, c.issuer, c.year].map(clean).filter(Boolean).join(' — ')).join(theme === 'lead' ? ' | ' : '   ·   ') });
      } break;
      case 'experience': if (resume.experience.length) {
        heading(track === 'lead' ? 'PROFESSIONAL EXPERIENCE' : 'WORK EXPERIENCE');
        for (const job of resume.experience) {
          blocks.push({ kind: 'job', text: job.jobTitle, bold: true, right: [job.startDate, job.endDate].map(clean).filter(Boolean).join(' – '), keepNext: true });
          const org = [job.employer, job.location].map(clean).filter(Boolean).join(' — ');
          if (org) blocks.push({ kind: 'text', text: org, bold: theme === 'lead', italic: theme === 'plain', accent: theme === 'lead', keepNext: job.bullets.length > 0 });
          // No inferred scope, duties, or numbers are introduced by presentation.
          if (theme === 'lead' && clean(job.scope)) blocks.push({ kind: 'text', text: `Scope: ${clean(job.scope)}`, italic: true, keepNext: job.bullets.length > 0 });
          for (const item of job.bullets) blocks.push({ kind: 'text', text: item, bullet: true });
        }
      } break;
      case 'education': if (resume.education.length) {
        heading('EDUCATION & TRAINING');
        for (const ed of resume.education) blocks.push({ kind: 'education', text: [ed.credential, ed.institution, ed.location].map(clean).filter(Boolean).join(' — '), right: ed.year });
      } break;
      case 'additional': if (resume.additionalInformation.length) {
        heading(headings.additional);
        for (const text of resume.additionalInformation) blocks.push({ kind: 'text', text, bullet: true });
      } break;
    }
  }
  return blocks;
}
function blocksForLetter(letter: GeneratedCoverLetter): Block[] {
  return [letter.date, letter.hiringManager, letter.companyName, letter.targetJobTitle ? `Re: ${letter.targetJobTitle}` : '', letter.salutation, ...letter.paragraphs, letter.closing, letter.basics.fullName].filter(Boolean).map(text => ({ kind: 'text', text }));
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
export async function renderPdfV2(input: GeneratedResume | GeneratedCoverLetter, theme: ResumeTheme, style: ResumeStyle, watermarked: boolean, track: ResumeTheme = theme, letter = false): Promise<Uint8Array> {
  const document = await PDFDocument.create(); document.registerFontkit(fontkit);
  const source = TEMPLATE_FONTS[FONT_FAMILIES[style.font].pdf];
  const usedText = JSON.stringify(input) + JSON.stringify(TRACK_HEADINGS) + 'Systems & equipment Tools & methods CERTIFICATIONS & LICENSES CREDENTIALS CERTIFICATIONS EDUCATION & TRAINING WORK EXPERIENCE PROFESSIONAL EXPERIENCE Scope: PREVIEW — PAY $9.99 TO REMOVE WATERMARK • · – | ' + input.basics.fullName.toUpperCase();
  const regular = await document.embedFont(subsetTrueType(decodeFont(source.regular), usedText), { subset: false, features: { liga: false, clig: false, calt: false } });
  const bold = await document.embedFont(subsetTrueType(decodeFont(source.bold), usedText), { subset: false, features: { liga: false, clig: false, calt: false } });
  const italic = await document.embedFont(subsetTrueType(decodeFont(source.italic), usedText), { subset: false, features: { liga: false, clig: false, calt: false } });
  const accent = color(ACCENT_HEX[style.accent]), black = color('111111');
  const size = BODY_SIZES[style.textSize], factor = SPACE_FACTORS[style.spacing];
  const blocks = letter ? blocksForLetter(input as GeneratedCoverLetter) : blocksForResume(input as GeneratedResume, theme, track);
  let page: PDFPage = document.addPage([WIDTH, HEIGHT]), y = HEIGHT - MARGIN;
  const newPage = () => { page = document.addPage([WIDTH, HEIGHT]); y = HEIGHT - MARGIN; };
  const ensure = (height: number) => { if (y - height < MARGIN) newPage(); };
  const draw = (text: string, x: number, baseline: number, font: PDFFont, pointSize: number, c = black) => page.drawText(text, { x, y: baseline, font, size: pointSize, color: c });
  const basics = input.basics;
  const title = letter ? (input as GeneratedCoverLetter).targetJobTitle : (input as GeneratedResume).basics.targetTitle;
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
  for (const [text, font, pointSize, c] of [[name, bold, 24, theme === 'lead' ? accent : black], [title, theme === 'plain' ? regular : bold, 12, theme === 'navy' ? accent : black], [contact({ ...basics, targetTitle: title }), regular, size, black]] as const) {
    const tracking = centered && pointSize === 24 ? 1.3 : 0;
    for (const line of wrap(text, font, pointSize, WIDTH - 2 * MARGIN - tracking * text.length)) {
      page.pushOperators(beginText(), setCharacterSpacing(tracking), endText());
      draw(line, centered ? (WIDTH - font.widthOfTextAtSize(line, pointSize) - tracking * (line.length - 1)) / 2 : MARGIN, y - pointSize, font, pointSize, c);
      page.pushOperators(beginText(), setCharacterSpacing(0), endText());
      y -= pointSize * 1.3;
    }
  }
  if (centered) { y -= 7; page.drawLine({ start: { x: MARGIN, y }, end: { x: WIDTH - MARGIN, y }, thickness: 1.5, color: accent }); y -= 5; }
  if (headerStyle === 'tinted-band') y = Math.min(y - 8, HEIGHT - 119);
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
    const rightFont = theme === 'lead' ? bold : regular;
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
      page.pushOperators(beginText(), setCharacterSpacing(theme === 'navy' ? 1.2 : theme === 'plain' ? 0.7 : 0.4), endText());
      draw(b.text!, MARGIN, y - size * 1.12, bold, size * 1.12, theme === 'navy' ? accent : black);
      page.pushOperators(beginText(), setCharacterSpacing(0), endText());
      y -= size * 1.12 + 4 * space;
      page.drawLine({ start: { x: MARGIN, y }, end: { x: RESUME_TEMPLATES[theme].headings === 'short-underline' ? MARGIN + 30 : WIDTH - MARGIN, y }, thickness: theme === 'lead' ? 1.3 : 0.8, color: theme === 'plain' ? black : accent });
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
      const rightFont = theme === 'lead' ? bold : regular;
      const rightWidth = b.right ? rightFont.widthOfTextAtSize(clean(b.right), size) + 18 : 0;
      const lines = wrap(b.text ?? '', font, size, width - (b.bullet ? 14 : 0) - rightWidth);
      const rightY = y - size;
      for (let i = 0; i < lines.length; i++) {
        ensure(lh);
        if (b.bullet && i === 0) draw('•', MARGIN + 2, y - size, regular, size);
        draw(lines[i], MARGIN + (b.bullet ? 14 : 0), y - size, font, size, b.accent ? accent : black);
        if (i === 0 && b.right) draw(clean(b.right), WIDTH - MARGIN - rightWidth + 18, rightY, rightFont, size);
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

export async function renderDocxV2(input: GeneratedResume | GeneratedCoverLetter, theme: ResumeTheme, style: ResumeStyle, track: ResumeTheme = theme, letter = false): Promise<Uint8Array> {
  const size = BODY_SIZES[style.textSize] * 2, space = SPACE_FACTORS[style.spacing];
  const font = FONT_FAMILIES[style.font].docx, accent = ACCENT_HEX[style.accent];
  const blocks = letter ? blocksForLetter(input as GeneratedCoverLetter) : blocksForResume(input as GeneratedResume, theme, track);
  const run = (text: string, opts: { bold?: boolean; italics?: boolean; color?: string; size?: number; characterSpacing?: number } = {}) => new TextRun({ text: clean(text), font, size, ...opts });
  const border = (color: string, thickness: number) => ({ color, size: thickness, style: BorderStyle.SINGLE });
  const alignment = theme === 'plain' ? AlignmentType.CENTER : AlignmentType.LEFT;
  const tintHex = [0, 2, 4].map(offset => Math.round(255 * 0.93 + parseInt(accent.slice(offset, offset + 2), 16) * 0.07).toString(16).padStart(2, '0')).join('').toUpperCase();
  const shade = theme === 'lead' ? { fill: tintHex } : undefined;
  const title = letter ? (input as GeneratedCoverLetter).targetJobTitle : (input as GeneratedResume).basics.targetTitle;
  const children: Paragraph[] = [];
  if (theme === 'navy') children.push(new Paragraph({ border: { top: border(accent, 48) }, spacing: { after: 160 }, children: [] }));
  children.push(new Paragraph({ alignment, shading: shade, spacing: { after: 30 }, children: [run(theme === 'plain' ? input.basics.fullName.toUpperCase() : input.basics.fullName, { bold: true, size: 48, characterSpacing: theme === 'plain' ? 26 : undefined, color: theme === 'lead' ? accent : '111111' })] }),
    new Paragraph({ alignment, shading: shade, spacing: { after: 30 }, children: [run(title, { size: 24, bold: theme !== 'plain', color: theme === 'navy' ? accent : '111111' })] }),
    new Paragraph({ alignment, shading: shade, border: theme === 'navy' ? undefined : { bottom: border(accent, theme === 'lead' ? 16 : 8) }, spacing: { after: 140 }, children: [run(contact({ ...input.basics, targetTitle: title }))] }));
  const usableTwips = (WIDTH - MARGIN * 2) * 20;
  for (const b of blocks) {
    if (b.kind === 'heading') {
      children.push(new Paragraph({ keepNext: true, keepLines: true,
        border: theme === 'navy' ? undefined : { bottom: border(theme === 'plain' ? '111111' : accent, theme === 'lead' ? 8 : 4) },
        spacing: { before: 180 * space, after: 60 * space }, children: [run(b.text!, { bold: true, size: Math.round(size * 1.12), color: theme === 'navy' ? accent : '111111', characterSpacing: theme === 'navy' ? 24 : 12 })] }));
      if (theme === 'navy') children.push(new Paragraph({ keepNext: true, border: { bottom: border(accent, 8) }, indent: { right: usableTwips - 600 }, spacing: { before: 0, after: 100, line: 20 }, children: [new TextRun({ text: '', size: 2 })] }));
    } else if (b.kind === 'grid') {
      const cols = b.columns!, count = cols.length;
      const tabs = Array.from({ length: count - 1 }, (_, i) => ({ type: TabStopType.LEFT, position: Math.round(usableTwips / count * (i + 1)) }));
      if (b.labels) children.push(new Paragraph({ keepNext: true, tabStops: tabs, children: b.labels.map((label, i) => new TextRun({ text: `${i ? '\t' : ''}${label}`, font, size, bold: true })) }));
      for (let row = 0; row < Math.max(...cols.map(c => c.length)); row++) {
        // Wrap each cell explicitly so long skills cannot cross tab boundaries.
        const maxChars = Math.max(16, Math.floor(usableTwips / count / (size * 5.8)));
        const lines = cols.map(col => {
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
        children: [run(b.text!, { bold: b.bold, italics: b.italic, color: b.accent ? accent : '111111' }), ...(b.right ? [new TextRun({ text: `\t${clean(b.right)}`, font, size, bold: theme === 'lead' })] : [])] }));
    }
  }
  return new Uint8Array(await Packer.toBuffer(new Document({ numbering: { config: [{ reference: 'resume-bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { run: { font, size }, paragraph: { indent: { left: 280, hanging: 240 } } } }] }] }, styles: { default: { document: { run: { font, size, color: '111111' } } } }, sections: [{ properties: { page: { size: { width: WIDTH * 20, height: HEIGHT * 20 }, margin: { top: MARGIN * 20, right: MARGIN * 20, bottom: MARGIN * 20, left: MARGIN * 20 } } }, children }] })));
}
