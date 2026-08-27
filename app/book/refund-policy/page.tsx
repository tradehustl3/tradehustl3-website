import type { Metadata } from "next";
import { PolicyPage, PolicySection, SUPPORT_EMAIL } from "../../policy-page";

export const metadata: Metadata = { title: "eBook Delivery and Refund Policy", alternates: { canonical: "/book/refund-policy" } };

export default function EbookPolicyPage() {
  return (
    <PolicyPage eyebrow="DIRECT EBOOK" title="DELIVERY + REFUNDS" summary="Delivery, permitted use, and refund terms for the direct TRADE HUSTL3 eBook.">
      <PolicySection title="Release and delivery"><p>The direct eBook is scheduled for release on September 15, 2026. After a successful eligible purchase, a protected PDF download link is sent to the email address used at checkout. Delivery may take several minutes. Check spam and promotions folders before requesting assistance.</p></PolicySection>
      <PolicySection title="Your email responsibility"><p>You are responsible for entering a working email address you control. If you used the wrong email or did not receive delivery, contact us so we can verify the order and attempt redelivery.</p></PolicySection>
      <PolicySection title="Refund eligibility"><p>Duplicate charges and permanent nondelivery that TRADE HUSTL3 LLC cannot correct qualify for review and, when confirmed, a refund. Except when required by law, change-of-mind refunds are not offered after the protected digital product has been successfully delivered or accessed.</p></PolicySection>
      <PolicySection title="Personal-use license"><p>Your purchase grants you a personal, non-transferable license to read the eBook. You may not upload, share, reproduce, distribute, resell, sublicense, publish, or make the file publicly available.</p></PolicySection>
      <PolicySection title="Request support"><p>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the name and email used at checkout, approximate purchase date, and the delivery problem. Never send complete card details by email.</p></PolicySection>
      <PolicySection title="Payment reversal"><p>Approved refunds are returned to the original payment method. A full refund revokes any pending delivery and future download access. A partial refund keeps the order active unless TRADE HUSTL3 LLC confirms otherwise in writing. Processing time depends on the bank or card issuer. Nothing in this policy limits rights available under applicable law.</p></PolicySection>
    </PolicyPage>
  );
}
