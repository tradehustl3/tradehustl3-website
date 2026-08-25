import type { Metadata } from "next";
import { PolicyPage, PolicySection, SUPPORT_EMAIL } from "../policy-page";

export const metadata: Metadata = { title: "Account and Data Requests", alternates: { canonical: "/data-deletion" } };

export default function DataDeletionPage() {
  return (
    <PolicyPage eyebrow="YOUR DATA" title="ACCOUNT + DATA REQUESTS" summary="How to request access, correction, or deletion of information connected to your TRADE HUSTL3 account.">
      <PolicySection title="Submit a request"><p>Email <a href={`mailto:${SUPPORT_EMAIL}?subject=Account%20and%20data%20request`}>{SUPPORT_EMAIL}</a> from the email connected to your account. Use the subject “Account and data request” and state whether you are requesting access, correction, or deletion.</p></PolicySection>
      <PolicySection title="Verification"><p>To protect your resume and account, we may ask you to confirm control of the connected email or provide limited order information. Do not send a password, Social Security number, or complete card number.</p></PolicySection>
      <PolicySection title="What deletion covers"><p>Once verified, a deletion request may cover account-profile information, resume intake, generated resume content, correction requests, and stored resume files that TRADE HUSTL3 LLC is not required to retain.</p></PolicySection>
      <PolicySection title="Information we may retain"><p>We may retain limited payment, tax, refund, fraud-prevention, dispute, consent, security, and legal records when reasonably necessary or required by law. Retained records are not used to continue providing the deleted account.</p></PolicySection>
      <PolicySection title="Timing"><p>We aim to acknowledge requests within two business days and complete verified requests within 30 days, unless additional time is permitted or required by applicable law. We will notify you when the request is completed or if we need more information.</p></PolicySection>
    </PolicyPage>
  );
}
