import type { Metadata } from "next";
import Link from "next/link";
import { CtaAnalytics } from "../../cta-analytics";
import { ResumeBuilderHeader } from "../../resume-builder/resume-builder-header";
import { intakeEntryHref } from "../../resume-builder/trade-preselect";
import { SITE_NAME, SITE_URL } from "../../site";
// Shared page chrome (hero, sections, FAQ, closing CTA) keeps the guides visually consistent.
import shared from "../skilled-trades/skilled-trades.module.css";
import styles from "./maintenance-resume-tips.module.css";

/**
 * How-to guide for writing a maintenance resume.
 *
 * Search intent is deliberately separate from `/resume-builder/facilities-maintenance`,
 * which owns "facility maintenance resume (example)" queries. This page answers
 * "how do I write one" and hands readers to that example and the builder.
 */
const PAGE_PATH = "/resume-examples/maintenance-resume-tips";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PAGE_TITLE = "How to Write a Maintenance Resume: 4 Fixes | TRADE HUSTL3";
const PAGE_HEADLINE = "How to write a maintenance resume that shows the whole job";
const PAGE_DESCRIPTION =
  "How to write a maintenance resume: list skills by system, turn duties into proof, put EPA 608 and OSHA cards up top, and keep it ATS-friendly.";
const PUBLISHED_AT = "2026-10-14";
const EXAMPLE_PATH = "/resume-builder/facilities-maintenance";
const ANALYTICS_ITEM = "maintenance_resume_tips";
const BUILDER_HREF = intakeEntryHref("Facilities Maintenance");

const EPA_608_SOURCE = "https://www.epa.gov/section608/section-608-technician-certification-0";
const OSHA_OUTREACH_SOURCE = "https://www.osha.gov/training/outreach";

const fixes = [
  { id: "systems", label: "List skills by system" },
  { id: "proof", label: "Turn duties into proof" },
  { id: "credentials", label: "Put credentials up top" },
  { id: "ats", label: "Keep it ATS-friendly" },
];

const systemGroups = [
  { system: "HVAC", work: "Filter and belt changes, coil cleaning, thermostat replacement, basic diagnostics on rooftop units and split systems" },
  { system: "Plumbing", work: "Fixture and flush valve repair, leak repair, drain clearing, water heater service" },
  { system: "Electrical", work: "Outlets, switches, lighting and ballast replacement, basic troubleshooting" },
  { system: "Building repair", work: "Drywall, painting, doors and hardware, ceiling tiles, basic carpentry" },
  { system: "Operations", work: "Work orders, preventive maintenance schedules, after-hours emergency response" },
];

const rewrites = [
  {
    weak: "Did repairs around the building.",
    strong: "Completed [number] work orders a week for plumbing, electrical and HVAC repairs across a [type of building, e.g. 4-story office].",
  },
  {
    weak: "Did preventive maintenance.",
    strong: "Ran the monthly PM schedule on [equipment, e.g. air handlers, boilers, pumps] and logged readings in [system, e.g. the work-order app].",
  },
  {
    weak: "On call.",
    strong: "Handled after-hours emergency calls for [leaks, loss of heat, power issues] on a rotating on-call schedule.",
  },
  {
    weak: "Helped with turnovers.",
    strong: "Turned [number] apartment units a month: paint, fixtures, appliances and final walk-through.",
  },
];

const credentials = [
  {
    name: "EPA Section 608",
    detail:
      "Required by the EPA for technicians who maintain, service, repair or dispose of equipment that could release refrigerants. List your type: Type I, Type II, Type III or Universal.",
  },
  {
    name: "OSHA 10-Hour or 30-Hour card",
    detail:
      "A completion card from OSHA’s voluntary Outreach Training Program. It is not a certification, so list it as a card or training. It still shows you know jobsite safety.",
  },
  {
    name: "State or city licenses",
    detail:
      "Requirements vary by state and city. Check with your local licensing board and list exactly what you hold, with the license type and expiration.",
  },
];

const atsChecklist = [
  { title: "One column", body: "A single column reads top to bottom the way parsers expect." },
  { title: "Standard headings", body: "Summary, Skills, Certifications, Experience, Education." },
  { title: "The posting’s words", body: "Reuse its terms where they truthfully describe your work." },
  { title: "No layout tricks", body: "Skip tables, text boxes and graphics on the resume itself." },
];

