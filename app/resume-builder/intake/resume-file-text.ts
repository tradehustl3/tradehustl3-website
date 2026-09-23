export type PdfTextItem = { str: string; transform: number[]; width: number; height: number; hasEOL?: boolean };

/** Geometry-based lines; split an ordinary two-column page at a repeated gutter. */
export function pdfPageText(items: PdfTextItem[]): string {
  const text = items.filter((item) => item.str.trim());
  if (!text.length) return "";
  const rows: PdfTextItem[][] = [];
  for (const item of [...text].sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])) {
    const row = rows.find((group) => Math.abs(group[0].transform[5] - item.transform[5]) <= Math.max(2, Math.min(item.height, group[0].height) * 0.35));
    if (row) row.push(item);
    else rows.push([item]);
  }
  const gaps: number[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.transform[4] - b.transform[4]);
    for (let i = 1; i < row.length; i += 1) {
      const left = row[i - 1].transform[4] + row[i - 1].width;
      const right = row[i].transform[4];
      if (right - left >= 36) gaps.push((left + right) / 2);
    }
  }
  const gutter = gaps.find((x) => gaps.filter((other) => Math.abs(other - x) < 35).length >= 3);
  const line = (row: PdfTextItem[]) => row.map((item) => item.str.trim()).join(" ");
  if (gutter === undefined) return rows.map(line).join("\n");
  const spans = (item: PdfTextItem) => item.transform[4] < gutter && item.transform[4] + item.width > gutter;
  const firstColumnRow = rows.findIndex((row) => row.some((item) => item.transform[4] >= gutter) && !row.some(spans));
  const header = rows.slice(0, Math.max(0, firstColumnRow));
  const body = rows.slice(Math.max(0, firstColumnRow));
  // Crossing text after the header means there is no safe simple column split.
  if (body.some((row) => row.some(spans))) return rows.map(line).join("\n");
  return [...header.map(line), ...body.map((row) => line(row.filter((item) => item.transform[4] < gutter))),
    "", ...body.map((row) => line(row.filter((item) => item.transform[4] >= gutter)))].filter(Boolean).join("\n");
}

function xmlText(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_match, entity: string) => {
    const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    if (named[entity]) return named[entity];
    const code = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
  });
}

/** OOXML body/header/footer/table and w:txbxContent text, with no external entity expansion. */
export function wordXmlText(xml: string): string {
  const supported = xml.replace(/<mc:Fallback\b[^>]*>[\s\S]*?<\/mc:Fallback>/g, "");
  return (supported.match(/<w:t\b[^>]*>[\s\S]*?<\/w:t>|<w:(?:br|cr|tab)\b[^>]*\/>|<\/w:p>/g) ?? [])
    .map((token) => token.startsWith("<w:t ") || token.startsWith("<w:t>")
      ? xmlText(token.replace(/^<w:t\b[^>]*>|<\/w:t>$/g, ""))
      : token.startsWith("<w:tab") ? "\t" : "\n")
    .join("").replace(/\n{3,}/g, "\n\n").trim();
}

export async function docxResumeText(arrayBuffer: ArrayBuffer): Promise<string> {
  // JSZip is already used by Mammoth/docx; shared dependency, no second ZIP engine.
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(arrayBuffer);
  const document = await zip.file("word/document.xml")?.async("string");
  if (!document) throw new Error("We couldn't read text from this file.");
  const relations = await zip.file("word/_rels/document.xml.rels")?.async("string") ?? "";
  const referencedIds = [...document.matchAll(/<w:(?:header|footer)Reference\b[^>]*\br:id="([^"]+)"/g)].map((match) => match[1]);
  const headers: string[] = [];
  const footers: string[] = [];
  for (const relation of relations.match(/<Relationship\b[^>]*\/?\s*>/g) ?? []) {
    const id = relation.match(/\bId="([^"]+)"/)?.[1];
    const target = relation.match(/\bTarget="([^"]+)"/)?.[1];
    if (!id || !target || !referencedIds.includes(id) || /TargetMode="External"/.test(relation)) continue;
    const path = target.startsWith("/") ? target.slice(1) : `word/${target.replace(/^\.\//, "")}`;
    if (!/^word\/[\w.-]+\.xml$/.test(path)) continue;
    const part = await zip.file(path)?.async("string");
    if (!part) continue;
    if (/\/header"/.test(relation)) headers.push(wordXmlText(part));
    if (/\/footer"/.test(relation)) footers.push(wordXmlText(part));
  }
  return [...new Set(headers), wordXmlText(document), ...new Set(footers)].filter(Boolean).join("\n\n");
}

export const UNREADABLE_RESUME_MESSAGE = "We couldn't read text from this file.";
export function hasUsableResumeText(text: string): boolean {
  return text.trim().length >= 80 && text.trim().split(/\s+/).length >= 12;
}
