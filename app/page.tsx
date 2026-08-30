import Image from 'next/image';
import Link from 'next/link';
import { CtaAnalytics } from './cta-analytics';
import { SocialLinks } from './social-links';
import styles from './home-traffic-director.module.css';

const tradeChips = ['ATS-friendly', 'Trade-specific language', 'PDF + DOCX', 'HVAC', 'Electrical', 'Plumbing', 'Welding', 'Maintenance'];

const processSteps = [
  ['01', 'Tell us your trade & experience', 'Share the work you have done, the tools you know, and the job you want next.'],
  ['02', 'Preview your resume', 'HUSTL3 BOT helps structure your real experience into stronger trade-specific language.'],
  ['03', 'Unlock PDF + DOCX', 'Review the result, then unlock a clean PDF and an editable DOCX for $9.99 one-time.'],
];

const proofPoints = [
  ['Trade-specific wording', 'Built around field experience, certifications, tools, safety, and measurable work—not generic office language.'],
  ['Guided intake', 'A clear step-by-step process helps you capture what you actually do without staring at a blank page.'],
  ['ATS-friendly structure', 'Professional formatting and keyword-aware organization designed for modern hiring systems.'],
  ['Multiple trade categories', 'Useful for HVAC, electrical, plumbing, welding, facilities, maintenance, construction, and related work.'],
  ['HUSTL3 BOT assistance', 'Intelligent guidance helps turn rough notes into stronger resume material while keeping your experience honest.'],
  ['Built from the field', 'Created from real skilled-trades experience and practical lessons earned on the job.'],
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

export default function Home() {
  return (
    <main className={styles.page}>
      <CtaAnalytics />

      <header className={styles.header}>
        <Link className={styles.brand} href="#top" aria-label="TRADE HUSTL3 home">
          <Image src="/optimized/trade-hustl3-logo.webp" alt="TRADE HUSTL3 logo" width={48} height={48} priority />
          <span>TRADE HUSTL<span>3</span></span>
        </Link>
        <nav className={styles.nav} aria-label="Primary navigation">
          <Link href="#three-ways">Choose a path</Link>
          <Link href="#mission">The mission</Link>
          <AnalyticsLink href="/resume-builder" location="sticky_header" className={styles.headerCta}>Build My Resume — $9.99</AnalyticsLink>
        </nav>
      </header>

      <section className={styles.hero} id="top">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>SKILLED-TRADES CAREER SYSTEM</p>
          <h1>Skilled-Trades<br /><span>Resume Builder</span></h1>
          <p className={styles.heroLead}>Turn real field experience into an ATS-friendly resume with trade-specific language—built for HVAC, electrical, plumbing, welding, facilities, and maintenance professionals.</p>
          <div className={styles.priceLine}><strong>$9.99 one-time</strong><span>No subscription</span><span>Clean PDF + editable DOCX</span></div>
          <div className={styles.heroActions}>
            <AnalyticsLink href="/resume-builder" location="hero" className={styles.primaryButton}>Build My Resume — $9.99 <span aria-hidden="true">→</span></AnalyticsLink>
            <AnalyticsLink href="/top-10-trades" location="hero" className={styles.textLink}>or get a free trade guide first</AnalyticsLink>
          </div>
          <ul className={styles.chips} aria-label="Resume Builder features">{tradeChips.map((chip) => <li key={chip}>{chip}</li>)}</ul>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.heroImageWrap}><Image src="/optimized/resume-workspace.webp" alt="Skilled-trades workspace with safety gear and a laptop" fill sizes="(max-width: 900px) 92vw, 46vw" priority /></div>
          <div className={styles.heroStatus}><span>HUSTL3 BOT</span><strong>Trade experience in. Stronger resume out.</strong></div>
        </div>
      </section>

      <section className={styles.process} aria-labelledby="process-title">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>HOW IT WORKS</p><h2 id="process-title">Three steps. One stronger resume.</h2></div>
        <ol className={styles.processGrid}>{processSteps.map(([step, title, copy]) => <li key={step}><span>{step}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol>
        <AnalyticsLink href="/resume-builder" location="process" className={styles.secondaryButton}>Start My Resume <span aria-hidden="true">→</span></AnalyticsLink>
      </section>

      <section className={styles.doors} id="three-ways" aria-labelledby="doors-title">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>THREE WAYS IN</p><h2 id="doors-title">Choose the move that fits you now.</h2><p>One paid career tool. Two free ways to find your direction and learn what TRADE HUSTL3 is about.</p></div>
        <div className={styles.doorGrid}>
          <AnalyticsLink href="/resume-builder" location="three_doors" event="select_content" item="resume_builder" className={`${styles.doorCard} ${styles.paidDoor}`}>
            <p>I need a stronger resume now.</p><span className={styles.doorLabel}>PAID CAREER TOOL</span><h3>Resume Builder</h3><strong>$9.99 one-time</strong>
            <ul><li>ATS-friendly</li><li>Trade-specific language</li><li>PDF + DOCX</li></ul><span className={styles.doorCta}>Build my resume <b aria-hidden="true">→</b></span>
          </AnalyticsLink>
          <AnalyticsLink href="/top-10-trades" location="three_doors" event="select_content" item="top_10_trades" className={styles.doorCard}>
            <p>I&apos;m not sure which trade.</p><span className={styles.doorLabel}>FREE CAREER GUIDE</span><h3>Top 10 Trades for 2026–2027</h3><strong>Free PDF</strong>
            <p className={styles.doorCopy}>Compare ten skilled-trades paths, opportunity, and practical next moves.</p><span className={styles.doorCta}>Get the free guide <b aria-hidden="true">→</b></span>
          </AnalyticsLink>
          <AnalyticsLink href="/book/sample" location="three_doors" event="select_content" item="book_sample" className={styles.doorCard}>
            <p>I want to see what TRADE HUSTL3 is about.</p><span className={styles.doorLabel}>FREE BOOK SAMPLE</span><h3>Read 7 Pages Free</h3><strong>Instant PDF access</strong>
            <p className={styles.doorCopy}>Read the opening pages, table of contents, and start of Chapter 1.</p><span className={styles.doorCta}>Get the book sample <b aria-hidden="true">→</b></span>
          </AnalyticsLink>
        </div>
      </section>

      <section className={styles.difference} aria-labelledby="difference-title">
        <div className={styles.differenceIntro}><p className={styles.eyebrow}>WHY IT&apos;S DIFFERENT</p><h2 id="difference-title">Built around the work you actually do.</h2><p>TRADE HUSTL3 combines guided technology with credibility earned in the field. The result is practical, focused, and made for skilled-trades careers.</p><Image src="/optimized/hustl3-bot.webp" alt="HUSTL3 BOT in branded skilled-trades safety gear" width={330} height={495} sizes="(max-width: 760px) 70vw, 330px" /></div>
        <div className={styles.proofGrid}>{proofPoints.map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className={styles.mission} id="mission" aria-labelledby="mission-title">
        <div className={styles.bookCover}><Image src="/optimized/book-cover.webp" alt="TRADE HUSTL3: Built by Hustle, Backed by Trades book cover" fill sizes="(max-width: 760px) 70vw, 330px" /></div>
        <div><p className={styles.eyebrow}>BOOK &amp; MISSION</p><h2 id="mission-title">A career tool is one move. The mission is bigger.</h2><p>TRADE HUSTL3 is about entering the skilled trades, building earning power, and creating more options through real skills. The book carries that mission from choosing a path to building a long-term plan.</p><p className={styles.releaseNote}>Direct eBook available September 15, 2026.</p><AnalyticsLink href="/book" location="book_teaser" className={styles.secondaryButton}>Explore the Book <span aria-hidden="true">→</span></AnalyticsLink></div>
      </section>

      <section className={styles.founder} aria-labelledby="founder-title">
        <div className={styles.founderPhoto}><Image src="/optimized/zachary-ellis.webp" alt="Zachary Ellis, Da Maintenance Mane, founder of TRADE HUSTL3" fill sizes="(max-width: 760px) 88vw, 430px" /></div>
        <div className={styles.founderCopy}><p className={styles.eyebrow}>BUILT IN THE FIELD</p><h2 id="founder-title">Real work built the knowledge. The mission passes it forward.</h2><p>TRADE HUSTL3 was created by Zachary Ellis—Da Maintenance Mane—after more than a decade inside the skilled trades: rooftops, mechanical rooms, service calls, work orders, leadership, and lessons earned the hard way.</p><blockquote>“Enter with a skill. Earn with purpose. Elevate with options.”</blockquote><div className={styles.trustRow}><span>Built from real skilled-trades experience</span><span>Clear pricing</span><span>No Resume Builder subscription</span></div><SocialLinks /></div>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-cta-title"><p className={styles.eyebrow}>READY WHEN YOU ARE</p><h2 id="final-cta-title">Build a resume that speaks the language of your trade.</h2><p>Guided intake. ATS-friendly structure. Clean PDF and editable DOCX. One-time $9.99 payment.</p><AnalyticsLink href="/resume-builder" location="footer_cta" className={styles.primaryButton}>Build My Resume — $9.99 <span aria-hidden="true">→</span></AnalyticsLink></section>

      <footer className={styles.footer}><div className={styles.footerBrand}><Image src="/optimized/trade-hustl3-logo.webp" alt="TRADE HUSTL3 logo" width={44} height={44} /><strong>TRADE HUSTL3 LLC</strong></div><p>Built by Hustle, Backed by Trades.</p><nav aria-label="Footer links"><Link href="/resume-builder">Resume Builder</Link><Link href="/top-10-trades">Top 10 Trades</Link><Link href="/book/sample">Book Sample</Link><Link href="/book">The Book</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Support</Link></nav></footer>
    </main>
  );
}
