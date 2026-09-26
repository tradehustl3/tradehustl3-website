import type { Metadata } from "next";
import Link from "next/link";
import { CtaAnalytics } from "../../cta-analytics";
import { ResumeBuilderHeader } from "../../resume-builder/resume-builder-header";
import { SITE_NAME, SITE_URL } from "../../site";
import styles from "./skilled-trades.module.css";

const PAGE_PATH = "/resume-examples/skilled-trades";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PAGE_TITLE = "Skilled Trades Resume Examples for 7 Trades | TRADE HUSTL3";
const PAGE_DESCRIPTION =
  "See field-specific resume examples for HVAC, electrical, plumbing, carpentry, facilities, welding, and general labor, then build a $9.99 resume package.";

type TradeExample = {
  id: string;
  trade: string;
  role: string;
  guideHref: string;
  summary: string;
  bullets: string[];
  skills: string[];
  credentials: string;
};

const tradeExamples: TradeExample[] = [
  {
    id: "hvac-refrigeration",
    trade: "HVAC & Refrigeration",
    role: "HVAC / Refrigeration Technician",
    guideHref: "/resume-builder/hvac",
    summary:
      "HVAC and refrigeration technician with [X] years of experience servicing [commercial/residential] systems, troubleshooting electrical and refrigerant-side faults, and completing preventive maintenance across [X] assets.",
    bullets: [
      "Diagnosed and completed [X]+ service calls per [week/month] across rooftop units, split systems, and refrigeration equipment, restoring operation on [X]% of first visits.",
      "Completed preventive maintenance on [X] assets per [month/quarter], documenting temperatures, electrical readings, filters, belts, and corrective actions.",
      "Used manifold gauges, multimeters, electronic leak detectors, and recovery equipment to locate faults and complete code-compliant repairs.",
    ],
    skills: ["Refrigeration diagnostics", "Electrical troubleshooting", "RTUs & split systems", "Preventive maintenance"],
    credentials: "EPA Section 608 [type, only if held] · OSHA [10/30, only if held]",
  },
  {
    id: "electrical",
    trade: "Electrical",
    role: "Electrician / Electrical Technician",
    guideHref: "/resume-builder/electrician",
    summary:
      "Electrical technician with [X] years supporting [commercial/industrial/residential] installation, troubleshooting, and maintenance work from plans and job specifications.",
    bullets: [
      "Bent and installed [X] feet of EMT, rigid, or PVC conduit for [project type], maintaining layout accuracy and required support spacing.",
      "Terminated and tested [X] circuits, panels, or control points per [week/project], documenting voltage, continuity, and torque checks.",
      "Troubleshot breakers, motors, contactors, and control circuits with a multimeter and clamp meter to isolate faults before repair.",
    ],
    skills: ["Conduit bending", "Panel terminations", "Motor controls", "Grounding & bonding"],
    credentials: "Electrical license or apprentice registration [state/level, only if held] · OSHA [10/30, only if held]",
  },
  {
    id: "plumbing",
    trade: "Plumbing",
    role: "Plumber / Plumbing Technician",
    guideHref: "/resume-builder/plumbing",
    summary:
      "Plumbing technician experienced in [service/new construction] work, including fixture repair, DWV and water distribution, drain clearing, and customer-facing diagnosis.",
    bullets: [
      "Resolved [X] residential or commercial service calls per [week/month], diagnosing leaks, clogs, failed valves, and water-heater issues.",
      "Installed and tested [X] feet of [copper/PEX/CPVC/PVC] piping for [project type], completing required pressure or leak checks.",
      "Used augers, sewer cameras, press tools, and locating equipment to identify causes and document recommended repairs.",
    ],
    skills: ["DWV rough-in", "Fixture installation", "Drain cleaning", "Water-heater service"],
    credentials: "Plumbing license or apprentice registration [state/level, only if held] · Backflow credential [only if held]",
  },
  {
    id: "construction-carpentry",
    trade: "Construction & Carpentry",
    role: "Carpenter / Construction Technician",
    guideHref: "/resume-builder/construction-carpentry",
    summary:
      "Carpenter and construction technician with hands-on experience in [framing/finish/formwork], plan reading, layout, material takeoffs, and jobsite coordination.",
    bullets: [
      "Framed [X] square feet of walls, floors, or roof assemblies for [project type], working from plans, elevations, and field measurements.",
      "Installed [X] doors, cabinets, trim runs, or hardware sets while tracking punch-list corrections through closeout.",
      "Coordinated daily material staging and tool setup for a crew of [X], helping keep [phase or scope] on schedule.",
    ],
    skills: ["Framing & layout", "Finish carpentry", "Blueprint reading", "Punch-list closeout"],
    credentials: "Carpentry apprenticeship [only if completed] · OSHA [10/30, only if held] · Equipment cards [only if held]",
  },
  {
    id: "facilities-maintenance",
    trade: "Facilities Maintenance",
    role: "Facilities / Maintenance Technician",
    guideHref: "/resume-builder/facilities-maintenance",
    summary:
      "Facilities maintenance technician supporting [X] square feet, [X] units, or [X] buildings through preventive maintenance, work-order response, and multi-trade repairs.",
    bullets: [
      "Closed [X] preventive and corrective work orders per [week/month] in [CMMS name], recording labor, parts, failure details, and follow-up needs.",
      "Maintained [X]% on-time PM completion across HVAC, lighting, plumbing, doors, pumps, motors, and life-safety support tasks.",
      "Responded to priority calls across [X] buildings or units, isolating the problem, making safe repairs, and coordinating vendors when required.",
    ],
    skills: ["CMMS work orders", "Preventive maintenance", "Multi-trade repair", "Vendor coordination"],
    credentials: "EPA 608 [only if held] · OSHA [10/30, only if held] · Lift or forklift card [only if held]",
  },
  {
    id: "welding-fabrication",
    trade: "Welding & Fabrication",
    role: "Welder / Fabricator",
    guideHref: "/resume-builder/welding-fabrication",
    summary:
      "Welder and fabricator experienced with [GMAW/FCAW/GTAW/SMAW], fit-up, blueprint and weld-symbol reading, and inspection-ready work on [materials/products].",
    bullets: [
      "Fit and welded [X] assemblies per [shift/week] using [process] in [positions], working to drawing dimensions and [tolerance, if documented].",
      "Prepared carbon steel, stainless, or aluminum with saws, grinders, plasma cutters, and fixtures before tack-up and final welding.",
      "Completed visual checks and [inspection type, if applicable], documenting repairs and maintaining material or weld traceability where required.",
    ],
    skills: ["Fit-up & tacking", "Weld-symbol reading", "MIG / TIG / stick", "Grinding & plasma cutting"],
    credentials: "AWS or ASME qualification [process/position, only if current] · OSHA [10/30, only if held]",
  },
  {
    id: "general-labor-maintenance",
    trade: "General Labor / Maintenance Technician",
    role: "General Laborer / Maintenance Helper",
    guideHref: "/resume-builder/general-labor",
    summary:
      "Reliable labor and maintenance professional experienced in material handling, work-order support, basic repairs, site cleanup, and safe use of hand and power tools.",
    bullets: [
      "Loaded, staged, or moved [X] pallets, deliveries, or material loads per [shift/week] using [equipment], verifying counts and safe placement.",
      "Completed [X] light-maintenance or PM tasks per [week/month], including filters, lubrication, hardware, patching, painting, and basic fixture repairs.",
      "Supported [X]-person crews with setup, cleanup, barricades, material runs, and documented work-order updates across [site type].",
    ],
    skills: ["Material handling", "Work-order support", "Basic repairs", "Hand & power tools"],
    credentials: "Forklift or lift card [only if held] · OSHA [10/30, only if held] · First Aid/CPR [only if current]",
  },
];

