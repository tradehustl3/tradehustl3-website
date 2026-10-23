/**
 * Repairs links where a full TRADE HUSTL3 URL was pasted onto an existing path,
 * e.g. `/resume-builderhttps://tradehustl3.com/resume-builder` (seen in GA4 on
 * Oct 22 2026, arriving from an external post). Those paths match no route and
 * would otherwise 404.
 *
 * Only our own origin is recognized, and the redirect target is always built on
 * the request's own origin, so this cannot become an open redirect.
 */
const EMBEDDED_SITE_URL = /https?(?::|%3a)(?:\/|%2f){2}(?:www\.)?tradehustl3\.com/i;

/** Returns the clean path for a malformed one, or null when the path is fine. */
export function repairedPathname(pathname: string): string | null {
  const match = EMBEDDED_SITE_URL.exec(pathname);
  if (!match) return null;
  const prefix = pathname.slice(0, match.index).replace(/\/+$/, "");
  return prefix.startsWith("/") ? prefix : "/";
}

/** Same-origin URL for the repaired path (query string kept), or null. */
export function malformedUrlTarget(requestUrl: string): URL | null {
  const url = new URL(requestUrl);
  const pathname = repairedPathname(url.pathname);
  if (pathname === null) return null;
  const target = new URL(url.origin);
  target.pathname = pathname;
  target.search = url.search;
  return target;
}
