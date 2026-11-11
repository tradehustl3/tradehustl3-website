/** The email (account-start) page. */
export const RESUME_EMAIL_PAGE_PATH = "/resume-builder/start";

/** True when an anchor's href resolves to the email page on this site. */
export function linksToResumeEmailPage(href: string | null, base: string): boolean {
  if (!href) return false;
  try {
    const url = new URL(href, base);
    return url.origin === new URL(base).origin && url.pathname.replace(/\/+$/, "") === RESUME_EMAIL_PAGE_PATH;
  } catch {
    return false;
  }
}