const faqItems = [
  {
    question: "Is an OSHA 10 card a certification?",
    answer:
      "No. OSHA’s Outreach Training Program is voluntary, and completing a 10-hour or 30-hour course earns a completion card, not a certification. List it as “OSHA 10-Hour card” or “OSHA 30-Hour card” under training or credentials.",
  },
  {
    question: "What if I have only done part of the work on a system?",
    answer:
      "Describe the part you did. If you have changed filters and belts on rooftop units but not diagnosed them, say that instead of “HVAC repair.” Interviewers ask follow-up questions, and an accurate list holds up.",
  },
  {
    question: "Should I copy wording from the job posting?",
    answer:
      "Reuse the posting’s terms, such as preventive maintenance, work orders or CMMS, only where they accurately describe work you have done. Matching language helps an applicant tracking system find you; claiming work you have not done does not.",
  },
  {
    question: "Where can I see a complete maintenance resume?",
    answer:
      "The TRADE HUSTL3 facility maintenance resume example shows every section together, with fill-in brackets for your own details and guidance for apartment, commercial and warehouse building work.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${PAGE_URL}#article`,
      headline: PAGE_HEADLINE,
      description: PAGE_DESCRIPTION,
      url: PAGE_URL,
      datePublished: PUBLISHED_AT,
      dateModified: PUBLISHED_AT,
      inLanguage: "en-US",
      mainEntityOfPage: PAGE_URL,
      author: { "@id": `${SITE_URL}/#organization` },
      publisher: { "@id": `${SITE_URL}/#organization` },
      image: `${SITE_URL}/optimized/og-resume-v3.jpg`,
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Resume Examples", item: `${SITE_URL}/resume-examples` },
        { "@type": "ListItem", position: 3, name: "Maintenance Resume Tips", item: PAGE_URL },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${PAGE_URL}#faq`,
      mainEntity: faqItems.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ],
};

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_PATH,
    siteName: SITE_NAME,
    locale: "en_US",
    type: "article",
    images: [{ url: "/optimized/og-resume-v3.jpg", type: "image/jpeg", width: 1200, height: 630, alt: PAGE_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ["/optimized/og-resume-v3.jpg"],
  },
};

function BuilderCta({ location, label, className = "" }: { location: string; label: string; className?: string }) {
  return (
    <a
      className={`rb-button rb-button-primary ${className}`.trim()}
      href={BUILDER_HREF}
      data-analytics-event="cta_click"
      data-location={location}
      data-destination={BUILDER_HREF}
      data-item={ANALYTICS_ITEM}
    >
      <span>{label}</span><span aria-hidden="true">→</span>
    </a>
  );
}

function FixHeader({ index, id, kicker, title, intro }: { index: number; id: string; kicker: string; title: string; intro: string }) {
  return (
    <header className={shared.sectionIntro}>
      <p className="rb-kicker">FIX {index} · {kicker}</p>
      <h2 id={`${id}-title`}>{title}</h2>
      <p>{intro}</p>
    </header>
  );
}

