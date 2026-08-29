import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import fontkit from "@pdf-lib/fontkit";
import { degrees, PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import {
  decodeFont,
  ROBOTO_BOLD_BASE64,
  ROBOTO_ITALIC_BASE64,
  ROBOTO_REGULAR_BASE64,
} from "./roboto-fonts";
import { RESUME_WATERMARK_LOGO_BASE64 } from "./resume-watermark-logo";

export type ResumeCertification = {
  name: string;
  issuer?: string;
  year?: string;
};

export type ResumeExperience = {
  jobTitle: string;
  employer?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bullets: string[];
};

export type ResumeEducation = {
  credential: string;
  institution: string;
  location?: string;
  year?: string;
};

export type GeneratedResume = {
  basics: {
    fullName: string;
    targetTitle: string;
    location?: string;
    phone?: string;
    email?: string;
  };
  summary: string;
  skills: string[];
  certifications: ResumeCertification[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  additionalInformation: string[];
};

// Two selectable templates: "plain" is the strict ATS-safe layout (no
// background, single color used only for divider rules). "navy" adds a
// colored header band for a more designed look, trading some ATS caution
// for visual polish — still real, selectable text throughout.
export type ResumeTheme = "plain" | "navy";

const BRAND_RED = "D71920";
const BRAND_RED_RGB = rgb(0xd7 / 255, 0x19 / 255, 0x20 / 255);
const BRAND_NAVY = "102F76";
const BRAND_NAVY_RGB = rgb(0x10 / 255, 0x2f / 255, 0x76 / 255);
const BRAND_GOLD = "F5B942";
const BRAND_GOLD_RGB = rgb(0xf5 / 255, 0xb9 / 255, 0x42 / 255);

const SECTION_BORDER = {
  bottom: { color: BRAND_RED, size: 6, style: BorderStyle.SINGLE },
};

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function sectionHeading(text: string, theme: ResumeTheme): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    border: SECTION_BORDER,
    spacing: { before: 220, after: 80 },
    children: [new TextRun({
      text,
      bold: true,
      size: 24,
      font: "Arial",
      color: theme === "navy" ? BRAND_NAVY : undefined,
    })],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text: clean(text), size: 21, font: "Arial" })],
  });
}

function certificationBullet(certification: ResumeCertification): Paragraph {
  const rest = [clean(certification.issuer), clean(certification.year)].filter(Boolean).join(" — ");
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [
      new TextRun({ text: clean(certification.name), bold: true, size: 21, font: "Arial" }),
      ...(rest ? [new TextRun({ text: ` — ${rest}`, size: 21, font: "Arial" })] : []),
    ],
  });
}

