import type { Metadata } from "next";
import { PolicyPage, PolicySection, SUPPORT_EMAIL } from "../policy-page";

export const metadata: Metadata = { title: "Contact Support", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <PolicyPage eyebrow="WE HAVE YOUR BACK" title="CONTACT SUPPORT" summary="One clear contact for Resume Builder, book delivery, payments, refunds, and privacy requests.">
      <div className="policy-contact-card"><span>Customer support</span><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a><p>TRADE HUSTL3 LLC · Atlanta, Georgia</p></div>
      <PolicySection title="What we can help with"><ul><li>Missing magic-link or account access</li><li>Resume generation, correction, preview, PDF, or DOCX problems</li><li>Payment, duplicate charge, or refund questions</li><li>Missing free guide or purchased eBook delivery</li><li>Privacy, account access, correction, or deletion requests</li><li>General TRADE HUSTL3 questions</li></ul></PolicySection>
      <PolicySection title="What to include"><p>Email us from the address connected to your account or order. Include your name, the product involved, approximate purchase date, and a clear description of the issue. Do not send passwords, Social Security numbers, or complete card information.</p></PolicySection>
      <PolicySection title="Response target"><p>We aim to respond within two business days. Complex payment, privacy, or security matters may require additional verification and time.</p></PolicySection>
    </PolicyPage>
  );
}
