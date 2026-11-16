// Pure, DOM-free logic behind the resume style carousel. Kept apart from the React
// component so it can be unit tested in Node.

/** Pause after the last swipe before the shown look is applied to the documents. */
export const CAROUSEL_SETTLE_MS = 450;

/** Shortest horizontal travel, in CSS pixels, that counts as a swipe. */
export const SWIPE_THRESHOLD = 40;

/** Next slide index, held at the first and last slide (the carousel does not wrap). */
export function carouselStep(index: number, delta: number, count: number): number {
  if (!(count > 0)) return 0;
  const from = Number.isInteger(index) && index >= 0 && index < count ? index : 0;
  return Math.min(count - 1, Math.max(0, from + Math.sign(delta)));
}

/**
 * Direction of a finished touch: 1 = next slide (swipe left), -1 = previous slide
 * (swipe right), 0 = not a swipe. A mostly vertical drag is the page scrolling.
 */
export function swipeDirection(dx: number, dy: number, threshold = SWIPE_THRESHOLD): -1 | 0 | 1 {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

/**
 * The look the carousel shows. A look the customer has swiped to is shown at once;
 * when it has been applied (or was never different) the saved look is shown.
 */
export function shownLook<T>(pending: T | null, current: T, looks: readonly T[]): T {
  return pending !== null && pending !== current && looks.includes(pending) ? pending : current;
}