function headerParagraphs(resume: GeneratedResume, contactLine: string, theme: ResumeTheme): Paragraph[] {
  if (theme !== "navy") {
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [new TextRun({ text: clean(resume.basics.fullName), bold: true, size: 42, font: "Arial" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [new TextRun({ text: clean(resume.basics.targetTitle), size: 24, font: "Arial" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [new TextRun({ text: contactLine, size: 20, font: "Arial" })],
      }),
    ];
  }
  const navyBand = { fill: BRAND_NAVY, type: "clear" as const, color: "auto" };
  return [
    new Paragraph({
      shading: navyBand,
      spacing: { before: 160, after: 40 },
      children: [new TextRun({ text: clean(resume.basics.fullName), bold: true, size: 42, font: "Arial", color: "FFFFFF" })],
    }),
    new Paragraph({
      shading: navyBand,
      spacing: { after: 40 },
      children: [new TextRun({ text: clean(resume.basics.targetTitle), size: 24, font: "Arial", color: BRAND_GOLD })],
    }),
    new Paragraph({
      shading: navyBand,
      border: { bottom: { color: BRAND_GOLD, size: 12, style: BorderStyle.SINGLE, space: 10 } },
      spacing: { after: 200 },
      children: [new TextRun({ text: contactLine, size: 20, font: "Arial", color: "FFFFFF" })],
    }),
  ];
}

export async function createResumeDocx(resume: GeneratedResume, theme: ResumeTheme = "plain"): Promise<Uint8Array> {
  const contactLine = [
    clean(resume.basics.location),
    clean(resume.basics.phone),
    clean(resume.basics.email),
  ].filter(Boolean).join("  |  ");

  const children: Paragraph[] = [
    ...headerParagraphs(resume, contactLine, theme),
    sectionHeading("PROFESSIONAL SUMMARY", theme),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: clean(resume.summary), size: 21, font: "Arial" })],
    }),
  ];

  if (resume.certifications.length) {
    children.push(sectionHeading("CERTIFICATIONS & LICENSES", theme));
    for (const certification of resume.certifications) {
      children.push(certificationBullet(certification));
    }
  }

  children.push(
    sectionHeading("CORE SKILLS", theme),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: resume.skills.map(clean).filter(Boolean).join("  •  "), size: 21, font: "Arial" })],
    }),
  );

  if (resume.experience.length) {
    children.push(sectionHeading("WORK EXPERIENCE", theme));
    for (const job of resume.experience) {
      const dates = [clean(job.startDate), clean(job.endDate)].filter(Boolean).join(" – ");
      const organizationLine = [clean(job.employer), clean(job.location)].filter(Boolean).join(" — ");
      children.push(new Paragraph({
        keepNext: true,
        spacing: { before: 80, after: 20 },
        children: [
          new TextRun({ text: clean(job.jobTitle), bold: true, size: 22, font: "Arial" }),
          ...(dates ? [new TextRun({ text: `  |  ${dates}`, size: 21, font: "Arial" })] : []),
        ],
      }));
      if (organizationLine) {
        children.push(new Paragraph({
          keepNext: true,
          spacing: { after: 30 },
          children: [new TextRun({
            text: organizationLine,
            italics: true,
            size: 21,
            font: "Arial",
          })],
        }));
      }
      for (const item of job.bullets) children.push(bullet(item));
    }
  }

  if (resume.education.length) {
    children.push(sectionHeading("EDUCATION & TRAINING", theme));
    for (const education of resume.education) {
      children.push(new Paragraph({
        keepNext: true,
        spacing: { before: 60, after: 20 },
        children: [
          new TextRun({ text: clean(education.credential), bold: true, size: 22, font: "Arial" }),
          ...(education.year ? [new TextRun({ text: `  |  ${clean(education.year)}`, size: 21, font: "Arial" })] : []),
        ],
      }));
      children.push(new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({
          text: [clean(education.institution), clean(education.location)].filter(Boolean).join(" — "),
          italics: true,
          size: 21,
          font: "Arial",
        })],
      }));
    }
  }

  if (resume.additionalInformation.length) {
    children.push(sectionHeading("ADDITIONAL INFORMATION", theme));
    for (const item of resume.additionalInformation) children.push(bullet(item));
  }

  const document = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 21, color: "111111" },
          paragraph: { spacing: { line: 260 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          // 0.7in margins (twentieths of a point: 1440 per inch) — within the 0.6-0.75in spec range.
          margin: { top: 1008, right: 1008, bottom: 1008, left: 1008 },
        },
      },
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
  italic: PDFFont;
  y: number;
  theme: ResumeTheme;
};

const PDF_MARGIN = 50;
const PDF_WIDTH = 612;
const PDF_HEIGHT = 792;
const ACCENT_BAR_WIDTH = 7;
const HEADER_BAND_HEIGHT = 108;

function themeSectionTitleColor(theme: ResumeTheme): ReturnType<typeof rgb> {
  return theme === "navy" ? BRAND_NAVY_RGB : rgb(0.03, 0.03, 0.03);
}

function themeBulletColor(theme: ResumeTheme): ReturnType<typeof rgb> {
  return theme === "navy" ? BRAND_RED_RGB : rgb(0, 0, 0);
}

function newPdfPage(writer: Pick<PdfWriter, "document" | "theme">): PDFPage {
  const page = writer.document.addPage([PDF_WIDTH, PDF_HEIGHT]);
  if (writer.theme === "navy") {
    page.drawRectangle({ x: 0, y: 0, width: ACCENT_BAR_WIDTH, height: PDF_HEIGHT, color: BRAND_RED_RGB });
  }
  return page;
}

function addPage(writer: PdfWriter): void {
  writer.page = newPdfPage(writer);
  writer.y = PDF_HEIGHT - PDF_MARGIN;
}

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

function ensureSpace(writer: PdfWriter, height: number): void {
  if (writer.y - height < PDF_MARGIN) addPage(writer);
}

