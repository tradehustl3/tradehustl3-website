/**
 * Live purchase links for the book. Leave a URL empty until its listing is
 * confirmed live; the page then shows the format and price without a link
 * instead of sending buyers to a missing or outdated listing.
 */
export const AMAZON_PAPERBACK_URL = "";
export const AMAZON_KINDLE_URL = "";

/** Where schools, programs and employers ask about classroom or group orders. */
export const PROGRAM_ORDER_EMAIL = "partners@tradehustl3.com";

const PROGRAM_ORDER_SUBJECT = "Classroom or program order: TRADE HUSTL3 book";
const PROGRAM_ORDER_BODY = [
  "Hi TRADE HUSTL3 team,",
  "",
  "Organization or school:",
  "Program (CTE, trade school, Job Corps, workforce, apprenticeship, other):",
  "About how many students or participants:",
  "Format wanted (paperback, eBook, or both):",
  "When you need it:",
  "",
  "Thanks,",
].join("\n");

export const PROGRAM_ORDER_MAILTO =
  `mailto:${PROGRAM_ORDER_EMAIL}?subject=${encodeURIComponent(PROGRAM_ORDER_SUBJECT)}&body=${encodeURIComponent(PROGRAM_ORDER_BODY)}`;
