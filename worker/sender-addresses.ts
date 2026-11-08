/**
 * From addresses for transactional email, one per product line, so replies and
 * inbox filtering stay with the right team. All are on tradehustl3.com, which is
 * authenticated in Brevo; each is also registered as a Brevo sender.
 *
 * - Book: 7-page sample delivery, eBook preorder/delivery, school/program inquiries.
 * - Resume Builder: sign-in codes and review requests.
 * - Everything else (Top 10 Trades guide, double opt-in) keeps BREVO_SAMPLE_SENDER_EMAIL / updates@.
 */
export const BOOK_SENDER_EMAIL = "book@tradehustl3.com";
export const RESUME_SENDER_EMAIL = "resume@tradehustl3.com";

export function bookSenderEmail(env: { BREVO_BOOK_SENDER_EMAIL?: string }): string {
  return env.BREVO_BOOK_SENDER_EMAIL?.trim() || BOOK_SENDER_EMAIL;
}

export function resumeSenderEmail(env: { BREVO_RESUME_SENDER_EMAIL?: string }): string {
  return env.BREVO_RESUME_SENDER_EMAIL?.trim() || RESUME_SENDER_EMAIL;
}