export default function MaintenanceResumeTipsPage() {
  return (
    <main className={`rb-page ${shared.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CtaAnalytics />
      <ResumeBuilderHeader action={
        <BuilderCta location="maintenance_tips_header" label="Build my resume" className="rb-header-cta" />
      } />

      <section className={shared.hero} aria-labelledby="page-title">
        <div className={shared.heroCopy}>
          <p className="rb-kicker">MAINTENANCE RESUME GUIDE</p>
          <h1 id="page-title">{PAGE_HEADLINE}</h1>
          <p className={shared.heroLead}>
            You can fix a leaking flush valve, reset a tripped rooftop unit and patch drywall before lunch. A resume
            that says “general maintenance” tells a hiring manager none of that. Facilities maintenance is one of the
            few trades where being good at a lot of things <em>is</em> the job, so your resume has to prove you can
            cover the whole building. These four fixes show how.
          </p>
          <div className={shared.heroActions}>
            <BuilderCta location="maintenance_tips_hero" label="Build free · unlock for $9.99" />
            <Link className={shared.catalogLink} href={EXAMPLE_PATH}>
              See the complete example <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <aside className={shared.heroPanel} aria-label="The four fixes">
          <p className="rb-kicker">THE 4 FIXES</p>
          <ol className={styles.fixList}>
            {fixes.map((fix, index) => (
              <li key={fix.id}><span>{String(index + 1).padStart(2, "0")}</span><a href={`#${fix.id}`}>{fix.label}</a></li>
            ))}
          </ol>
        </aside>
      </section>

      <section id="systems" className={`${shared.section} ${shared.methodSection}`} aria-labelledby="systems-title">
        <FixHeader index={1} id="systems" kicker="SKILLS" title="Lead with the systems you actually work on"
          intro="Put a skills section near the top and group it by system, so a hiring manager can scan it in seconds." />
        <ul className={styles.systemGrid}>
          {systemGroups.map((group) => (
            <li key={group.system}><strong>{group.system}</strong><span>{group.work}</span></li>
          ))}
        </ul>
        <p className={shared.integrityNote}>
          <strong>Only list what you have done.</strong> If you have only changed filters on a rooftop unit, say that,
          not “HVAC repair.” A good interviewer will ask, and an honest list protects you.
        </p>
      </section>

      <section id="proof" className={`${shared.section} ${shared.examplesSection}`} aria-labelledby="proof-title">
        <FixHeader index={2} id="proof" kicker="EXPERIENCE" title="Turn duties into proof"
          intro="Most maintenance resumes list duties. Strong ones show scope: what kind of building, how much work, and what you were trusted with." />
        <div className={styles.rewriteList}>
          {rewrites.map((rewrite) => (
            <div className={shared.beforeAfter} key={rewrite.weak}>
              <article><p className={shared.label}>Weak bullet</p><p>{rewrite.weak}</p></article>
              <article><p className={shared.label}>Stronger bullet</p><p>{rewrite.strong}</p></article>
            </div>
          ))}
        </div>
        <p className={shared.integrityNote}>
          <strong>Replace every bracket with your own real numbers.</strong> Start each bullet with a verb such as
          completed, replaced, diagnosed, ran or trained, and leave out anything you cannot back up in an interview.
        </p>
      </section>

      <section id="credentials" className={`${shared.section} ${shared.methodSection}`} aria-labelledby="credentials-title">
        <FixHeader index={3} id="credentials" kicker="CREDENTIALS" title="Put credentials where they can’t be missed"
          intro="Give credentials their own section near the top of the page, not buried at the bottom." />
        <ul className={styles.credentialGrid}>
          {credentials.map((credential) => (
            <li key={credential.name}><strong>{credential.name}</strong><span>{credential.detail}</span></li>
          ))}
        </ul>
        <p className={styles.sourceNote}>
          Sources: <a href={EPA_608_SOURCE} rel="noopener">EPA Section 608 Technician Certification</a> ·{" "}
          <a href={OSHA_OUTREACH_SOURCE} rel="noopener">OSHA Outreach Training Program</a>
        </p>
      </section>

      <section id="ats" className={`${shared.section} ${shared.checklistSection}`} aria-labelledby="ats-title">
        <FixHeader index={4} id="ats" kicker="FORMAT" title="Keep it clean and ATS-friendly"
          intro="Many employers run resumes through an applicant tracking system (ATS) before a person reads them. A clean layout keeps your experience readable to both." />
        <ul className={shared.checklist}>
          {atsChecklist.map((item) => (
            <li key={item.title}><strong>{item.title}</strong><span>{item.body}</span></li>
          ))}
        </ul>
        <BuilderCta location="maintenance_tips_checklist" label="Turn my experience into a free preview" />
      </section>

      <section className={`${shared.section} ${styles.exampleSection}`} aria-labelledby="example-title">
        <header className={shared.sectionIntro}>
          <p className="rb-kicker">PUT IT TOGETHER</p>
          <h2 id="example-title">See a complete maintenance resume</h2>
          <p>
            The facility maintenance resume example shows every section in order, with fill-in brackets for your own
            details and advice for apartment, commercial and warehouse building work.
          </p>
        </header>
        <div className={styles.nextLinks}>
          <Link href={EXAMPLE_PATH}>Facility maintenance resume example <span aria-hidden="true">→</span></Link>
          <Link href="/resume-examples/skilled-trades">Compare examples across seven trades <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className={`${shared.section} ${shared.faqSection}`} aria-labelledby="faq-title">
        <header className={shared.sectionIntro}>
          <p className="rb-kicker">MAINTENANCE RESUME FAQ</p>
          <h2 id="faq-title">Quick answers</h2>
        </header>
        <div className={shared.faqList}>
          {faqItems.map((faq, index) => (
            <details className={shared.faq} key={faq.question} open={index === 0}>
              <summary>{faq.question}</summary><p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={shared.finalCta} aria-labelledby="final-cta-title">
        <div>
          <p className="rb-kicker">BUILT FOR MAINTENANCE TECHS</p>
          <h2 id="final-cta-title">Build yours, see the preview, then decide.</h2>
          <p>
            The TRADE HUSTL3 Resume Builder asks about your actual work and turns it into a clean, ATS-friendly resume,
            with no invented experience. Review a free preview before you pay. One $9.99 payment unlocks your resume and
            a matching cover letter as PDF and DOCX, with up to three corrections. No subscription.
          </p>
          <p className={styles.sideNote}>
            Still choosing a trade? Get the free <a href="/top-10-trades">Top 10 Trades guide</a>.
          </p>
        </div>
        <BuilderCta location="maintenance_tips_closing" label="Build my maintenance resume" />
      </section>

      <footer className="rb-footer">
        <strong>TRADE HUSTL<span>3</span></strong><p>BUILT BY HUSTLE. BACKED BY TRADES.</p>
        <div className="rb-footer-links"><Link href="/#resume-start">Resume Builder</Link><Link href="/resume-examples">Resume Examples</Link><a href="/top-10-trades">Top 10 Trades</a>
          <a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Support</a></div>
      </footer>
    </main>
  );
}