const faqItems = [
  {
    question: "How should I use these skilled trades resume examples?",
    answer:
      "Use the structure, not the claims. Choose the example closest to your target job, then replace every bracketed placeholder with facts you can verify from your own work, training, licenses, and records.",
  },
  {
    question: "What if I do not know exact numbers for my resume?",
    answer:
      "Do not invent them. Use honest scope instead: the equipment you serviced, building or project type, tools used, work frequency, crew size, systems supported, or the kind of problem you solved. Add a number only when you can defend it in an interview.",
  },
  {
    question: "Which certifications belong on a skilled trades resume?",
    answer:
      "List only current or accurately dated credentials relevant to the job, such as EPA Section 608, an electrical or plumbing license, an AWS welding qualification, OSHA training, forklift authorization, or equipment cards. Include the level, state, process, or expiration date when it matters.",
  },
  {
    question: "Can apprentices and entry-level workers use these examples?",
    answer:
      "Yes. Lead with training, lab or shop projects, apprenticeship hours, safety credentials, reliable attendance, transferable physical work, and tools you can use safely. Never present supervised practice as independent licensed work.",
  },
  {
    question: "Should a skilled trades resume be one page?",
    answer:
      "One page is usually enough for an apprentice or worker with a shorter history. Two pages can make sense when you have extensive projects, licenses, equipment, leadership, or multi-site experience. Keep only details that support the target job.",
  },
  {
    question: "What does the TRADE HUSTL3 Resume Builder cost?",
    answer:
      "You can complete the intake and review a protected preview without a credit card. A one-time $9.99 payment unlocks the resume and matching cover letter as PDF and editable DOCX files, with up to three corrections within seven days. There is no subscription.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${PAGE_URL}#webpage`,
      url: PAGE_URL,
      name: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Resume Builder", item: `${SITE_URL}/#resume-start` },
        { "@type": "ListItem", position: 3, name: "Skilled Trades Resume Examples", item: PAGE_URL },
      ],
    },
    {
      "@type": "ItemList",
      "@id": `${PAGE_URL}#trade-examples`,
      name: "Skilled trades resume examples",
      numberOfItems: tradeExamples.length,
      itemListElement: tradeExamples.map((example, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: example.trade,
        url: `${PAGE_URL}#${example.id}`,
      })),
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
    images: [{ url: "/optimized/og.webp", width: 1200, height: 630, alt: PAGE_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ["/optimized/og.webp"],
  },
};

