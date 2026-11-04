/**
 * Holiday gift-season window for the /book banner.
 *
 * Runs from Wednesday, Nov 25, 2026 at 12:00 a.m. Eastern through
 * Thursday, Dec 31, 2026 at 11:59 p.m. Eastern (EST is UTC-5 for the whole
 * window). The banner switches itself off afterwards; a new season needs a
 * new window here.
 */
export const HOLIDAY_GIFT_WINDOW = {
  startsAt: Date.parse("2026-11-25T05:00:00Z"),
  endsAt: Date.parse("2027-01-01T05:00:00Z"),
} as const;

export function isHolidayGiftSeason(now: number = Date.now()): boolean {
  return now >= HOLIDAY_GIFT_WINDOW.startsAt && now < HOLIDAY_GIFT_WINDOW.endsAt;
}
