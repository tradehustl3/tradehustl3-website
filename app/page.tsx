import Image from 'next/image';
import Link from 'next/link';
import { CtaAnalytics } from './cta-analytics';
import styles from './home-traffic-director.module.css';

const tradeChips = ['HVAC & Refrigeration', 'Electrical', 'Plumbing', 'Construction & Carpentry', 'Facilities Maintenance', 'Welding & Fabrication', 'General Labor / Maintenance Tech'];

const processSteps: { step: string; title: string; copy: string; icon: 'upload' | 'bot' | 'unlock'; accent: 'accentBlue' | 'accentRed' | 'accentGold' }[] = [
  {
    step: '01',
    title: 'Upload or start from scratch',
    copy: 'Bring your current resume or answer a few guided questions about your trade, tools, certifications, and experience.',
    icon: 'upload',
    accent: 'accentBlue',
  },
  {
    step: '02',
    title: 'HUSTL3 BOT builds the preview',
    copy: 'Your real field experience is organized into stronger, trade-specific resume language and an ATS-friendly layout.',
    icon: 'bot',
    accent: 'accentRed',
  },
  {
    step: '03',
    title: 'Unlock when you are ready',
    copy: 'Review the protected preview first. Unlock the clean PDF + editable DOCX for one $9.99 payment.',
    icon: 'unlock',
    accent: 'accentGold',
  },
];

const proofPoints = [
  ['Trade-specific language', 'Built around real field work, tools, certifications, safety, troubleshooting, PMs, installs, repairs, and measurable results.'],
  ['ATS-friendly structure', 'Clean single-column formatting keeps the resume readable for hiring managers and modern applicant tracking systems.'],
  ['Upload or guided intake', 'Use your current resume as a starting point or build one from scratch without staring at a blank page.'],
  ['Real preview before payment', 'See the finished structure before you decide whether to pay. No credit card is required to build the preview.'],
  ['PDF + editable DOCX', 'Unlock both a clean PDF and an editable Word file so you can apply immediately and still keep control of your document.'],
  ['Built for skilled trades', 'Designed for HVAC, electrical, plumbing, welding, construction, facilities, general labor, and maintenance careers.'],
];

