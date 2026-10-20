import Image from 'next/image';
import Link from 'next/link';
import { CtaAnalytics } from './cta-analytics';
import { CustomerReviews } from './customer-reviews';
import { homeBodyFont, homeDisplayFont } from './home-fonts';
import { HomeHero } from './home-hero';
import { heroTradeFromParam } from './home-hero-trades';
import { AccountStart } from './resume-builder/account-start';
import { ResumeBuilderStartAnalytics } from './resume-builder/funnel-analytics';
import { rbFont } from './resume-builder/rb-font';
import { CATALOG_METRICS } from './resume-examples/catalog-metrics';
import './resume-builder/rb-foundation.css';
import styles from './home-traffic-director.module.css';
import fi from './home-first-impression.module.css';

const tradeChips = [
  ['HVAC & Refrigeration', '/resume-builder/hvac'],
  ['Electrical', '/resume-builder/electrician'],
  ['Plumbing', '/resume-builder/plumbing'],
  ['Construction & Carpentry', '/resume-builder/construction-carpentry'],
  ['Facilities Maintenance', '/resume-builder/facilities-maintenance'],
  ['Welding & Fabrication', '/resume-builder/welding-fabrication'],
  ['General Labor / Maintenance Tech', '/resume-builder/general-labor'],
] as const;

const proofPoints = [
  ['Trade-specific language', 'Built around real field work, tools, certifications, safety, troubleshooting, PMs, installs, repairs, and measurable results.'],
  ['ATS-friendly structure', 'Clean single-column formatting keeps the resume readable for hiring managers and modern applicant tracking systems.'],
  ['Upload or guided intake', 'Use your current resume as a starting point or build one from scratch without staring at a blank page.'],
  ['Real preview before payment', 'See the finished structure before you decide whether to pay. No credit card is required to build the preview.'],
  ['Resume + cover letter files', 'Unlock your resume and matching cover letter as clean PDFs and editable Word files so you can apply immediately.'],
  ['Built for skilled trades', 'Designed for HVAC, electrical, plumbing, welding, construction, facilities, general labor, and maintenance careers.'],
];

const promises = [
  ['See it first', 'Your full resume is built before you pay.'],
  ['Your facts only', 'Never invents a license, cert, employer or number.'],
  ['Cover letter included', 'Matching letter, PDF and editable Word files.'],
  ['Built by a tradesman', 'Shaped by 10+ years of HVAC and facilities work.'],
] as const;

const steps = [
  ['Bring your experience', 'Upload a resume or answer guided questions for your trade.'],
  ['Review the free preview', 'Read every line. Switch templates. Nothing is charged yet.'],
  ['Unlock for $9.99', 'Download your resume and cover letter as PDF and DOCX.'],
] as const;

const purchaseTrust = [
  'No credit card to preview',
  '$9.99 one-time',
  'Matching cover letter included',
  'No subscription',
  '3 corrections included',
];

