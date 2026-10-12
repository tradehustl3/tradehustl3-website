import type { Metadata } from "next";
import { PolicyPage, PolicySection, SUPPORT_EMAIL } from "../../policy-page";
import { PURCHASE_TERMS_UPDATED, PURCHASE_TERMS_VERSION, RESUME_REFUND_POLICY_SECTIONS } from "../../../shared/purchase-terms";

const PAGE_DESCRIPTION = "A straightforward policy for the $9.99 one-time TRADE HUSTL3 Resume Builder purchase.";

export const metadata: Metadata = { title: "Resume Builder Refund Policy", description: PAGE_DESCRIPTION, alternates: { canonical: "/resume-builder/refund-policy" } };

export default function ResumeRefundPolicyPage() {
  return (
    <PolicyPage eyebrow="RESUME BUILDER" title="REFUND POLICY" summary={PAGE_DESCRIPTION} updated={PURCHASE_TERMS_UPDATED}>
      <p>Policy version: {PURCHASE_TERMS_VERSION}</p>
      {RESUME_REFUND_POLICY_SECTIONS.map((section) => {
        const parts = section.text.split(SUPPORT_EMAIL);
        return <PolicySection key={section.title} title={section.title}><p>{parts[0]}{parts.length > 1 ? <><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{parts[1]}</> : null}</p></PolicySection>;
      })}
    </PolicyPage>
  );
}
