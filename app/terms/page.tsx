import type { Metadata } from "next";
import { PolicyPage, PolicySection, SUPPORT_EMAIL } from "../policy-page";

export const metadata: Metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <PolicyPage eyebrow="RULES OF THE PLATFORM" title="TERMS OF SERVICE" summary="The terms governing use of TRADE HUSTL3 LLC websites, digital products, and the Resume Builder.">
      <PolicySection title="1. Agreement"><p>By using this website, creating an account, joining an email list, or purchasing a product, you agree to these Terms, the Privacy Policy, and the policy that applies to your purchase. If you do not agree, do not use or purchase the service.</p></PolicySection>
      <PolicySection title="2. Eligibility"><p>You must be at least 18 years old to create a Resume Builder account or purchase a paid digital product. You must provide accurate information and use an email address you control.</p></PolicySection>
      <PolicySection title="3. Resume Builder purchase"><p>The Resume Builder creates one initial AI-assisted resume and protected watermarked preview before payment. The $9.99 one-time purchase removes the watermark, unlocks up to three AI-assisted corrections during the seven-day correction period, and provides clean PDF and editable DOCX files. It is not a subscription and does not renew automatically.</p></PolicySection>
      <PolicySection title="4. Your responsibilities"><p>You are responsible for the truth, accuracy, legality, and completeness of all information you submit. You must review all names, contact details, employers, dates, licenses, certifications, duties, measurements, and other claims before using the finished resume. Do not submit confidential information that is unnecessary for the service.</p></PolicySection>
      <PolicySection title="5. No employment guarantee"><p>The Resume Builder is a writing and formatting tool. TRADE HUSTL3 LLC does not guarantee ATS acceptance, interviews, employment, compensation, promotions, licensing, or any specific career outcome.</p></PolicySection>
      <PolicySection title="6. Book and digital content"><p>Books, samples, downloads, and related materials are licensed for the purchaser&apos;s personal use. You may not copy, upload, publish, resell, sublicense, distribute, or remove ownership notices from protected content.</p></PolicySection>
      <PolicySection title="7. Acceptable use"><p>You may not attempt to bypass payment or access controls; access another person&apos;s account or files; interfere with the service; use automated abuse, scraping, or attacks; submit unlawful or infringing material; or use the service to misrepresent qualifications or experience.</p></PolicySection>
      <PolicySection title="8. Payments and refunds"><p>Prices are shown in U.S. dollars. Stripe processes payments. Refund eligibility is governed by the applicable Resume Builder Refund Policy or eBook Delivery and Refund Policy, together with rights that cannot be waived under applicable law.</p></PolicySection>
      <PolicySection title="9. Availability"><p>We may maintain, update, suspend, or discontinue part of the service. If a paid product cannot be delivered as promised, contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> so we can correct the problem or determine refund eligibility.</p></PolicySection>
      <PolicySection title="10. Intellectual property"><p>TRADE HUSTL3, its logos, website design, books, protected downloads, prompts, templates, and original content belong to TRADE HUSTL3 LLC or its licensors. Purchasing a product does not transfer ownership of the underlying intellectual property.</p></PolicySection>
      <PolicySection title="11. Disclaimer and liability"><p>Services are provided on an “as available” basis to the extent permitted by law. TRADE HUSTL3 LLC is not responsible for hiring decisions, customer-supplied inaccuracies, misuse of generated content, or indirect or consequential losses. Nothing in these Terms excludes rights or liabilities that cannot legally be excluded.</p></PolicySection>
      <PolicySection title="12. Governing law and contact"><p>These Terms are governed by the laws of the State of Georgia, without regard to conflict-of-law principles. Questions or disputes should first be sent to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. TRADE HUSTL3 LLC is located in Atlanta, Georgia.</p></PolicySection>
    </PolicyPage>
  );
}
