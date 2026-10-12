/** Bump this version whenever the linked policies or either agreement changes. */
export const PURCHASE_TERMS_VERSION = "2026-10-11.v1";
export const PURCHASE_TERMS_UPDATED = "October 11, 2026";

export const INTAKE_AGREEMENT = "I confirm this resume belongs to me, that the corrected information is accurate, and that I am at least 18 years old. I also agree to the Terms of Service, Privacy Policy, Refund Policy, and AI Disclosure.";
export const CHECKOUT_AGREEMENT = "I agree to the Terms of Service and Refund Policy and understand the digital-product purchase terms above.";
export const PURCHASE_DISCLOSURE = "Digital product. Review the protected preview before paying. No change-of-mind refunds after clean files are delivered. Delivery failures and other Refund Policy exceptions still apply.";

/** The rendered refund page and saved evidence use these same immutable words. */
export const RESUME_REFUND_POLICY_SECTIONS = [
  { title: "What the purchase includes", text: "Your initial AI-assisted resume and protected watermarked preview are created before payment. Your $9.99 purchase removes the watermark and includes one completed resume, one matching cover letter, clean PDF and editable DOCX downloads for both documents, and up to three AI-assisted correction runs shared across the resume and cover letter during the seven-day correction period. The first cover-letter generation does not use a correction." },
  { title: "When a refund is available", text: "A full refund is available when TRADE HUSTL3 LLC permanently cannot generate or deliver the purchased resume after a reasonable opportunity to correct the problem. Duplicate charges and charges confirmed to be unauthorized will also be reviewed and corrected as appropriate." },
  { title: "Failed attempts", text: "A resume or cover-letter generation attempt that fails before successful delivery is designed not to consume a correction run. Your payment remains attached to the paid package while you retry or correct required intake information." },
  { title: "When a refund is normally unavailable", text: "Except when required by law, refunds are normally unavailable because you changed your mind after generation began, did not use all corrections, entered inaccurate or incomplete information, missed the correction window, or did not receive an interview or job." },
  { title: "Effect of refunds", text: "A partial refund does not revoke access unless the original $9.99 charge has been fully refunded. A full refund revokes the related entitlement, including remaining resume and cover-letter generation, correction, preview, and download access." },
  { title: "Payment disputes", text: "A payment dispute suspends clean downloads and correction access for the related purchase. Contact support@tradehustl3.com for help resolving the dispute." },
  { title: "How to request help", text: "Email support@tradehustl3.com from the email connected to your account. Include your name, purchase email, approximate purchase date, and a brief description of the problem. Do not email complete card information." },
  { title: "Processing time", text: "Approved refunds are submitted to the original payment method. Your bank or card issuer controls when the credit appears. This policy does not limit rights that cannot be waived under applicable law." },
] as const;

export const PURCHASE_POLICY_SNAPSHOT = JSON.stringify({
  version: PURCHASE_TERMS_VERSION,
  disclosure: PURCHASE_DISCLOSURE,
  policies: {
    terms: { url: "/terms", updated: "September 24, 2026" },
    privacy: { url: "/privacy", updated: PURCHASE_TERMS_UPDATED },
    refund: { url: "/resume-builder/refund-policy", updated: PURCHASE_TERMS_UPDATED, sections: RESUME_REFUND_POLICY_SECTIONS },
    aiDisclosure: { url: "/resume-builder/ai-disclosure", updated: "September 24, 2026" },
  },
});

export function acceptsCurrentPurchaseTerms(body: Record<string, unknown> | null): boolean {
  return body?.accepted === true && body.policyVersion === PURCHASE_TERMS_VERSION;
}
