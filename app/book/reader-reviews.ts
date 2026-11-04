/**
 * Reader reviews shown on /book.
 *
 * Rules (TRADE HUSTL3 does not invent customer claims):
 * - Only real reviews from real readers, copied word for word.
 * - `permissionToQuote` must be true: the reader agreed to be quoted on
 *   tradehustl3.com (an Amazon review alone does not grant that).
 * - Never paid for, never traded for anything, never from family.
 *
 * The reviews section renders nothing while this list is empty, so the page
 * never shows an empty or placeholder reviews box.
 */

export type ReaderReview = {
  /** Stable id, e.g. "2026-11-amazon-jdoe". */
  id: string;
  /** Exactly how the reader asked to be credited, e.g. "Marcus T." */
  name: string;
  /** The reader's own description, e.g. "HVAC apprentice" or "CTE instructor". */
  role: string;
  /** Verbatim review text. Shorten only with an ellipsis, never reword. */
  quote: string;
  /** 1–5 stars as the reader gave them, or null if the reader gave no rating. */
  rating: 1 | 2 | 3 | 4 | 5 | null;
  source: "amazon" | "email" | "in-person";
  /** Date the reader gave permission (YYYY-MM-DD). */
  permissionDate: string;
  permissionToQuote: true;
};

export const READER_REVIEWS: readonly ReaderReview[] = [];
