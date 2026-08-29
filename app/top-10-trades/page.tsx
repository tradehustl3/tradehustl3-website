import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CtaAnalytics } from '../cta-analytics';
import { ResourceForm } from '../resource-form';
import { SITE_NAME, SITE_URL } from '../site';
import { SUPPORT_EMAIL } from '../../shared/customer-config';
import { ViewContentTracker } from '../view-content-tracker';
import styles from './page.module.css';

const PAGE_TITLE = 'Free Top 10 Trades Guide for 2026–2027 | TRADE HUSTL3';
const PAGE_DESCRIPTION =
  'Get the free TRADE HUSTL3 7-page guide to 10 high-opportunity skilled trades for 2026–2027, then turn your target trade into a stronger job-ready resume.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/top-10-trades' },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: '/top-10-trades',
    siteName: SITE_NAME,
    type: 'website',
    images: [
      {
        url: '/top-trades-2026-2027-card.png',
        alt: 'TRADE HUSTL3 Top 10 Trades for 2026–2027 free guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ['/top-trades-2026-2027-card.png'],
  },
};

const guidePoints = [
  ['10 trade paths', 'A focused starting point for comparing skilled-trades careers with real entry paths and room to grow.'],
  ['2026–2027 context', 'Current career framing designed to help you think beyond job titles and toward opportunity, training, and earning power.'],
  ['Practical next moves', 'Use the guide to narrow your direction, then take the next step toward a stronger application.'],
];

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}/top-10-trades#webpage`,
  url: `${SITE_URL}/top-10-trades`,
  name: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  isPartOf: { '@id': `${SITE_URL}/#website` },
  about: {
    '@type': 'CreativeWork',
    name: 'TRADE HUSTL3: 10 High-Opportunity Trades — 2026–2027 Edition',
    description: 'A free seven-page skilled-trades career guide from TRADE HUSTL3.',
  },
};

export default function TopTenTradesPage() {
  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <CtaAnalytics />
      <ViewContentTracker contentName="top_10_trades" />

      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="TRADE HUSTL3 home">
          <Image src="/trade-hustl3-logo.png" alt="TRADE HUSTL3 logo" width={58} height={58} priority />
          <span>TRADE HUSTL<span>3</span></span>
        </Link>
        <nav className={styles.nav} aria-label="Top 10 Trades page navigation">
          <Link href="/">Home</Link>
          <Link href="/book">The book</Link>
          <Link
            className={styles.navCta}
            href="/resume-builder"
            data-cta="resume-builder"
            data-cta-location="top-10-header"
          >
            Build my resume — $9.99
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>FREE • 7 PAGES • EMAIL DELIVERY</p>
          <h1>
            FIND YOUR NEXT
            <span> TRADE PATH.</span>
          </h1>
          <p className={styles.lede}>
            Get the free <strong>TRADE HUSTL3: 10 High-Opportunity Trades — 2026–2027 Edition</strong> and use it to compare skilled-trades paths, understand where opportunity is building, and choose a direction worth pursuing.
          </p>

          <div className={styles.formCard} id="get-guide">
            <p className={styles.formKicker}>Send the guide to your inbox</p>
            <h2>Get the free PDF.</h2>
            <ResourceForm
              resourceName="Top 10 Trades 2026–2027 guide"
              buttonLabel="Email me the free guide"
              includeInterest
              ctaId="top-10-trades"
              ctaLocation="top-10-campaign-page"
              metaLeadContentName="top_10_trades"
              nextStepHref="/resume-builder"
              nextStepLabel="Build my resume — $9.99"
            />
            <p className={styles.consent}>
              Free. No purchase required. Email delivery. By requesting the guide you agree to receive
              TRADE HUSTL3 career and product updates, and you can unsubscribe anytime — see our{' '}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
            <p className={styles.support}>
              Need help? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
          </div>
        </div>

        <div className={styles.visual}>
          <div className={styles.visualGlow} aria-hidden="true" />
          <Image
            className={styles.guideImage}
            src="/top-trades-2026-2027-card.png"
            alt="TRADE HUSTL3 Top 10 Trades for 2026–2027 guide artwork"
            width={1200}
            height={1200}
            priority
          />
          <div className={styles.proofStrip} aria-label="Guide delivery details">
            <span><strong>FREE</strong><small>No purchase</small></span>
            <span><strong>7</strong><small>Pages</small></span>
            <span><strong>10</strong><small>Trade paths</small></span>
          </div>
        </div>
      </section>

      <section className={styles.inside} aria-labelledby="inside-title">
        <div className={styles.sectionHeading}>
          <p>WHAT YOU GET</p>
          <h2 id="inside-title">A QUICKER WAY TO NARROW THE FIELD.</h2>
        </div>
        <div className={styles.pointGrid}>
          {guidePoints.map(([title, copy], index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.nextStep} aria-labelledby="next-step-title">
        <div>
          <p className={styles.eyebrow}>AFTER YOU PICK A DIRECTION</p>
          <h2 id="next-step-title">TURN THAT TARGET TRADE INTO A STRONGER RESUME.</h2>
          <p>
            The TRADE HUSTL3 Resume Builder is built for skilled trades and turns your real experience, certifications, tools, and field value into an ATS-ready resume.
          </p>
        </div>
        <Link
          className={styles.primaryButton}
          href="/resume-builder"
          data-cta="resume-builder"
          data-cta-location="top-10-next-step"
        >
          Build my resume — $9.99 <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className={styles.footer}>
        <Link className={styles.footerBrand} href="/">TRADE HUSTL<span>3</span> LLC</Link>
        <p>Built by Hustle, Backed by Trades.</p>
        <p className={styles.footerSupport}>Need help? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
        <nav aria-label="Footer links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Support</Link>
        </nav>
      </footer>
    </main>
  );
}