function BuilderCta({ location, label, className = "" }: { location: string; label: string; className?: string }) {
  return (
    <Link
      className={`rb-button rb-button-primary ${className}`.trim()}
      href="/#resume-start"
      data-analytics-event="cta_click"
      data-location={location}
      data-destination="/#resume-start"
      data-item="skilled_trades_resume_examples"
    >
      <span>{label}</span><span aria-hidden="true">→</span>
    </Link>
  );
}

export default function SkilledTradesResumeExamplesPage() {
  return (
    <main className={`rb-page ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CtaAnalytics />
      <ResumeBuilderHeader action={
        <BuilderCta location="examples_header" label="Build my resume" className="rb-header-cta" />
      } />

      <section className={styles.hero} aria-labelledby="page-title">
        <div className={styles.heroCopy}>
          <p className="rb-kicker">SEVEN TRADES · REAL FIELD LANGUAGE</p>
          <h1 id="page-title">Skilled trades resume examples built for real field work</h1>
          <p className={styles.heroLead}>
            See how to turn tools, tickets, certifications, scope, safety, and results into stronger resume language for seven skilled-trade paths. Every bracket is a prompt for your facts—not a number to copy.
          </p>
          <div className={styles.heroActions}>
            <BuilderCta location="examples_hero" label="Build free · unlock for $9.99" />
            <p><strong>Preview before payment</strong><span>Resume + matching cover letter · PDF + DOCX</span></p>
          </div>
        </div>
        <aside className={styles.heroPanel} aria-label="What this guide includes">
          <p className="rb-kicker">USE THIS PAGE TO</p>
          <ul className={styles.trustList}>
            <li><strong>Choose a target</strong><span>Start with the trade closest to the job posting.</span></li>
            <li><strong>Translate the work</strong><span>Name the action, equipment, scope, and result.</span></li>
            <li><strong>Keep it honest</strong><span>Use only credentials and numbers you can verify.</span></li>
            <li><strong>Build the files</strong><span>Preview free, then unlock once for $9.99.</span></li>
          </ul>
        </aside>
      </section>

      <nav className={styles.jumpNav} aria-label="Jump to a trade example">
        {tradeExamples.map((example) => <a key={example.id} href={`#${example.id}`}>{example.trade}</a>)}
      </nav>

      <section className={`${styles.section} ${styles.methodSection}`} aria-labelledby="formula-title">
        <header className={styles.sectionIntro}>
          <p className="rb-kicker">THE FIELD-BULLET FORMULA</p>
          <h2 id="formula-title">Action + work + scope + result</h2>
          <p>A strong trade bullet tells a supervisor what you did, what you touched, how much or how often, and what changed. If no verified result exists, stop at accurate scope.</p>
        </header>
        <ol className={styles.formula}>
          <li><span>01</span><strong>Action</strong><p>Diagnosed, installed, fabricated, repaired, maintained, tested.</p></li>
          <li><span>02</span><strong>Work</strong><p>Name the system, equipment, material, tool, or task.</p></li>
          <li><span>03</span><strong>Scope</strong><p>Add volume, frequency, size, crew, site, or project type.</p></li>
          <li><span>04</span><strong>Result</strong><p>Add a verified uptime, callback, schedule, quality, or safety outcome.</p></li>
        </ol>
        <div className={styles.beforeAfter}>
          <article><p className={styles.label}>Too broad</p><p>Responsible for maintenance and repairs.</p></article>
          <article><p className={styles.label}>Field-specific structure</p><p>Completed [X] preventive-maintenance work orders per month across [equipment/site], documenting readings, repairs, and follow-up needs in [CMMS].</p></article>
        </div>
        <p className={styles.integrityNote}><strong>Replace every bracketed placeholder.</strong> Never submit a bracket, a borrowed credential, or a made-up metric.</p>
      </section>

      <section className={`${styles.section} ${styles.examplesSection}`} aria-labelledby="examples-title">
        <header className={styles.sectionIntro}>
          <p className="rb-kicker">ROLE-BY-ROLE STARTING POINTS</p>
          <h2 id="examples-title">Seven trade-specific resume examples</h2>
          <p>Each example gives you a summary shape, accomplishment bullets, core skills, and a credential line. Follow the structure, then make every word yours.</p>
        </header>
        <div className={styles.tradeGrid}>
          {tradeExamples.map((example, index) => (
            <article className={styles.tradeCard} id={example.id} key={example.id}>
              <header className={styles.tradeHeader}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><p>{example.trade}</p><h3>{example.role}</h3></div>
              </header>
              <div className={styles.sampleBlock}>
                <p className={styles.label}>Example summary</p>
                <p>{example.summary}</p>
              </div>
              <div className={styles.sampleBlock}>
                <p className={styles.label}>Example accomplishment bullets</p>
                <ul className={styles.bulletList}>{example.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
              </div>
              <div className={styles.sampleBlock}>
                <p className={styles.label}>Skills to surface when they are yours</p>
                <ul className={styles.skillList}>{example.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul>
              </div>
              <p className={styles.credential}><strong>Credential line:</strong> {example.credentials}</p>
              <a className={styles.guideLink} href={example.guideHref}>Open the {example.trade} resume guide <span aria-hidden="true">→</span></a>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.checklistSection}`} aria-labelledby="checklist-title">
        <header className={styles.sectionIntro}>
          <p className="rb-kicker">BEFORE YOU APPLY</p>
          <h2 id="checklist-title">A skilled-trades resume checklist</h2>
        </header>
        <ul className={styles.checklist}>
          <li><strong>Target title</strong><span>Match the job you are applying for, not every job you have ever done.</span></li>
          <li><strong>Credentials</strong><span>Show the exact license, level, state, process, type, and date where relevant.</span></li>
          <li><strong>Field skills</strong><span>Group systems, tasks, materials, tools, software, and safety practices for fast scanning.</span></li>
          <li><strong>Work proof</strong><span>Use action + work + scope + result, with verified numbers only.</span></li>
          <li><strong>Job-posting match</strong><span>Reuse accurate terms from the posting when they describe experience you actually have.</span></li>
          <li><strong>Clean format</strong><span>Keep headings obvious, dates consistent, and important details readable without graphics.</span></li>
        </ul>
        <BuilderCta location="examples_checklist" label="Turn my experience into a free preview" />
      </section>

      <section className={`${styles.section} ${styles.faqSection}`} aria-labelledby="faq-title">
        <header className={styles.sectionIntro}>
          <p className="rb-kicker">SKILLED TRADES RESUME FAQ</p>
          <h2 id="faq-title">Questions before you build</h2>
        </header>
        <div className={styles.faqList}>
          {faqItems.map((faq, index) => (
            <details className={styles.faq} key={faq.question} open={index === 0}>
              <summary>{faq.question}</summary><p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <div>
          <p className="rb-kicker">YOUR EXPERIENCE · YOUR FACTS</p>
          <h2 id="final-cta-title">Build the resume, see the preview, then decide.</h2>
          <p>Start from your current resume or a guided intake. Review the protected preview free. Unlock your resume and matching cover letter for one $9.99 payment—no subscription.</p>
        </div>
        <BuilderCta location="examples_closing" label="Build my skilled-trades resume" />
      </section>

      <footer className="rb-footer">
        <strong>TRADE HUSTL<span>3</span></strong><p>Built by Hustle. Backed by Trades.</p>
        <div className="rb-footer-links"><Link href="/#resume-start">Resume Builder</Link><a href="/top-10-trades">Top 10 Trades</a>
          <a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Support</a></div>
      </footer>
    </main>
  );
}
