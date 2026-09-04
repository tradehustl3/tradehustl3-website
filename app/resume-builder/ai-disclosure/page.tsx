import type { Metadata } from "next";
import { PolicyPage, PolicySection, SUPPORT_EMAIL } from "../../policy-page";

export const metadata: Metadata = { title: "Resume Builder AI Disclosure", alternates: { canonical: "/resume-builder/ai-disclosure" } };

export default function AiDisclosurePage() {
  return (
    <PolicyPage eyebrow="HUMAN FACTS. AI ASSISTED." title="AI DISCLOSURE" summary="How artificial intelligence assists the TRADE HUSTL3 Resume Builder and what every customer must review.">
      <PolicySection title="How AI is used"><p>The Resume Builder uses Google&apos;s Gemini model through Vertex AI to organize and rewrite information supplied by the customer into an ATS-friendly resume. Anthropic&apos;s Claude model may be used temporarily if the Gemini service requires a controlled rollback. AI also assists with customer-requested corrections. It does not independently verify your employment, credentials, licenses, education, or identity.</p></PolicySection>
      <PolicySection title="Truth safeguards"><p>The system instructs the model to use only customer-provided facts and includes automated checks designed to reject unsupported numeric claims and incomplete output. These safeguards reduce risk but cannot guarantee that every statement, omission, or formatting decision is correct.</p></PolicySection>
      <PolicySection title="Your review is required"><p>You must review all names, contact details, employers, job titles, dates, licenses, certifications, education, duties, metrics, and other claims before submitting the resume to an employer. Request a correction when something is inaccurate or unclear.</p></PolicySection>
      <PolicySection title="No hiring guarantee"><p>AI-assisted output does not guarantee ATS acceptance, interviews, job offers, compensation, licensing, or any particular employment outcome. Employers and hiring systems make independent decisions.</p></PolicySection>
      <PolicySection title="Information processing"><p>Your intake, existing generated resume, target job posting, and correction request may be processed by Google Cloud or, during a controlled rollback, Anthropic to provide the service. Do not enter sensitive information that does not belong on a resume.</p></PolicySection>
      <PolicySection title="Questions"><p>If you believe generated content is inaccurate or unsafe, stop using that version and contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p></PolicySection>
    </PolicyPage>
  );
}
