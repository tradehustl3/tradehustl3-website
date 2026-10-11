import { rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Unpaid preview policy, shared by every resume and cover-letter renderer.
 *
 * The watermarked preview proves quality without giving away the finished
 * document: the header, summary, skills, credentials, education and every job
 * heading stay readable, while most AI-written bullets render as solid bars.
 * Locked words are never passed to `drawText`, so they are absent from the PDF
 * bytes the browser receives — this is server-enforced, not a CSS blur.
 *
 * Bars are measured from the real words with the real font, so locked lines take
 * exactly the space the paid file uses: pagination and layout match the purchase.
 */

/** Bullets readable in the unpaid preview, taken in reading order. */
export const PREVIEW_READABLE_BULLETS = 2;

/** Cover-letter body paragraphs readable in the unpaid preview. */
export const PREVIEW_READABLE_LETTER_PARAGRAPHS = 1;

const LOCK_FILL = rgb(0.78, 0.8, 0.84);

type BulletJob = { bullets: readonly string[] };

/**
 * Keys (`job:bullet`) of bullets that stay readable. At most half of all bullets
 * are ever shown, so even a short resume keeps something worth unlocking.
 */
export function readableBulletKeys(experience: readonly BulletJob[]): Set<string> {
  const total = experience.reduce((sum, job) => sum + job.bullets.length, 0);
  const budget = Math.min(PREVIEW_READABLE_BULLETS, Math.floor(total / 2));
  const keys = new Set<string>();
  for (let jobIndex = 0; jobIndex < experience.length && keys.size < budget; jobIndex += 1) {
    for (let bulletIndex = 0; bulletIndex < experience[jobIndex].bullets.length && keys.size < budget; bulletIndex += 1) {
      keys.add(`${jobIndex}:${bulletIndex}`);
    }
  }
  return keys;
}

export type ResumePreviewLock = {
  bulletLocked(jobIndex: number, bulletIndex: number): boolean;
  additionalLocked: boolean;
};

export function resumePreviewLock(experience: readonly BulletJob[]): ResumePreviewLock {
  const readable = readableBulletKeys(experience);
  return {
    bulletLocked: (jobIndex, bulletIndex) => !readable.has(`${jobIndex}:${bulletIndex}`),
    additionalLocked: true,
  };
}

/** Count of bullets hidden in the preview; drives the review page's locked-content copy. */
export function lockedBulletCount(experience: readonly BulletJob[]): number {
  const total = experience.reduce((sum, job) => sum + job.bullets.length, 0);
  return total - readableBulletKeys(experience).size;
}

export function letterParagraphLocked(index: number): boolean {
  return index >= PREVIEW_READABLE_LETTER_PARAGRAPHS;
}

/**
 * Draws one wrapped line as word-shaped bars in place of glyphs. Widths come from
 * the same font and size the paid file uses; the text itself is never emitted.
 */
export function drawLockedLine(
  page: PDFPage,
  line: string,
  options: { x: number; baseline: number; font: PDFFont; size: number },
): void {
  const { font, size, baseline } = options;
  const space = font.widthOfTextAtSize(" ", size);
  const height = size * 0.62;
  let x = options.x;
  for (const word of line.split(" ")) {
    if (!word) continue;
    const width = font.widthOfTextAtSize(word, size);
    page.drawRectangle({ x, y: baseline - size * 0.06, width, height, color: LOCK_FILL });
    x += width + space;
  }
}
