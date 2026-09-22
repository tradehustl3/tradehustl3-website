import type { Metadata } from "next";
import Image from "next/image";
import { AccountStart } from "./account-start";
import { FlowSteps } from "./flow-steps";
import { ResumeBuilderStartAnalytics } from "./funnel-analytics";
import { ResumeBuilderHeader } from "./resume-builder-header";
import { SITE_NAME, SITE_URL } from "../site";
import type { TradeTrack } from "./trade-content";
import {
  TRADE_LANDING_PAGES,
  tradeLandingForTrack,
  tradeLandingPath,
} from "./trade-landing-content";

const PAGE_TITLE = "Skilled Trades Resume Examples & Builder | TRADE HUSTL3";
const PAGE_DESCRIPTION =
  "See skilled trades resume examples for HVAC, electrical, plumbing, carpentry, facilities maintenance, welding, and general labor—then build yours for $9.99 one-time.";

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/resume-builder" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "/resume-builder",
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/optimized/og.webp",
        width: 1200,
        height: 630,
        alt: "TRADE HUSTL3 skilled trades resume examples and builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ["/optimized/og.webp"],
  },
};

const tradeTracks: TradeTrack[] = [
  "HVAC & Refrigeration",
  "Electrical",
  "Plumbing",
  "Construction & Carpentry",
  "Facilities Maintenance",
  "Welding & Fabrication",
  "General Labor / Trade Helper",
];

const resumeChecklist = [
  "A target job title that matches the work you are applying for",
  "Licenses, certifications, and safety training—with accurate level, jurisdiction, and status",
  "Trade-specific systems, tools, equipment, materials, and processes you have actually used",
  "Work history bullets that show action, scope, quality, safety, uptime, speed, or customer impact",
  "Numbers you can verify: work orders, service calls, units, footage, crew size, project value, or time saved",
];

const tradeExamples = [
  {
    trade: "HVAC & Refrigeration",
    href: "/resume-builder/hvac",
    role: "HVAC technician",
    bullet:
      "Completed preventive maintenance on [number] rooftop units across [number] commercial sites, documented operating readings, and escalated failed components before breakdowns.",
  },
  {
    trade: "Electrical",
    href: "/resume-builder/electrician",
    role: "Electrician",
    bullet:
      "Bent and installed [feet] feet of EMT, pulled conductors, and completed labeled terminations for [project type] under journeyman supervision.",
  },
  {
    trade: "Plumbing",
    href: "/resume-builder/plumbing",
    role: "Plumber",
    bullet:
      "Handled [number] weekly service calls involving fixture repairs, drain clearing, leak isolation, and water-heater troubleshooting while recording parts and completed work.",
  },
  {
    trade: "Construction & Carpentry",
    href: "/resume-builder/construction-carpentry",
    role: "Carpenter",
    bullet:
      "Laid out and framed [square feet] of walls from plans, verified openings and elevations, and corrected punch-list items before inspection.",
  },
  {
    trade: "Facilities Maintenance",
    href: "/resume-builder/facilities-maintenance",
    role: "Maintenance technician",
    bullet:
      "Closed [number] monthly preventive and corrective work orders across plumbing, electrical, HVAC, and door hardware while keeping CMMS notes current.",
  },
  {
    trade: "Welding & Fabrication",
    href: "/resume-builder/welding-fabrication",
    role: "Welder / fabricator",
    bullet:
      "Fit and welded [number] assemblies from blueprints using [process] in [positions], then verified dimensions and completed visual quality checks.",
  },
  {
    trade: "General Labor / Maintenance",
    href: "/resume-builder/general-labor",
    role: "General laborer",
    bullet:
      "Loaded, staged, and tracked [quantity] of material per shift while maintaining clear work zones and completing assigned safety checks.",
  },
];

