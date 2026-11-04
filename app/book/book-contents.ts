/**
 * The TRADE HUSTL3 book's table of contents — single source of truth for the site.
 *
 * Copied word for word from the CONTENTS page (PDF page 3) of the final
 * paperback interior: TRADE_HUSTL3_Interior_6x9_v2.pdf, 438 pages, ISBN
 * 9798193043355, uploaded to KDP Oct 31, 2026 ("TRADE HUSTL3 Business Vault",
 * Book & Publishing folder). Page numbers are the printed paperback page numbers.
 *
 * This edition has NO appendices. If the book is re-edited, update this file
 * from the new interior's Contents page and regenerate
 * worker/assets/trade-hustl3-seven-page-book-sample.pdf from the same interior
 * (PDF pages 1, 3 and 5–9) so the site, the reader, and the sample PDF agree.
 * Everything on /book and /book/sample/read reads from here.
 */

export type BookChapter = { number: number; title: string; page: number };
export type BookPart = { label: string; title: string; chapters: readonly BookChapter[] };

export const BOOK_PARTS: readonly BookPart[] = [
  {
    label: "PART I",
    title: "Build the Foundation",
    chapters: [
      { number: 1, title: "What a Skilled Trade Really Is", page: 5 },
      { number: 2, title: "Why Skilled Trades Are in High Demand", page: 29 },
      { number: 3, title: "College vs. Trades: The Real Math", page: 43 },
      { number: 4, title: "The No-Experience Path", page: 58 },
      { number: 5, title: "Learning on the Job", page: 79 },
      { number: 6, title: "Trade Myths That Keep People Broke", page: 98 },
    ],
  },
  {
    label: "PART II",
    title: "Know the Tradescape",
    chapters: [
      { number: 7, title: "The Different Types of Skilled Trades", page: 120 },
      { number: 8, title: "Construction Trades", page: 142 },
      { number: 9, title: "Mechanical Trades: HVAC, Plumbing, Pipe fitting, and Refrigeration", page: 166 },
      { number: 10, title: "Electrical and Power Trades", page: 191 },
      { number: 11, title: "Industrial, Energy, and Infrastructure Trades", page: 214 },
      { number: 12, title: "Fabrication and Precision Trades", page: 239 },
      { number: 13, title: "Service, Maintenance, and Facilities Trades", page: 256 },
      { number: 14, title: "Personal Skilled Trades and Solo Ownership Paths", page: 274 },
    ],
  },
  {
    label: "PART III",
    title: "Turn Skill Into Money and Leverage",
    chapters: [
      { number: 15, title: "Certifications That Actually Matter", page: 290 },
      { number: 16, title: "How Pay Really Increases in the Trades", page: 305 },
      { number: 17, title: "Side Work, Overtime, and Specialization", page: 320 },
    ],
  },
  {
    label: "PART IV",
    title: "Turn Leverage Into Control",
    chapters: [
      { number: 18, title: "From Employee to Owner", page: 337 },
      { number: 19, title: "Choosing the Right Trade for You", page: 351 },
      { number: 20, title: "The Trade Hustle 90-Day Action Plan", page: 378 },
      { number: 21, title: "Final Word: Build Something That Belongs to You", page: 417 },
    ],
  },
];

/** Listed after the chapters on the Contents page. */
export const BOOK_BACK_MATTER = [{ title: "About the Author", page: 438 }] as const;

export const BOOK_CHAPTER_COUNT = BOOK_PARTS.reduce((total, part) => total + part.chapters.length, 0);
export const BOOK_PART_COUNT = BOOK_PARTS.length;
