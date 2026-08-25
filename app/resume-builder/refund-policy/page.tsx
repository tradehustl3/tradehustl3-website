import type { Metadata } from "next";
import { PolicyPage, PolicySection, SUPPORT_EMAIL } from "../../policy-page";

export const metadata: Metadata = { title: "Resume Builder Refund Policy", alternates: { canonical: "/resume-builder/refund-policy" } };

export default function ResumeRefundPolicyPage() {
  return (
    <PolicyPage eyebrow="RESUME BUILDER" title="REFUND POLICY" summary="A straightforward policy for the $9.99 one-time TRADE HUSTL3 Resume Builder purchase.">
      <PolicySection title="What the purchase includes"><p>Your $9.99 payment covers one initial AI-assisted resume build, a watermarked review copy, up to three AI-assisted corrections during the seven-day correction period, and clean PDF and editable DOCX downloads.</p></PolicySection>
      <PolicySection title="When a refund is available"><p>A full refund is available when TRADE HUSTL3 LLC permanently cannot generate or deliver the purchased resume after a reasonable opportunity to correct the problem. Duplicate charges and charges confirmed to be unauthorized will also be reviewed and corrected as appropriate.</p></PolicySection>
      <PolicySection title="Failed attempts"><p>A generation attempt that fails before successful delivery is designed not to consume one of your four permitted AI runs. Your payment remains attached to the paid resume while you retry or correct required intake information.</p></PolicySection>
      <PolicySection title="When a refund is normally unavailable"><p>Except when required by law, refunds are normally unavailable because you changed your mind after generation began, did not use all corrections, entered inaccurate or incomplete information, missed the correction window, or did not receive an interview or job.</p></PolicySection>
      <PolicySection title="Effect of refunds"><p>A partial refund does not revoke access unless the original $9.99 charge has been fully refunded. A full refund revokes the related entitlement, including remaining generation, correction, preview, and download access.</p></PolicySection>
      <PolicySection title="How to request help"><p>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the email connected to your account. Include your name, purchase email, approximate purchase date, and a brief description of the problem. Do not email complete card information.</p></PolicySection>
      <PolicySection title="Processing time"><p>Approved refunds are submitted to the original payment method. Your bank or card issuer controls when the credit appears. This policy does not limit rights that cannot be waived under applicable law.</p></PolicySection>
    </PolicyPage>
  );
}
