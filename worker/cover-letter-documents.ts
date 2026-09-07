import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import {
  decodeFont,
  ROBOTO_BOLD_BASE64,
  ROBOTO_REGULAR_BASE64,
} from "./roboto-fonts";
import type { ResumeTheme } from "./resume-documents";

export type GeneratedCoverLetter = {
  basics: {
    fullName: string;
    location?: string;
    phone?: string;
    email?: string;
  };
  date: string;
  companyName?: string;
  hiringManager?: string;
  targetJobTitle: string;
  salutation: string;
  paragraphs: string[];
  closing: string;
};

const BRAND_BLACK = "111111";
const BRAND_RED = "D71920";
const BRAND_BLACK_RGB = rgb(0x11 / 255, 0x11 / 255, 0x11 / 255);
const BRAND_RED_RGB = rgb(0xd7 / 255, 0x19 / 255, 0x20 / 255);
const PDF_WIDTH = 612;
const PDF_HEIGHT = 792;
const PDF_MARGIN = 54;

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function accentHex(theme: ResumeTheme): string {
  return theme === "navy" ? BRAND_RED : BRAND_BLACK;
}

function accentRgb(theme: ResumeTheme): ReturnType<typeof rgb> {
  return theme === "navy" ? BRAND_RED_RGB : BRAND_BLACK_RGB;
}

export async function createCoverLetterDocx(
  letter: GeneratedCoverLetter,
  theme: ResumeTheme = "plain",
): Promise<Uint8Array> {
  const contactLine = [letter.basics.location, letter.basics.phone, letter.basics.email]
    .map(clean)
    .filter(Boolean)
    .join("  |  ");
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: clean(letter.basics.fullName), bold: true, size: 38, font: "Arial" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { bottom: { color: accentHex(theme), size: 8, style: BorderStyle.SINGLE } },
      spacing: { after: 260 },
      children: [new TextRun({ text: contactLine, size: 20, font: "Arial" })],
    }),
    new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: clean(letter.date), size: 21, font: "Arial" })] }),
  ];

  if (clean(letter.hiringManager)) {
    children.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: clean(letter.hiringManager), size: 21, font: "Arial" })] }));
  }
  if (clean(letter.companyName)) {
    children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: clean(letter.companyName), size: 21, font: "Arial" })] }));
  }
  if (clean(letter.targetJobTitle)) {
    children.push(new Paragraph({
      spacing: { after: 180 },
      children: [new TextRun({ text: `Re: ${clean(letter.targetJobTitle)}`, bold: true, size: 21, font: "Arial", color: theme === "navy" ? BRAND_RED : undefined })],
    }));
  }

  children.push(new Paragraph({ spacing: { after: 150 }, children: [new TextRun({ text: clean(letter.salutation), size: 21, font: "Arial" })] }));
  for (const paragraph of letter.paragraphs) {
    children.push(new Paragraph({
      spacing: { after: 170, line: 300 },
      children: [new TextRun({ text: clean(paragraph), size: 21, font: "Arial" })],
    }));
  }
  children.push(
    new Paragraph({ spacing: { before: 80, after: 90 }, children: [new TextRun({ text: clean(letter.closing), size: 21, font: "Arial" })] }),
    new Paragraph({ children: [new TextRun({ text: clean(letter.basics.fullName), bold: true, size: 21, font: "Arial" })] }),
  );

  const document = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 21, color: BRAND_BLACK },
          paragraph: { spacing: { line: 280 } },
        },
      },
    },
    sections: [{
      properties: { page: { margin: { top: 1008, right: 1008, bottom: 1008, left: 1008 } } },
      children,
    }],
  });
  return new Uint8Array(await Packer.toBuffer(document));
}

type PdfWriter = {
  document: PDFDocument;
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
  y: number;
  theme: ResumeTheme;
};

function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = clean(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > width) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function addPage(writer: PdfWriter): void {
  writer.page = writer.document.addPage([PDF_WIDTH, PDF_HEIGHT]);
  writer.y = PDF_HEIGHT - PDF_MARGIN;
}

function ensureSpace(writer: PdfWriter, height: number): void {
  if (writer.y - height < PDF_MARGIN) addPage(writer);
}

function writeLines(
  writer: PdfWriter,
  text: string,
  options: { font?: PDFFont; size?: number; lineHeight?: number; after?: number; color?: ReturnType<typeof rgb> } = {},
): void {
  const font = options.font ?? writer.regular;
  const size = options.size ?? 10.8;
  const lineHeight = options.lineHeight ?? 14.2;
  const after = options.after ?? 8;
  const lines = wrapText(text, font, size, PDF_WIDTH - PDF_MARGIN * 2);
  ensureSpace(writer, Math.max(1, lines.length) * lineHeight + after);
  for (const line of lines) {
    writer.page.drawText(line, {
      x: PDF_MARGIN,
      y: writer.y - size,
      size,
      font,
      color: options.color ?? rgb(0.07, 0.07, 0.07),
    });
    writer.y -= lineHeight;
  }
  writer.y -= after;
}

function writeCentered(writer: PdfWriter, text: string, font: PDFFont, size: number, after: number): void {
  const value = clean(text);
  ensureSpace(writer, size * 1.35 + after);
  const width = font.widthOfTextAtSize(value, size);
  writer.page.drawText(value, {
    x: Math.max(PDF_MARGIN, (PDF_WIDTH - width) / 2),
    y: writer.y - size,
    size,
    font,
    color: rgb(0.05, 0.05, 0.05),
  });
  writer.y -= size * 1.35 + after;
}

export async function createCoverLetterPdf(
  letter: GeneratedCoverLetter,
  theme: ResumeTheme = "plain",
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const writer: PdfWriter = {
    document,
    page: document.addPage([PDF_WIDTH, PDF_HEIGHT]),
    regular: await document.embedFont(decodeFont(ROBOTO_REGULAR_BASE64), { subset: true }),
    bold: await document.embedFont(decodeFont(ROBOTO_BOLD_BASE64), { subset: true }),
    y: PDF_HEIGHT - PDF_MARGIN,
    theme,
  };
  const contactLine = [letter.basics.location, letter.basics.phone, letter.basics.email]
    .map(clean)
    .filter(Boolean)
    .join("  |  ");

  writeCentered(writer, letter.basics.fullName, writer.bold, 20, 2);
  writeCentered(writer, contactLine, writer.regular, 9.8, 8);
  writer.page.drawLine({
    start: { x: PDF_MARGIN, y: writer.y },
    end: { x: PDF_WIDTH - PDF_MARGIN, y: writer.y },
    thickness: 1,
    color: accentRgb(theme),
  });
  writer.y -= 24;

  writeLines(writer, letter.date, { after: 8 });
  if (clean(letter.hiringManager)) writeLines(writer, letter.hiringManager!, { after: 1 });
  if (clean(letter.companyName)) writeLines(writer, letter.companyName!, { after: 10 });
  writeLines(writer, `Re: ${letter.targetJobTitle}`, {
    font: writer.bold,
    color: theme === "navy" ? BRAND_RED_RGB : BRAND_BLACK_RGB,
    after: 14,
  });
  writeLines(writer, letter.salutation, { after: 10 });
  for (const paragraph of letter.paragraphs) {
    writeLines(writer, paragraph, { lineHeight: 14.6, after: 11 });
  }
  writer.y -= 4;
  writeLines(writer, letter.closing, { after: 8 });
  writeLines(writer, letter.basics.fullName, { font: writer.bold, after: 0 });

  return document.save();
}