const hubFaqs = [
  {
    question: "What should a skilled trades resume include?",
    answer:
      "Lead with the trade and role you are targeting. Then show relevant licenses and training, the tools and systems you have actually used, and experience bullets that explain what you did, the scope, and the result. Keep every claim accurate and easy to verify.",
  },
  {
    question: "What is the best format for a tradesman resume?",
    answer:
      "A clear reverse-chronological format works for most experienced tradespeople. Use standard section headings, plain text, consistent dates, and concise bullets so both hiring managers and applicant tracking systems can read it. One page is often enough early in a career; two pages can make sense when the extra experience is relevant.",
  },
  {
    question: "How do I write quantified accomplishment bullets?",
    answer:
      "Start with an action, name the work, add a number you can support, and finish with the result or context. Useful numbers include work orders closed, service calls per week, equipment counts, footage installed, crew size, square footage, downtime reduced, or inspection results.",
  },
  {
    question: "How do I write a skilled trades resume with no experience?",
    answer:
      "Use truthful evidence from apprenticeships, classroom labs, union or technical-school training, supervised projects, volunteer work, and transferable jobs. Highlight safety habits, dependable attendance, physical work, tool familiarity, and completed training without presenting practice as paid field experience.",
  },
  {
    question: "Should I use the same resume for every trade job?",
    answer:
      "Keep one accurate base resume, then adjust the target title, summary, skills order, and most relevant bullets for each opening. Mirror the employer's language only when it truthfully describes your background.",
  },
  {
    question: "Which skilled trades does the TRADE HUSTL3 builder cover?",
    answer:
      "The guided builder covers HVAC and refrigeration, electrical, plumbing, construction and carpentry, facilities maintenance, welding and fabrication, and general labor or trade-helper work. The package is $9.99 one-time after you review the protected preview.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/resume-builder#webpage`,
      url: `${SITE_URL}/resume-builder`,
      name: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${SITE_URL}/resume-builder#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Skilled Trades Resume Examples & Builder",
          item: `${SITE_URL}/resume-builder`,
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/resume-builder#faq`,
      mainEntity: hubFaqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ],
};