function writeLines(
  writer: PdfWriter,
  text: string,
  options: { font?: PDFFont; size?: number; indent?: number; lineHeight?: number; after?: number; color?: ReturnType<typeof rgb> } = {},
): void {
  const font = options.font ?? writer.regular;
  const size = options.size ?? 10.5;
  const indent = options.indent ?? 0;
  const lineHeight = options.lineHeight ?? size * 1.25;
  const after = options.after ?? 4;
  const lines = wrapText(text, font, size, PDF_WIDTH - PDF_MARGIN * 2 - indent);
  ensureSpace(writer, Math.max(1, lines.length) * lineHeight + after);
  for (const line of lines) {
    writer.page.drawText(line, {
      x: PDF_MARGIN + indent,
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
  ensureSpace(writer, size * 1.3 + after);
  const width = font.widthOfTextAtSize(clean(text), size);
  writer.page.drawText(clean(text), {
    x: Math.max(PDF_MARGIN, (PDF_WIDTH - width) / 2),
    y: writer.y - size,
    size,
    font,
    color: rgb(0.05, 0.05, 0.05),
  });
  writer.y -= size * 1.3 + after;
}

function writeSection(writer: PdfWriter, title: string): void {
  ensureSpace(writer, 28);
  writer.y -= 7;
  writer.page.drawText(title, {
    x: PDF_MARGIN,
    y: writer.y - 12,
    size: 12,
    font: writer.bold,
    color: themeSectionTitleColor(writer.theme),
  });
  writer.y -= 16;
  writer.page.drawLine({
    start: { x: PDF_MARGIN, y: writer.y },
    end: { x: PDF_WIDTH - PDF_MARGIN, y: writer.y },
    thickness: 0.9,
    color: BRAND_RED_RGB,
  });
  writer.y -= 6;
}

function writeBullet(writer: PdfWriter, text: string): void {
  ensureSpace(writer, 16);
  writer.page.drawText("•", { x: PDF_MARGIN + 7, y: writer.y - 10, size: 10, font: writer.regular, color: themeBulletColor(writer.theme) });
  writeLines(writer, text, { indent: 20, size: 10.2, lineHeight: 12.5, after: 1.5 });
}

function wrapSegments(
  segments: { text: string; font: PDFFont }[],
  size: number,
  width: number,
): { text: string; font: PDFFont }[][] {
  const words: { text: string; font: PDFFont }[] = [];
  for (const segment of segments) {
    const cleaned = clean(segment.text);
    if (!cleaned) continue;
    for (const word of cleaned.split(" ")) words.push({ text: word, font: segment.font });
  }
  const lines: { text: string; font: PDFFont }[][] = [];
  let current: { text: string; font: PDFFont }[] = [];
  let currentWidth = 0;
  for (const word of words) {
    const spaceWidth = current.length ? current[current.length - 1].font.widthOfTextAtSize(" ", size) : 0;
    const wordWidth = word.font.widthOfTextAtSize(word.text, size);
    if (current.length && currentWidth + spaceWidth + wordWidth > width) {
      lines.push(current);
      current = [word];
      currentWidth = wordWidth;
    } else {
      current.push(word);
      currentWidth += spaceWidth + wordWidth;
    }
  }
  if (current.length) lines.push(current);
  return lines;
}

function writeCertificationBullet(writer: PdfWriter, certification: ResumeCertification): void {
  const size = 10.2;
  const indent = 20;
  const lineHeight = 12.5;
  const rest = [clean(certification.issuer), clean(certification.year)].filter(Boolean).join(" — ");
  const segments = [
    { text: clean(certification.name), font: writer.bold },
    ...(rest ? [{ text: ` — ${rest}`, font: writer.regular }] : []),
  ];
  const lines = wrapSegments(segments, size, PDF_WIDTH - PDF_MARGIN * 2 - indent);
  ensureSpace(writer, Math.max(1, lines.length) * lineHeight + 1.5);
  writer.page.drawText("•", { x: PDF_MARGIN + 7, y: writer.y - 10, size: 10, font: writer.regular, color: themeBulletColor(writer.theme) });
  for (const line of lines) {
    let x = PDF_MARGIN + indent;
    for (const word of line) {
      writer.page.drawText(word.text, { x, y: writer.y - size, size, font: word.font, color: rgb(0.07, 0.07, 0.07) });
      x += word.font.widthOfTextAtSize(`${word.text} `, size);
    }
    writer.y -= lineHeight;
  }
  writer.y -= 1.5;
}

function drawHeaderBand(writer: PdfWriter, resume: GeneratedResume): void {
  const contentLeft = PDF_MARGIN;
  writer.page.drawRectangle({ x: 0, y: PDF_HEIGHT - HEADER_BAND_HEIGHT, width: PDF_WIDTH, height: HEADER_BAND_HEIGHT, color: BRAND_NAVY_RGB });
  writer.page.drawRectangle({ x: 0, y: PDF_HEIGHT - HEADER_BAND_HEIGHT - 3, width: PDF_WIDTH, height: 3, color: BRAND_GOLD_RGB });
  writer.page.drawText(clean(resume.basics.fullName), { x: contentLeft, y: PDF_HEIGHT - 42, size: 21, font: writer.bold, color: rgb(1, 1, 1) });
  writer.page.drawText(clean(resume.basics.targetTitle), { x: contentLeft, y: PDF_HEIGHT - 62, size: 12, font: writer.regular, color: BRAND_GOLD_RGB });
  const contact = [resume.basics.location, resume.basics.phone, resume.basics.email].map(clean).filter(Boolean).join("   |   ");
  writer.page.drawText(contact, { x: contentLeft, y: PDF_HEIGHT - 86, size: 10, font: writer.regular, color: rgb(1, 1, 1) });
  writer.y = PDF_HEIGHT - HEADER_BAND_HEIGHT - 26;
}

export async function createResumePdf(resume: GeneratedResume, watermarked = false, theme: ResumeTheme = "plain"): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const writer: PdfWriter = {
    document,
    page: newPdfPage({ document, theme }),
    regular: await document.embedFont(decodeFont(ROBOTO_REGULAR_BASE64), { subset: true }),
    bold: await document.embedFont(decodeFont(ROBOTO_BOLD_BASE64), { subset: true }),
    italic: await document.embedFont(decodeFont(ROBOTO_ITALIC_BASE64), { subset: true }),
    y: PDF_HEIGHT - PDF_MARGIN,
    theme,
  };
  if (theme === "navy") {
    drawHeaderBand(writer, resume);
  } else {
    writeCentered(writer, resume.basics.fullName, writer.bold, 21, 0);
    writeCentered(writer, resume.basics.targetTitle, writer.regular, 12, 0);
    writeCentered(writer, [resume.basics.location, resume.basics.phone, resume.basics.email].map(clean).filter(Boolean).join("  |  "), writer.regular, 10, 10);
  }

  writeSection(writer, "PROFESSIONAL SUMMARY");
  writeLines(writer, resume.summary, { after: 4 });

  if (resume.certifications.length) {
    writeSection(writer, "CERTIFICATIONS & LICENSES");
    for (const certification of resume.certifications) writeCertificationBullet(writer, certification);
  }

  writeSection(writer, "CORE SKILLS");
  writeLines(writer, resume.skills.map(clean).filter(Boolean).join("  •  "), { after: 4 });

  if (resume.experience.length) {
    writeSection(writer, "WORK EXPERIENCE");
    for (const job of resume.experience) {
      const dates = [job.startDate, job.endDate].map(clean).filter(Boolean).join(" – ");
      const organizationLine = [job.employer, job.location].map(clean).filter(Boolean).join(" — ");
      writeLines(writer, [job.jobTitle, dates].filter(Boolean).join("  |  "), { font: writer.bold, size: 10.7, after: 0 });
      if (organizationLine) {
        writeLines(writer, organizationLine, { font: writer.italic, size: 10.2, after: 1 });
      }
      for (const item of job.bullets) writeBullet(writer, item);
      writer.y -= 2;
    }
  }

  if (resume.education.length) {
    writeSection(writer, "EDUCATION & TRAINING");
    for (const education of resume.education) {
      writeLines(writer, [education.credential, education.year].map(clean).filter(Boolean).join("  |  "), { font: writer.bold, size: 10.7, after: 0 });
      writeLines(writer, [education.institution, education.location].map(clean).filter(Boolean).join(" — "), { font: writer.italic, size: 10.2, after: 1 });
    }
  }

  if (resume.additionalInformation.length) {
    writeSection(writer, "ADDITIONAL INFORMATION");
    for (const item of resume.additionalInformation) writeBullet(writer, item);
  }

  if (watermarked) {
    const watermarkLogo = await document.embedPng(decodeFont(RESUME_WATERMARK_LOGO_BASE64));
    for (const page of document.getPages()) {
      page.drawImage(watermarkLogo, {
        x: 48,
        y: 225,
        width: 515,
        height: 344,
        rotate: degrees(28),
        opacity: 0.18,
      });
      page.drawText("PREVIEW — PAY $9.99 TO REMOVE WATERMARK", {
        x: 58,
        y: 82,
        size: 18,
        font: writer.bold,
        color: rgb(0.84, 0.1, 0.12),
        rotate: degrees(28),
        opacity: 0.34,
      });
    }
  }

  return document.save();
}
