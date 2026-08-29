import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CtaAnalytics } from '../../cta-analytics';
import { ResourceForm } from '../../resource-form';
import { SITE_NAME, SITE_URL } from '../../site';
import styles from './page.module.css';

const PAGE_TITLE = 'Free 7-Page TRADE HUSTL3 Book Sample';
const PAGE_DESCRIPTION =
  'Get the free 7-page sample of TRADE HUSTL3: Built by Hustle, Backed by Trades. Enter your email and receive the reading link.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/book/sample' },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: '/book/sample',
    siteName: SITE_NAME,
    type: 'book',
    images: [{
      url: '/trade-hustl3-book-cover.jpg',
      width: 1024,
      height: 1536,
      alt: 'TRADE HUSTL3: Built by Hustle, Backed by Trades book cover',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ['/trade-hustl3-book-cover.jpg'],
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}/book/sample#webpage`,
  url: `${SITE_URL}/book/sample`,
  name: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  isPartOf: { '@id': `${SITE_URL}/#website` },
  about: { '@id': `${SITE_URL}/book#book` },
};

export default function BookSamplePage() {
  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script
        dangerouslySetInnerHTML={{
          __html: `if (window.location.hash === '#read') window.location.replace('/book/sample/read');`,
        }}
      />
      <CtaAnalytics />

      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="TRADE HUSTL3 home">
          <Image src="/trade-hustl3-logo.png" alt="TRADE HUSTL3 logo" width={56} height={56} priority />
          <span>TRADE HUSTL<span>3</span></span>
        </Link>
        <nav aria-label="Book sample navigation">
          <Link href="/book">The full book</Link>
          <Link href="/top-10-trades">Top 10 Trades</Link>
          <a className={styles.navCta} href="#get-sample">Get 7 pages free</a>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.coverWrap}>
          <div className={styles.coverGlow} aria-hidden="true" />
          <Image
            className={styles.cover}
            src="/trade-hustl3-book-cover.jpg"
            alt="TRADE HUSTL3: Built by Hustle, Backed by Trades book cover"
            width={1024}
            height={1536}
            priority
          />
        </div>

        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>FREE 7-PAGE BOOK SAMPLE</p>
          <h1>READ BEFORE<br /><span>YOU BUY.</span></h1>
          <p className={styles.lede}>
            Get the opening seven pages of TRADE HUSTL3, including the cover, opening pages, table of contents, and the beginning of Chapter 1. No purchase required.
          </p>

          <div className={styles.formCard} id="get-sample">
            <p className={styles.formKicker}>Send the sample to your inbox</p>
            <h2>Get the 7 pages free.</h2>
            <ResourceForm
              resourceName="free 7-page TRADE HUSTL3 book sample"
              buttonLabel="Email me the 7-page sample"
              includeFirstName={false}
              ctaId="book-sample"
              ctaLocation="book-sample-campaign"
              metaLeadContentName="book_sample"
              signupInterest="Book 7-Page Sample"
              successLinkLabel="Read my 7-page sample"
            />
            <p className={styles.consent}>
              No purchase required. By requesting the sample, you agree to receive TRADE HUSTL3 book and career updates. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.finish}>
        <div>
          <p className={styles.eyebrow}>WHAT HAPPENS NEXT</p>
          <h2>CHECK YOUR EMAIL. THEN START READING.</h2>
          <p>
            After you submit your email, you will get a direct link to the seven-page reader. The sample itself is no longer displayed on this campaign landing page.
          </p>
        </div>
        <Link className={styles.primaryButton} href="/book" data-cta="the-book" data-cta-location="book-sample-landing">
          Explore the full book <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className={styles.footer}>
        <Link href="/">TRADE HUSTL<span>3</span> LLC</Link>
        <p>Built by Hustle, Backed by Trades.</p>
        <nav aria-label="Footer links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Support</Link>
        </nav>
      </footer>
    </main>
  );
}
