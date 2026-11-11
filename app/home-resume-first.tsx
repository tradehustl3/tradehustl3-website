import Image from 'next/image';
import Link from 'next/link';
import { CustomerReviews } from './customer-reviews';
import { homeBodyFont, homeDisplayFont } from './home-fonts';
import { HomeHero } from './home-hero';
import { HubOutlook } from './home-hub';
import { JobsiteTruths } from './jobsite-truths';
import { KnowYourTrade } from './home-know-your-trade';
import { knowYourTradeMyths, knowYourTradeTrades } from './home-know-your-trade-data';
import { ResumeStartSection } from './home-resume-start';
import { CATALOG_METRICS } from './resume-examples/catalog-metrics';
import type { TradeTrack } from './resume-builder/trade-content';
import styles from './home-traffic-director.module.css';
import fi from './home-first-impression.module.css';

/**
 * Resume-first homepage body for campaign and trade-landing visits (`?trade=`
 * for any builder track). These visitors arrive ready to build, so they land
 * on the builder sales page itself. Moved unchanged from app/page.tsx when the
 * hub homepage was restructured (Nov 2026); the header and footer stay in
 * page.tsx.
 */

const tradeChips = [
  ['HVAC & Refrigeration', '/resume-builder/hvac'],
  ['Electrical', '/resume-builder/electrician'],
  ['Plumbing', '/resume-builder/plumbing'],
  ['Construction & Carpentry', '/resume-builder/construction-carpentry'],
  ['Facilities Maintenance', '/resume-builder/facilities-maintenance'],
  ['Welding & Fabrication', '/resume-builder/welding-fabrication'],
  ['General Labor / Maintenance Tech', '/resume-builder/general-labor'],
  ['Heavy Equipment Operator', '/resume-builder/heavy-equipment-operator'],
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

/** The part of the resume-first page that sits inside the first-impression wrapper, below the header. */
export function ResumeFirstTop({ initialTradeId, campaignTrack }: { initialTradeId: string | null; campaignTrack: TradeTrack | null }) {
  return (
    <>
      <HomeHero initialTradeId={initialTradeId} campaignTrack={campaignTrack} />

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

      <JobsiteTruths />

      <CustomerReviews />
    </>
  );
}

/** The rest of the resume-first page, from the trade strip to the final CTA. */
export function ResumeFirstBody() {
  return (
    <>
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

      <ResumeStartSection />

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
            <p>My background includes diagnosing and repairing split systems, working with 24V controls, motors, contactors, capacitors, and control boards, and documenting completed work clearly. I hold EPA 608 Universal certification, have completed OSHA 10-Hour training, and understand the importance of safety, communication, and keeping occupied properties operating reliably.</p>
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
          <Image src="/optimized/hustl3-bot-v1.webp" alt="Full-body HUSTL3 BOT in branded skilled-trades safety gear" width={1122} height={1402} sizes="(max-width: 760px) 85vw, 360px" />
        </div>
        <div className={styles.proofGrid}>{proofPoints.map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <div className={`${homeDisplayFont.variable} ${homeBodyFont.variable}`}>
        <KnowYourTrade trades={knowYourTradeTrades()} myths={knowYourTradeMyths()} />
        <HubOutlook />
      </div>

      <section className={styles.guideSignup} aria-labelledby="guide-title">
        <div>
          <p className={styles.eyebrow}>FREE CAREER GUIDE</p>
          <h2 id="guide-title">Still figuring out your next move?</h2>
          <p>Get the free six-page <strong>Top 10 Trades for 2026–2027</strong> guide preview with two trade profiles and practical next steps.</p>
        </div>
        <AnalyticsLink href="/top-10-trades" location="guide_signup" event="select_content" item="top_10_trades" className={styles.secondaryButton}>Get the Free Guide <span aria-hidden="true">→</span></AnalyticsLink>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <p className={styles.eyebrow}>READY WHEN YOU ARE</p>
        <h2 id="final-cta-title">Build the resume. See the preview. Decide after.</h2>
        <p>No subscription. No credit card to preview. One $9.99 payment only when you are ready to unlock the clean files.</p>
        <AnalyticsLink href="#resume-start" location="footer_cta" className={styles.primaryButton}>Build My Free Preview <span aria-hidden="true">→</span></AnalyticsLink>
      </section>
    </>
  );
}