const purchaseTrust = [
  'No credit card to preview',
  '$9.99 one-time',
  'No subscription',
  '3 corrections within 7 days',
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

function ProcessIcon({ type }: { type: 'upload' | 'bot' | 'unlock' }) {
  if (type === 'upload') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" width="24" height="24">
        <path d="M12 3v10m0-10 4 4m-4-4-4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'bot') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" width="24" height="24">
        <rect x="5" y="7" width="14" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 4v3M9 12h.01M15 12h.01M9 17v2M15 17v2M5 12H3M21 12h-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="24" height="24">
      <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v8H6zM10 15l1.5 1.5L14.5 13.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className={styles.page}>
      <CtaAnalytics />
      <style>{`
        @media (max-width: 720px) {
          [data-home-header] {
            display: grid !important;
            grid-template-columns: 72px minmax(112px, 1fr) 102px;
            align-items: center;
            gap: 4px !important;
            min-height: 82px;
            padding: 6px 8px !important;
          }
          [data-header-brand] {
            min-width: 0;
            padding: 2px 3px !important;
            border-radius: 12px !important;
            justify-self: start;
          }
          [data-header-logo-ring] {
            width: 64px !important;
            height: 54px !important;
            padding: 2px 4px !important;
          }
          [data-header-motto] {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100%;
            min-width: 0 !important;
            margin: 0 !important;
            gap: 3px !important;
            justify-self: stretch;
            font-size: 7.6px !important;
            letter-spacing: .025em !important;
          }
          [data-header-motto] [data-accent-lines] {
            gap: 2px !important;
          }
          [data-header-motto] [data-accent-lines] i {
            width: 8px !important;
            height: 2px !important;
          }
          [data-header-nav] {
            width: 100%;
            min-width: 0;
            justify-content: flex-end;
            gap: 0 !important;
          }
          [data-header-nav] > a:not([href="/resume-builder"]) {
            display: none !important;
          }
          [data-header-nav] a[href="/resume-builder"] {
            display: inline-flex !important;
            width: 100%;
            max-width: 102px;
            min-width: 0;
            padding: 9px 6px !important;
            font-size: 8.5px !important;
            line-height: 1.1;
            text-align: center;
            white-space: normal;
          }
        }
        @media (min-width: 721px) and (max-width: 1100px) {
          [data-header-motto] {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
        }
      `}</style>

      <header className={styles.header} data-home-header>
        <Link className={styles.brand} href="#top" aria-label="TRADE HUSTL3 Resume Builder home" data-header-brand>
          <span className={styles.brandLogoRing} data-header-logo-ring>
            <Image
              className={styles.brandLogo}
              src="/optimized/resume-builder-logo-header.webp"
              alt="TRADE HUSTL3 Resume Builder logo"
              width={500}
              height={410}
              priority
            />
          </span>
        </Link>
        <div
          aria-hidden="true"
          data-header-motto
          data-product-positioning="BUILT BY HUSTLE. BACKED BY TRADES."
          data-header-accent="yellow-red-blue-both-sides"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'clamp(5px,1vw,10px)',
            marginRight: 'auto',
            minWidth: 0,
            color: '#fff',
            fontFamily: 'var(--font-display), Impact, sans-serif',
            fontSize: 'clamp(9px,1.15vw,18px)',
            letterSpacing: '.045em',
            whiteSpace: 'nowrap',
          }}
        >
          <span data-accent-lines style={{ display: 'grid', gap: '2px', flex: '0 0 auto' }}>
            <i style={{ display: 'block', width: 'clamp(12px,2vw,28px)', height: '2px', backgroundColor: '#f1c357' }} />
            <i style={{ display: 'block', width: 'clamp(12px,2vw,28px)', height: '2px', backgroundColor: '#d71920' }} />
            <i style={{ display: 'block', width: 'clamp(12px,2vw,28px)', height: '2px', backgroundColor: '#2671a7' }} />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.04, textAlign: 'center' }}>
            <strong style={{ color: '#fff' }}>BUILT BY HUSTLE.</strong>
            <span style={{ color: '#f1c357' }}>BACKED BY TRADES.</span>
          </span>
          <span data-accent-lines style={{ display: 'grid', gap: '2px', flex: '0 0 auto' }}>
            <i style={{ display: 'block', width: 'clamp(12px,2vw,28px)', height: '2px', backgroundColor: '#f1c357' }} />
            <i style={{ display: 'block', width: 'clamp(12px,2vw,28px)', height: '2px', backgroundColor: '#d71920' }} />
            <i style={{ display: 'block', width: 'clamp(12px,2vw,28px)', height: '2px', backgroundColor: '#2671a7' }} />
          </span>
        </div>
        <nav className={styles.nav} aria-label="Primary navigation" data-header-nav>
          <Link href="#sample-resume">See a sample</Link>
          <Link href="/book">The Book</Link>
          <AnalyticsLink href="/resume-builder" location="sticky_header" className={styles.headerCta}>Build My Free Preview</AnalyticsLink>
        </nav>
      </header>

      <section className={styles.hero} id="top">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>SKILLED-TRADES CAREER SYSTEM</p>
          <h1><span className={styles.headlineLead}>Build a trade resume that</span><span>Looks ready for the job.</span></h1>
          <p className={styles.heroLead}>Upload your current resume or start from scratch. HUSTL3 BOT turns your real trade experience into a professionally structured resume you can preview before paying.</p>

          <div className={styles.priceLine} aria-label="Resume Builder pricing">
            <strong>$0 to preview</strong>
            <span>$9.99 to unlock</span>
            <span>No subscription</span>
          </div>

          <div className={styles.heroActions}>
            <AnalyticsLink href="/resume-builder" location="hero" className={styles.primaryButton}>Build My Free Preview <span aria-hidden="true">→</span></AnalyticsLink>
            <a href="#sample-resume" className={styles.textLink}>See a finished sample first</a>
          </div>

          <p className={styles.heroAssurance}>No credit card required to build your preview. Pay only when you are ready to unlock the clean PDF + editable DOCX.</p>
          <div className={styles.tradeVisual}>
            <Image
              src="/optimized/hvac-manifold-worksite.webp"
              alt="Digital HVAC manifold with blue hose on the left low-side port, yellow hose on the center service port, and red hose on the right high-side port"
              fill
              sizes="(max-width: 1050px) 92vw, 52vw"
              priority
            />
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="TRADE HUSTL3 Resume Builder output preview">
          <div className={styles.resumeFrame}>
            <div className={styles.resumeFrameTop}>
              <span className={styles.liveDot} />
              <span>ACTUAL BUILDER OUTPUT</span>
            </div>
            <Image src="/sample-hvac-resume.webp" alt="Finished TRADE HUSTL3 HVAC resume sample" width={816} height={1056} sizes="(max-width: 900px) 86vw, 42vw" priority />
            <div className={styles.botCard}>
              <div className={styles.botAvatar}>
                <Image src="/optimized/hustl3-bot.webp" alt="" fill sizes="58px" />
              </div>
              <div className={styles.botCopy}>
                <span>HUSTL3 BOT</span>
                <strong>Builds it for you.</strong>
                <p>Trade experience in. Stronger resume out.</p>
              </div>
            </div>
          </div>
          <aside className={styles.heroProof} aria-label="Why trade workers can trust the Resume Builder">
            <span>BUILT FROM THE FIELD</span>
            <strong>Shaped by 10+ years of hands-on maintenance and HVAC experience.</strong>
            <ul>
              <li>Preview before payment</li>
              <li>ATS-friendly structure</li>
              <li>PDF + editable DOCX</li>
            </ul>
            <div className={styles.customerProof}>
              <strong>500+ TRADESPEOPLE HELPED — AND COUNTING</strong>
              <p>Real trade experience deserves a resume that gets taken seriously.</p>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.tradeStrip} aria-label="Supported trade categories">
        <strong>BUILT FOR THE TRADES</strong>
        <ul>{tradeChips.map((trade) => <li key={trade}>{trade}</li>)}</ul>
      </section>

      <section className={styles.trustStrip} aria-label="Resume Builder purchase protections">
        <p><strong>SEE IT BEFORE YOU BUY IT.</strong> Build your protected preview first. Unlock only when you are happy with the direction.</p>
        <ul>{purchaseTrust.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>

      <section className={styles.sampleProof} id="sample-resume" aria-labelledby="sample-title">
        <div className={styles.sampleCopy}>
          <p className={styles.eyebrow}>PROOF BEFORE THE PITCH</p>
          <h2 id="sample-title">Actual resume builder output—not a promise.</h2>
          <p className={styles.sampleLead}>This fictional HVAC candidate demonstrates the real resume structure customers can receive. Classic Black stays clean, professional, and ATS-safe.</p>

          <div className={styles.beforeAfter}>
            <article>
              <span>ROUGH INPUT</span>
              <p>“Did HVAC repairs, work orders, and helped the maintenance team.”</p>
            </article>
            <article>
              <span>STRONGER RESUME LANGUAGE</span>
              <p>“Diagnose and repair 3–15 ton split systems, including capacitors, contactors, transformers, control boards, motors, and 24V control circuits.”</p>
            </article>
          </div>

          <div className={styles.sampleActions}>
            <AnalyticsLink href="/sample-hvac-resume.pdf" location="sample_proof" item="hvac_sample_pdf" className={styles.secondaryButton}>View Full Sample PDF <span aria-hidden="true">→</span></AnalyticsLink>
            <AnalyticsLink href="/resume-builder" location="sample_proof" className={styles.primaryButton}>Build My Free Preview <span aria-hidden="true">→</span></AnalyticsLink>
          </div>
          <p className={styles.sampleDisclosure}>Sample candidate name, employers, and contact details are fictional and shown for demonstration.</p>
        </div>

        <div className={styles.sampleSheet}>
          <Image src="/sample-hvac-resume.webp" alt="Classic Black sample HVAC and facilities maintenance resume" width={816} height={1056} sizes="(max-width: 900px) 88vw, 38vw" />
          <span>CLASSIC BLACK <b aria-hidden="true">✓</b></span>
        </div>
      </section>

      <section className={styles.process} aria-labelledby="process-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>HOW IT WORKS</p>
          <h2 id="process-title">Three steps. One stronger resume.</h2>
        </div>
        <ol className={styles.processGrid}>
          {processSteps.map(({ step, title, copy, icon, accent }, index) => (
            <li key={step} className={`${styles.processCard} ${styles[accent]}`}>
              <div className={styles.processConnector} aria-hidden="true" />
              <div className={styles.processTop}>
                <span className={styles.processStep}>{step}</span>
                <div className={styles.processIcon}>
                  <ProcessIcon type={icon} />
                </div>
              </div>

              <h3>{title}</h3>
              <p>{copy}</p>

              {index < processSteps.length - 1 ? (
                <div className={styles.processArrow} aria-hidden="true">
                  <span />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
        <AnalyticsLink href="/resume-builder" location="process" className={styles.secondaryButton}>Start My Resume <span aria-hidden="true">→</span></AnalyticsLink>
      </section>

      <section className={styles.difference} aria-labelledby="difference-title">
        <div className={styles.differenceIntro}>
          <p className={styles.eyebrow}>BUILT FOR THE TRADES</p>
          <h2 id="difference-title">Your work is not generic. Your resume should not be either.</h2>
          <p>TRADE HUSTL3 is built around the way skilled-trades people actually work: equipment, tools, troubleshooting, PMs, installs, safety, certifications, emergency response, production, and measurable results.</p>
          <Image src="/optimized/hustl3-bot.webp" alt="HUSTL3 BOT in branded skilled-trades safety gear" width={330} height={495} sizes="(max-width: 760px) 70vw, 330px" />
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
        <AnalyticsLink href="/resume-builder" location="footer_cta" className={styles.primaryButton}>Build My Free Preview <span aria-hidden="true">→</span></AnalyticsLink>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}><Image src="/optimized/trade-hustl3-logo.webp" alt="TRADE HUSTL3 logo" width={44} height={44} /><strong>TRADE HUSTL3 LLC</strong></div>
        <p>Built by Hustle, Backed by Trades.</p>
        <nav aria-label="Footer links">
          <Link href="/resume-builder">Resume Builder</Link>
          <Link href="/top-10-trades">Top 10 Trades</Link>
          <Link href="/book">The Book</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Support</Link>
        </nav>
      </footer>

      <AnalyticsLink href="/resume-builder" location="mobile_sticky" className={styles.mobileStickyCta}>Build Free Preview <span aria-hidden="true">→</span></AnalyticsLink>
    </main>
  );
}
