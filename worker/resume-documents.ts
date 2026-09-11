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

// Two customer-facing styles share the exact same ATS-safe structure.
// "plain" is Classic Black and remains the default. The persisted "navy"
// key is retained for backward compatibility, but now renders the optional
// TRADE HUSTL3 Red Accent style instead of the retired navy/gold treatment.
export type ResumeTheme = "plain" | "navy";

const BRAND_BLACK = "111111";
const BRAND_BLACK_RGB = rgb(0x11 / 255, 0x11 / 255, 0x11 / 255);
const BRAND_RED = "D71920";
const BRAND_RED_RGB = rgb(0xd7 / 255, 0x19 / 255, 0x20 / 255);

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function sectionHeading(text: string, theme: ResumeTheme): Paragraph {
  const accent = theme === "navy" ? BRAND_RED : BRAND_BLACK;
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    border: {
      bottom: { color: accent, size: 6, style: BorderStyle.SINGLE },
    },
    spacing: { before: 220, after: 80 },
    children: [new TextRun({
      text,
      bold: true,
      size: 24,
      font: "Arial",
      color: theme === "navy" ? BRAND_RED : undefined,
    })],
  });
}

function bullet(text: string, keepNext = false): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    keepLines: true,
    keepNext,
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

function headerParagraphs(resume: GeneratedResume, contactLine: string): Paragraph[] {
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

export async function createResumeDocx(resume: GeneratedResume, theme: ResumeTheme = "plain"): Promise<Uint8Array> {
  const contactLine = [
    clean(resume.basics.location),
    clean(resume.basics.phone),
    clean(resume.basics.email),
  ].filter(Boolean).join("  |  ");

  const children: Paragraph[] = [
    ...headerParagraphs(resume, contactLine),
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
      for (const [index, item] of job.bullets.entries()) {
        children.push(bullet(item, index < job.bullets.length - 1));
      }
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
          run: { font: "Arial", size: 21, color: BRAND_BLACK },
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
  layout: PdfLayout;
};

const PDF_WIDTH = 612;
const PDF_HEIGHT = 792;

type PdfLayout = {
  margin: number;
  nameSize: number;
  targetSize: number;
  contactSize: number;
  contactAfter: number;
  sectionBefore: number;
  sectionSize: number;
  sectionLineGap: number;
  bodySize: number;
  bodyLineHeight: number;
  bodyAfter: number;
  jobTitleSize: number;
  organizationSize: number;
  bulletSize: number;
  bulletLineHeight: number;
  bulletAfter: number;
  jobAfter: number;
};

const STANDARD_PDF_LAYOUT: PdfLayout = {
  margin: 50,
  nameSize: 21,
  targetSize: 12,
  contactSize: 10,
  contactAfter: 10,
  sectionBefore: 7,
  sectionSize: 12,
  sectionLineGap: 6,
  bodySize: 10.7,
  bodyLineHeight: 13.2,
  bodyAfter: 4,
  jobTitleSize: 10.7,
  organizationSize: 10.5,
  bulletSize: 10.5,
  bulletLineHeight: 12.9,
  bulletAfter: 1.5,
  jobAfter: 2,
};

// Used only when measurement proves the complete resume will fit on one page.
// Body copy remains 10.5pt; the fit comes from margins and vertical rhythm.
const COMPACT_ONE_PAGE_LAYOUT: PdfLayout = {
  margin: 44,
  nameSize: 20,
  targetSize: 11.5,
  contactSize: 9.5,
  contactAfter: 7,
  sectionBefore: 5,
  sectionSize: 11.5,
  sectionLineGap: 4.5,
  bodySize: 10.5,
  bodyLineHeight: 12.4,
  bodyAfter: 2,
  jobTitleSize: 10.5,
  organizationSize: 10.5,
  bulletSize: 10.5,
  bulletLineHeight: 12.4,
  bulletAfter: 1,
  jobAfter: 1,
};

function themeAccentColor(theme: ResumeTheme): ReturnType<typeof rgb> {
  return theme === "navy" ? BRAND_RED_RGB : BRAND_BLACK_RGB;
}

function themeSectionTitleColor(theme: ResumeTheme): ReturnType<typeof rgb> {
  return theme === "navy" ? BRAND_RED_RGB : rgb(0.03, 0.03, 0.03);
}

function themeBulletColor(theme: ResumeTheme): ReturnType<typeof rgb> {
  return theme === "navy" ? BRAND_RED_RGB : rgb(0, 0, 0);
}

function newPdfPage(writer: Pick<PdfWriter, "document">): PDFPage {
  return writer.document.addPage([PDF_WIDTH, PDF_HEIGHT]);
}

function addPage(writer: PdfWriter): void {
  writer.page = newPdfPage(writer);
  writer.y = PDF_HEIGHT - writer.layout.margin;
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
  if (writer.y - height < writer.layout.margin) addPage(writer);
}

function wrappedLineCount(text: string, font: PDFFont, size: number, width: number): number {
  return Math.max(1, wrapText(text, font, size, width).length);
}

function textHeight(writer: PdfWriter, text: string, font: PDFFont, size: number, indent: number, lineHeight: number, after: number): number {
  const width = PDF_WIDTH - writer.layout.margin * 2 - indent;
  return wrappedLineCount(text, font, size, width) * lineHeight + after;
}

function sectionHeight(layout: PdfLayout): number {
  return layout.sectionBefore + layout.sectionSize + 4 + layout.sectionLineGap;
}

function bulletHeight(writer: PdfWriter, text: string): number {
  return textHeight(writer, text, writer.regular, writer.layout.bulletSize, 20, writer.layout.bulletLineHeight, writer.layout.bulletAfter);
}

function certificationHeight(writer: PdfWriter, certification: ResumeCertification): number {
  const rest = [clean(certification.issuer), clean(certification.year)].filter(Boolean).join(" — ");
  const segments = [
    { text: clean(certification.name), font: writer.bold },
    ...(rest ? [{ text: ` — ${rest}`, font: writer.regular }] : []),
  ];
  const lines = wrapSegments(segments, writer.layout.bulletSize, PDF_WIDTH - writer.layout.margin * 2 - 20);
  return Math.max(1, lines.length) * writer.layout.bulletLineHeight + writer.layout.bulletAfter;
}

function jobHeadingHeight(writer: PdfWriter, job: ResumeExperience, continued = false): number {
  const dates = [job.startDate, job.endDate].map(clean).filter(Boolean).join(" – ");
  const title = [job.jobTitle, dates].filter(Boolean).join("  |  ") + (continued ? "  (continued)" : "");
  const organization = [job.employer, job.location].map(clean).filter(Boolean).join(" — ");
  return textHeight(writer, title, writer.bold, writer.layout.jobTitleSize, 0, writer.layout.bodyLineHeight, 0)
    + (organization
      ? textHeight(writer, organization, writer.italic, writer.layout.organizationSize, 0, writer.layout.bodyLineHeight, 1)
      : 0);
}

function jobHeight(writer: PdfWriter, job: ResumeExperience): number {
  return jobHeadingHeight(writer, job)
    + job.bullets.reduce((height, item) => height + bulletHeight(writer, item), 0)
    + writer.layout.jobAfter;
}

function educationHeight(writer: PdfWriter, education: ResumeEducation): number {
  const heading = [education.credential, education.year].map(clean).filter(Boolean).join("  |  ");
  const organization = [education.institution, education.location].map(clean).filter(Boolean).join(" — ");
  return textHeight(writer, heading, writer.bold, writer.layout.jobTitleSize, 0, writer.layout.bodyLineHeight, 0)
    + textHeight(writer, organization, writer.italic, writer.layout.organizationSize, 0, writer.layout.bodyLineHeight, 1);
}

function resumeHeight(writer: PdfWriter, resume: GeneratedResume): number {
  let height = writer.layout.nameSize * 1.3
    + writer.layout.targetSize * 1.3
    + writer.layout.contactSize * 1.3
    + writer.layout.contactAfter;

  height += sectionHeight(writer.layout)
    + textHeight(writer, resume.summary, writer.regular, writer.layout.bodySize, 0, writer.layout.bodyLineHeight, writer.layout.bodyAfter);

  if (resume.certifications.length) {
    height += sectionHeight(writer.layout)
      + resume.certifications.reduce((total, certification) => total + certificationHeight(writer, certification), 0);
  }

  height += sectionHeight(writer.layout)
    + textHeight(
      writer,
      resume.skills.map(clean).filter(Boolean).join("  •  "),
      writer.regular,
      writer.layout.bodySize,
      0,
      writer.layout.bodyLineHeight,
      writer.layout.bodyAfter,
    );

  if (resume.experience.length) {
    height += sectionHeight(writer.layout)
      + resume.experience.reduce((total, job) => total + jobHeight(writer, job), 0);
  }

  if (resume.education.length) {
    height += sectionHeight(writer.layout)
      + resume.education.reduce((total, education) => total + educationHeight(writer, education), 0);
  }

  if (resume.additionalInformation.length) {
    height += sectionHeight(writer.layout)
      + resume.additionalInformation.reduce((total, item) => total + bulletHeight(writer, item), 0);
  }

  return height;
}

function onePageCapacity(layout: PdfLayout): number {
  return PDF_HEIGHT - layout.margin * 2;
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
  const lines = wrapText(text, font, size, PDF_WIDTH - writer.layout.margin * 2 - indent);
  ensureSpace(writer, Math.max(1, lines.length) * lineHeight + after);
  for (const line of lines) {
    writer.page.drawText(line, {
      x: writer.layout.margin + indent,
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
    x: Math.max(writer.layout.margin, (PDF_WIDTH - width) / 2),
    y: writer.y - size,
    size,
    font,
    color: rgb(0.05, 0.05, 0.05),
  });
  writer.y -= size * 1.3 + after;
}

function writeSection(writer: PdfWriter, title: string, firstContentHeight = 0): void {
  ensureSpace(writer, sectionHeight(writer.layout) + firstContentHeight);
  writer.y -= writer.layout.sectionBefore;
  writer.page.drawText(title, {
    x: writer.layout.margin,
    y: writer.y - writer.layout.sectionSize,
    size: writer.layout.sectionSize,
    font: writer.bold,
    color: themeSectionTitleColor(writer.theme),
  });
  writer.y -= writer.layout.sectionSize + 4;
  writer.page.drawLine({
    start: { x: writer.layout.margin, y: writer.y },
    end: { x: PDF_WIDTH - writer.layout.margin, y: writer.y },
    thickness: 0.9,
    color: themeAccentColor(writer.theme),
  });
  writer.y -= writer.layout.sectionLineGap;
}

function writeBullet(writer: PdfWriter, text: string): void {
  ensureSpace(writer, bulletHeight(writer, text));
  writer.page.drawText("•", { x: writer.layout.margin + 7, y: writer.y - writer.layout.bulletSize, size: writer.layout.bulletSize, font: writer.regular, color: themeBulletColor(writer.theme) });
  writeLines(writer, text, { indent: 20, size: writer.layout.bulletSize, lineHeight: writer.layout.bulletLineHeight, after: writer.layout.bulletAfter });
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
  const size = writer.layout.bulletSize;
  const indent = 20;
  const lineHeight = writer.layout.bulletLineHeight;
  const rest = [clean(certification.issuer), clean(certification.year)].filter(Boolean).join(" — ");
  const segments = [
    { text: clean(certification.name), font: writer.bold },
    ...(rest ? [{ text: ` — ${rest}`, font: writer.regular }] : []),
  ];
  const lines = wrapSegments(segments, size, PDF_WIDTH - writer.layout.margin * 2 - indent);
  ensureSpace(writer, Math.max(1, lines.length) * lineHeight + writer.layout.bulletAfter);
  writer.page.drawText("•", { x: writer.layout.margin + 7, y: writer.y - size, size, font: writer.regular, color: themeBulletColor(writer.theme) });
  for (const line of lines) {
    let x = writer.layout.margin + indent;
    for (const word of line) {
      writer.page.drawText(word.text, { x, y: writer.y - size, size, font: word.font, color: rgb(0.07, 0.07, 0.07) });
      x += word.font.widthOfTextAtSize(`${word.text} `, size);
    }
    writer.y -= lineHeight;
  }
  writer.y -= writer.layout.bulletAfter;
}

function writeJobHeading(writer: PdfWriter, job: ResumeExperience, continued = false): void {
  const dates = [job.startDate, job.endDate].map(clean).filter(Boolean).join(" – ");
  const continuedLabel = continued ? "  (continued)" : "";
  const organizationLine = [job.employer, job.location].map(clean).filter(Boolean).join(" — ");
  writeLines(writer, `${[job.jobTitle, dates].filter(Boolean).join("  |  ")}${continuedLabel}`, {
    font: writer.bold,
    size: writer.layout.jobTitleSize,
    lineHeight: writer.layout.bodyLineHeight,
    after: 0,
  });
  if (organizationLine) {
    writeLines(writer, organizationLine, {
      font: writer.italic,
      size: writer.layout.organizationSize,
      lineHeight: writer.layout.bodyLineHeight,
      after: 1,
    });
  }
}

function writeJob(writer: PdfWriter, job: ResumeExperience, keepWholeWhenPossible: boolean): void {
  const fullHeight = jobHeight(writer, job);
  const pageCapacity = onePageCapacity(writer.layout);
  const firstBulletHeight = job.bullets.length ? bulletHeight(writer, job.bullets[0]) : 0;
  const introHeight = jobHeadingHeight(writer, job) + firstBulletHeight;

  if (keepWholeWhenPossible && fullHeight <= pageCapacity) ensureSpace(writer, fullHeight);
  else ensureSpace(writer, introHeight);

  writeJobHeading(writer, job);
  for (const item of job.bullets) {
    const height = bulletHeight(writer, item);
    if (writer.y - height < writer.layout.margin) {
      addPage(writer);
      writeJobHeading(writer, job, true);
    }
    writeBullet(writer, item);
  }
  writer.y -= writer.layout.jobAfter;
}

export async function createResumePdf(resume: GeneratedResume, watermarked = false, theme: ResumeTheme = "plain"): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const writer: PdfWriter = {
    document,
    page: newPdfPage({ document }),
    regular: await document.embedFont(decodeFont(ROBOTO_REGULAR_BASE64), { subset: true }),
    bold: await document.embedFont(decodeFont(ROBOTO_BOLD_BASE64), { subset: true }),
    italic: await document.embedFont(decodeFont(ROBOTO_ITALIC_BASE64), { subset: true }),
    y: PDF_HEIGHT - STANDARD_PDF_LAYOUT.margin,
    theme,
    layout: STANDARD_PDF_LAYOUT,
  };

  const standardHeight = resumeHeight(writer, resume);
  if (standardHeight > onePageCapacity(STANDARD_PDF_LAYOUT)) {
    writer.layout = COMPACT_ONE_PAGE_LAYOUT;
    const compactHeight = resumeHeight(writer, resume);
    if (compactHeight > onePageCapacity(COMPACT_ONE_PAGE_LAYOUT)) writer.layout = STANDARD_PDF_LAYOUT;
  }
  writer.y = PDF_HEIGHT - writer.layout.margin;

  writeCentered(writer, resume.basics.fullName, writer.bold, writer.layout.nameSize, 0);
  writeCentered(writer, resume.basics.targetTitle, writer.regular, writer.layout.targetSize, 0);
  writeCentered(
    writer,
    [resume.basics.location, resume.basics.phone, resume.basics.email].map(clean).filter(Boolean).join("  |  "),
    writer.regular,
    writer.layout.contactSize,
    writer.layout.contactAfter,
  );

  const summaryHeight = textHeight(writer, resume.summary, writer.regular, writer.layout.bodySize, 0, writer.layout.bodyLineHeight, writer.layout.bodyAfter);
  writeSection(writer, "PROFESSIONAL SUMMARY", summaryHeight);
  writeLines(writer, resume.summary, { size: writer.layout.bodySize, lineHeight: writer.layout.bodyLineHeight, after: writer.layout.bodyAfter });

  if (resume.certifications.length) {
    writeSection(writer, "CERTIFICATIONS & LICENSES", certificationHeight(writer, resume.certifications[0]));
    for (const certification of resume.certifications) writeCertificationBullet(writer, certification);
  }

  const skillsText = resume.skills.map(clean).filter(Boolean).join("  •  ");
  const skillsHeight = textHeight(writer, skillsText, writer.regular, writer.layout.bodySize, 0, writer.layout.bodyLineHeight, writer.layout.bodyAfter);
  writeSection(writer, "CORE SKILLS", skillsHeight);
  writeLines(writer, skillsText, { size: writer.layout.bodySize, lineHeight: writer.layout.bodyLineHeight, after: writer.layout.bodyAfter });

  if (resume.experience.length) {
    const firstJob = resume.experience[0];
    const firstJobIntro = jobHeadingHeight(writer, firstJob) + (firstJob.bullets.length ? bulletHeight(writer, firstJob.bullets[0]) : 0);
    writeSection(writer, "WORK EXPERIENCE", firstJobIntro);
    for (const [index, job] of resume.experience.entries()) {
      writeJob(writer, job, index > 0);
    }
  }

  if (resume.education.length) {
    writeSection(writer, "EDUCATION & TRAINING", educationHeight(writer, resume.education[0]));
    for (const education of resume.education) {
      ensureSpace(writer, educationHeight(writer, education));
      writeLines(writer, [education.credential, education.year].map(clean).filter(Boolean).join("  |  "), { font: writer.bold, size: writer.layout.jobTitleSize, lineHeight: writer.layout.bodyLineHeight, after: 0 });
      writeLines(writer, [education.institution, education.location].map(clean).filter(Boolean).join(" — "), { font: writer.italic, size: writer.layout.organizationSize, lineHeight: writer.layout.bodyLineHeight, after: 1 });
    }
  }

  if (resume.additionalInformation.length) {
    writeSection(writer, "ADDITIONAL INFORMATION", bulletHeight(writer, resume.additionalInformation[0]));
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
        color: BRAND_BLACK_RGB,
        rotate: degrees(28),
        opacity: 0.34,
      });
    }
  }

  return document.save();
}