export default function ResumeBuilderPage() {
  return (
    <main className="rb-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ResumeBuilderStartAnalytics />
      <ResumeBuilderHeader />
      <FlowSteps current={1} />

      <section className="rb-entry">
        <div className="rb-entry-copy">
          <Image
            src="/trade-landings/trade-hustl3-resume-builder-hero.webp"
            alt="TRADE HUSTL3 Resume Builder commercial construction worksite for skilled trades"
            width={1024}
            height={576}
            priority
            sizes="(max-width: 900px) 100vw, 58vw"
            style={{ width: "100%", height: "auto", borderRadius: "18px", display: "block", marginBottom: "24px" }}
          />
          <p className="rb-kicker">/ BUILT FOR SKILLED WORK</p>
          <h1>SKILLED TRADES RESUME EXAMPLES. <span>BUILD YOUR OWN.</span></h1>
          <p className="rb-lead">
            See what strong, truthful resume bullets look like across seven skilled trades. Then give us your actual tools, tickets, field hours, and responsibilities to preview a tailored, ATS-friendly resume before paying $9.99.
          </p>
          <a className="rb-button rb-button-primary" href="#account-title" data-analytics-event="cta_click" data-location="resume_builder_home_hero" data-destination="#account-title">
            BUILD MY RESUME →
          </a>
          <div className="rb-proof-row" aria-label="Resume Builder package details">
            <div><strong>$9.99</strong><span>One-time · no subscription</span></div>
            <div><strong>7</strong><span>Skilled-trade tracks</span></div>
            <div><strong>3</strong><span>Corrections within 7 days</span></div>
          </div>
        </div>

        <aside className="rb-entry-panel" aria-labelledby="account-title">
          <p className="rb-panel-index">ACCOUNT · STAGE 1 OF 5</p>
          <h2 id="account-title">START YOUR RESUME</h2>
          <p>Create your verified account first. Your intake is saved to your account—not just this device.</p>
          <AccountStart />
          <ol className="rb-stage-map" aria-label="How it works">
            <li>Account</li><li>Build</li><li>Preview</li><li>Unlock</li><li>Download</li>
          </ol>
        </aside>
      </section>

      <section className="rb-hub-guide" aria-labelledby="resume-guide-title">
        <header className="rb-hub-section-heading">
          <p className="rb-kicker">/ SKILLED TRADES RESUME GUIDE</p>
          <h2 id="resume-guide-title">SHOW THE WORK. PROVE THE VALUE.</h2>
          <p>
            A strong trades resume does more than list duties. It helps a hiring manager see your level,
            your field range, and the evidence behind your work—without inventing experience.
          </p>
        </header>

        <div className="rb-hub-checklist-grid">
          <article className="rb-hub-checklist">
            <p className="rb-hub-eyebrow">WHAT EVERY SKILLED TRADES RESUME NEEDS</p>
            <ul>
              {resumeChecklist.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
          <article className="rb-hub-formula">
            <p className="rb-hub-eyebrow">A SIMPLE BULLET FORMULA</p>
            <h3>ACTION + WORK + SCOPE + RESULT</h3>
            <p>
              Instead of “responsible for maintenance,” try: “Completed [number] preventive-maintenance
              work orders per month across [equipment or area], documenting findings and corrective work in [CMMS].”
            </p>
            <small>Replace every bracket with a fact you can support. If you do not know a number, describe the verified scope clearly.</small>
          </article>
        </div>

        <div className="rb-hub-examples-heading">
          <div>
            <p className="rb-hub-eyebrow">SEVEN REALISTIC STARTING POINTS</p>
            <h2>SKILLED TRADES RESUME EXAMPLES</h2>
          </div>
          <p>Use these as patterns—not claims. Open the matching trade guide for skills, tools, certifications, and more examples.</p>
        </div>

        <div className="rb-hub-example-grid">
          {tradeExamples.map((example, index) => (
            <article className="rb-hub-example-card" key={example.trade}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{example.role}</p>
              <h3><a href={example.href}>{example.trade} resume example</a></h3>
              <blockquote>“{example.bullet}”</blockquote>
            </article>
          ))}
        </div>

        <p className="rb-hub-disclaimer">
          These are examples of how to structure resume bullets. TRADE HUSTL3 does not invent jobs,
          licenses, measurements, tools, or results. Your finished resume should contain only your real experience.
        </p>
        <a
          className="rb-button rb-button-primary rb-hub-guide-cta"
          href="#account-title"
          data-analytics-event="cta_click"
          data-location="resume_builder_home_examples"
          data-destination="#account-title"
        >
          BUILD MY $9.99 RESUME →
        </a>
      </section>

      <section className="rb-package" aria-labelledby="package-title">
        <div>
          <p className="rb-kicker">/ ONE STRAIGHTFORWARD PACKAGE</p>
          <h2 id="package-title">PREVIEW FIRST. PAY ONCE.</h2>
        </div>
        <div className="rb-package-card">
          <div className="rb-package-price"><span>$</span><strong>9</strong><sup>99</sup></div>
          <p>Your first resume is built before checkout. Review the protected logo-watermarked preview, then pay once to unlock the complete resume + matching cover letter package.</p>
          <ul>
            <li><span>✓</span> One completed resume · watermarked preview before payment</li>
            <li><span>✓</span> Matching cover letter included at no extra cost</li>
            <li><span>✓</span> ATS-friendly structure across seven trade tracks</li>
            <li><span>✓</span> Up to 3 corrections within 7 days</li>
            <li><span>✓</span> Clean resume + cover letter PDF and editable DOCX files after payment</li>
            <li><span>✓</span> No subscription · no auto-renewal</li>
          </ul>
        </div>
      </section>

      <section className="rb-tracks" aria-labelledby="tracks-title">
        <div>
          <p className="rb-kicker">/ SEVEN TRADE TRACKS</p>
          <h2 id="tracks-title">YOUR WORK HAS A LANGUAGE. WE KNOW IT.</h2>
        </div>
        <div>
          <ol>
            {tradeTracks.map((track, index) => {
              const landing = tradeLandingForTrack(track);
              return (
                <li key={track}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {landing ? <a href={tradeLandingPath(landing)}>{track}</a> : track}
                </li>
              );
            })}
          </ol>
          <p className="rb-tracks-note">
            Building for one trade? Each guide below has the skills, certifications, tools, and example
            resume bullets for that trade — then the same guided intake and $9.99 package.
          </p>
          <ul className="rb-tracks-guides" aria-label="Trade-specific Resume Builder guides">
            {TRADE_LANDING_PAGES.map((page) => (
              <li key={page.slug}>
                <a href={tradeLandingPath(page)}>{page.shortName}</a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rb-hub-faq" aria-labelledby="hub-faq-title">
        <header className="rb-hub-section-heading">
          <p className="rb-kicker">/ SKILLED TRADES RESUME FAQ</p>
          <h2 id="hub-faq-title">STRAIGHT ANSWERS BEFORE YOU BUILD.</h2>
        </header>
        <div className="rb-hub-faq-list">
          {hubFaqs.map((faq, index) => (
            <details key={faq.question} open={index === 0}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
        <div className="rb-hub-closing-cta">
          <div>
            <p className="rb-hub-eyebrow">READY TO USE YOUR REAL EXPERIENCE?</p>
            <h2>PREVIEW THE RESUME. THEN PAY ONCE.</h2>
            <p>Build first, review the protected preview, and unlock the resume plus matching cover letter for $9.99—no subscription.</p>
          </div>
          <a
            className="rb-button rb-button-primary"
            href="#account-title"
            data-analytics-event="cta_click"
            data-location="resume_builder_home_faq"
            data-destination="#account-title"
          >
            START MY FREE PREVIEW →
          </a>
        </div>
      </section>

      <footer className="rb-footer">
        <strong>TRADE HUSTL<span>3</span></strong>
        <p>Built by Trades. Backed by HUSTL3.</p>
        <div className="rb-footer-links"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/resume-builder/refund-policy">Refunds</a><a href="/resume-builder/ai-disclosure">AI disclosure</a><a href="/data-deletion">Data requests</a><a href="/contact">Support</a></div>
        <small>© 2026 TRADE HUSTL3. All grit reserved.</small>
      </footer>
    </main>
  );
}