function AnalyticsLink({ href, location, children, className, event = 'cta_click', item }: {
  href: string;
  location: string;
  children: React.ReactNode;
  className?: string;
  event?: 'cta_click' | 'select_content';
  item?: string;
}) {
  return (
    <Link href={href} className={className} data-analytics-event={event} data-location={location} data-destination={href} data-item={item}>
      {children}
    </Link>
  );
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  // Render a ?trade= from a trade landing page or campaign on the server, so the
  // hero never swaps its headline after hydration (and works without JavaScript).
  const { trade } = await searchParams;
  const initialTrade = heroTradeFromParam(typeof trade === 'string' ? trade : null);

  return (
    <main className={styles.page}>
      <CtaAnalytics />
      <ResumeBuilderStartAnalytics />
      <div className={`${fi.top} ${homeDisplayFont.variable} ${homeBodyFont.variable}`}>
        <header className={fi.header}>
          <div className={fi.headerInner}>
            <Link className={fi.brand} href="#top" aria-label="TRADE HUSTL3 Resume Builder home">
              <Image
                className={fi.brandLogo}
                src="/optimized/resume-builder-logo-header.webp"
                alt="TRADE HUSTL3 Resume Builder logo"
                width={500}
                height={410}
                priority
              />
            </Link>
            <nav className={fi.nav} aria-label="Primary navigation">
              <a className={fi.navLink} href="#trades">Trade examples</a>
              <a className={fi.navLink} href="#how">How it works</a>
              <Link className={fi.navLink} href="/book">The Book</Link>
              <AnalyticsLink href="#resume-start" location="sticky_header" className={fi.headerCta}>Build my free preview</AnalyticsLink>
            </nav>
          </div>
        </header>

        <HomeHero initialTradeId={initialTrade?.id ?? null} />

        <section className={`${fi.band} ${fi.blueprint}`} aria-label="What you can count on">
          <ul className={fi.bandInner}>
            {promises.map(([title, copy]) => (
              <li key={title} className={fi.bandItem}>
                <p className={fi.bandTitle}>{title}</p>
                <p className={fi.bandBody}>{copy}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={fi.how} id="how" aria-labelledby="how-title">
          <h2 id="how-title" className={fi.sectionTitle}>Three steps. Preview before you pay.</h2>
          <ol className={fi.steps}>
            {steps.map(([title, copy], index) => (
              <li key={title} className={`${fi.step} ${fi.blueprint}`}>
                <span className={fi.stepNumber} aria-hidden="true">{index + 1}</span>
                <p className={fi.stepTitle}>{title}</p>
                <p className={fi.stepBody}>{copy}</p>
              </li>
            ))}
          </ol>
        </section>

        <CustomerReviews />
      </div>


      <section className={styles.tradeStrip} id="trade-guides" aria-label="Supported trade categories">
        <strong>BUILT FOR THE TRADES</strong>
        <ul>{tradeChips.map(([trade, href]) => <li key={trade}><Link href={href}>{trade}</Link></li>)}</ul>
        <Link className={styles.tradeCatalogLink} href="/resume-examples">Browse all {CATALOG_METRICS.careerFamilies} families <span aria-hidden="true">→</span></Link>
      </section>

      <section className={styles.catalogProof} aria-labelledby="catalog-proof-title">
        <div className={styles.catalogProofCopy}>
          <p className={styles.eyebrow}>THE TRADE RESUME CATALOG</p>
          <h2 id="catalog-proof-title">Real coverage. Clear numbers.</h2>
          <p>
            We count career families, job titles, live builder tracks, and field prompts separately.
            A role name is not passed off as a finished template, and a color change is not counted twice.
          </p>
          <AnalyticsLink href="/resume-examples" location="homepage_catalog" event="select_content" item="resume_catalog" className={styles.catalogProofLink}>
            Explore the full skilled-trades catalog <span aria-hidden="true">→</span>
          </AnalyticsLink>
        </div>
        <dl className={styles.catalogProofGrid}>
          <div><dt>{CATALOG_METRICS.careerFamilies}</dt><dd>Career families inside the guided builder</dd></div>
          <div><dt>{CATALOG_METRICS.mappedRoles}</dt><dd>Skilled-trade and field job titles mapped</dd></div>
          <div><dt>{CATALOG_METRICS.fieldPrompts}</dt><dd>Distinct tool, system, skill, duty, and credential prompts</dd></div>
          <div><dt>{CATALOG_METRICS.accomplishmentExamples}</dt><dd>Field accomplishment examples across the detailed guides</dd></div>
        </dl>
      </section>

      <section className={styles.trustStrip} aria-label="Resume Builder purchase protections">
        <p><strong>SEE IT BEFORE YOU BUY IT.</strong> Build your protected preview first. Unlock only when you are happy with the direction.</p>
        <ul>{purchaseTrust.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>

      <section className={styles.startSection} id="resume-start" aria-labelledby="resume-start-title">
        <div className={styles.startIntro}>
          <p className={styles.eyebrow}>START YOUR RESUME</p>
          <h2 id="resume-start-title">ONE PAGE TO LEARN IT. ONE PLACE TO START IT.</h2>
          <p>You already know what the Resume Builder does. Start here with your verified account, then go straight into your trade experience, resume system, preview, and download flow.</p>
          <div className={styles.startPath} aria-label="Resume Builder stages">
            <span>Account</span><i>→</i><span>Experience</span><i>→</i><span>Choose system</span><i>→</i><span>Preview</span><i>→</i><span>Unlock</span>
          </div>
          <div className={styles.startHighlights} aria-label="What happens after you start">
            <div><span aria-hidden="true">01</span><strong>Bring your experience</strong><small>Upload a resume or answer guided trade questions.</small></div>
            <div><span aria-hidden="true">02</span><strong>See your preview</strong><small>Review the finished structure before you pay.</small></div>
            <div><span aria-hidden="true">03</span><strong>Take your files</strong><small>Unlock PDF and editable DOCX when you are ready.</small></div>
          </div>
        </div>
        <aside className={`${styles.startPanel} rb-scope ${rbFont.variable}`}>
          <p className={styles.startIndex}>Account · stage 1 of 5</p>
          <h3>Build my resume</h3>
          <p>Create or verify your account. Your work is saved to your account so you can continue across devices.</p>
          <AccountStart />
        </aside>
      </section>

      <section className={styles.coverProof} id="included-cover-letter" aria-labelledby="cover-letter-title">
        <div className={styles.coverCopy}>
          <p className={styles.eyebrow}>INCLUDED WITH YOUR RESUME PURCHASE</p>
          <h2 id="cover-letter-title">A matching cover letter. Built for the same job.</h2>
          <p className={styles.coverLead}>Your $9.99 one-time purchase includes more than the resume. HUSTL3 BOT uses your verified experience and target job to build a professional cover letter that sounds direct, capable, and ready to send.</p>

          <div className={styles.includedOffer} aria-label="Cover letter package details">
            <strong>INCLUDED AT NO EXTRA COST</strong>
            <span>Resume + matching cover letter</span>
            <small>PDF + editable DOCX · No subscription</small>
          </div>

          <ul className={styles.coverBenefits}>
            <li>Matched to your target role and company</li>
            <li>Built only from facts verified in your resume</li>
            <li>Professional trade-focused language</li>
            <li>Downloadable as PDF and editable DOCX</li>
          </ul>

          <div className={styles.coverActions}>
            <AnalyticsLink href="#resume-start" location="cover_letter_proof" className={styles.primaryButton}>Build My Free Preview <span aria-hidden="true">→</span></AnalyticsLink>
          </div>
          <p className={styles.coverDisclosure}>Example candidate, company, and contact details are fictional and shown for demonstration.</p>
        </div>

        <article className={styles.coverSheet} aria-label="Example matching HVAC cover letter">
          <div className={styles.coverSheetTop}>
            <span>MATCHING COVER LETTER</span>
            <b>INCLUDED</b>
          </div>
          <header>
            <h3>Jordan Taylor</h3>
            <p>HVAC &amp; Facilities Maintenance Technician</p>
            <small>Atlanta, GA · (404) 555-0142 · jordan.taylor@example.com</small>
          </header>
          <div className={styles.coverRule} />
          <div className={styles.coverLetterBody}>
            <p>September 13, 2026</p>
            <p><strong>Hiring Manager</strong><br />ABC Property Management<br />Atlanta, GA</p>
            <p>Dear Hiring Manager,</p>
            <p>I am applying for the HVAC Maintenance Technician position with ABC Property Management. I bring more than 10 years of hands-on experience supporting commercial and multifamily properties through preventive maintenance, HVAC troubleshooting, electrical diagnostics, work-order execution, and emergency response.</p>
            <p>My background includes diagnosing and repairing split systems, working with 24V controls, motors, contactors, capacitors, and control boards, and documenting completed work clearly. I hold EPA 608 Universal and OSHA 10 certifications and understand the importance of safety, communication, and keeping occupied properties operating reliably.</p>
            <p>I would welcome the opportunity to bring that field experience and dependable approach to your maintenance team. Thank you for your time and consideration.</p>
            <p>Sincerely,<br /><strong>Jordan Taylor</strong></p>
          </div>
          <div className={styles.coverSheetFooter}>TRADE HUSTL3 APPLICATION PACKAGE <b aria-hidden="true">✓</b></div>
        </article>
      </section>

      <section className={styles.difference} aria-labelledby="difference-title">
        <div className={styles.differenceIntro}>
          <p className={styles.eyebrow}>BUILT FOR THE TRADES</p>
          <h2 id="difference-title">Your work is not generic. Your resume should not be either.</h2>
          <p>TRADE HUSTL3 is built around the way skilled-trades people actually work: equipment, tools, troubleshooting, PMs, installs, safety, certifications, emergency response, production, and measurable results.</p>
          <Image src="/hustl3-bot-official.webp" alt="Full-body HUSTL3 BOT in branded skilled-trades safety gear" width={1122} height={1402} sizes="(max-width: 760px) 85vw, 360px" />
        </div>
        <div className={styles.proofGrid}>{proofPoints.map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className={styles.guideSignup} aria-labelledby="guide-title">
        <div>
          <p className={styles.eyebrow}>FREE CAREER GUIDE</p>
          <h2 id="guide-title">Still figuring out your next move?</h2>
          <p>Get the free <strong>Top 10 Trades for 2026–2027</strong> guide and compare skilled-trade paths, opportunity, and practical next steps.</p>
        </div>
        <AnalyticsLink href="/top-10-trades" location="guide_signup" event="select_content" item="top_10_trades" className={styles.secondaryButton}>Get the Free Guide <span aria-hidden="true">→</span></AnalyticsLink>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <p className={styles.eyebrow}>READY WHEN YOU ARE</p>
        <h2 id="final-cta-title">Build the resume. See the preview. Decide after.</h2>
        <p>No subscription. No credit card to preview. One $9.99 payment only when you are ready to unlock the clean files.</p>
        <AnalyticsLink href="#resume-start" location="footer_cta" className={styles.primaryButton}>Build My Free Preview <span aria-hidden="true">→</span></AnalyticsLink>
      </section>

      <footer className={styles.footer} data-site-footer>
        <div className={styles.footerBrand}><Image src="/optimized/trade-hustl3-logo.webp" alt="TRADE HUSTL3 logo" width={44} height={44} /><strong>TRADE HUSTL3 LLC</strong></div>
        <p>BUILT BY HUSTL3. BACKED BY TRADE.<br />TRADE HUSTL3 LLC · Atlanta, Georgia · <a href="mailto:support@tradehustl3.com">support@tradehustl3.com</a></p>
        <nav aria-label="Footer links">
          <Link href="#resume-start">Resume Builder</Link>
          <Link href="/resume-examples">Trade Career Catalog</Link>
          <Link href="/top-10-trades">Top 10 Trades</Link>
          <Link href="/book">The Book</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Support</Link>
        </nav>
      </footer>

      <AnalyticsLink href="#resume-start" location="mobile_sticky" className={styles.mobileStickyCta}>Build Free Preview <span aria-hidden="true">→</span></AnalyticsLink>
    </main>
  );
}
