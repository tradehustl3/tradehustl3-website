import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CtaAnalytics } from "../cta-analytics";
import { SITE_NAME, SITE_URL } from "../site";
import { CATALOG_METRICS } from "./catalog-metrics";
import { CatalogBrowser } from "./catalog-browser";
import { TRADE_CAREER_FAMILIES } from "./trade-career-catalog";
import styles from "./resume-examples.module.css";

const PAGE_PATH = "/resume-examples";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PAGE_TITLE = `${CATALOG_METRICS.mappedRoles} Skilled-Trade Job Titles & Resume Tracks | TRADE HUSTL3`;
const PAGE_DESCRIPTION =
  `Browse ${CATALOG_METRICS.mappedRoles} job titles across ${CATALOG_METRICS.careerFamilies} skilled-trade career families, then start a guided TRADE HUSTL3 resume preview for your field.`;

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
    type: "website",
    images: [{ url: "/optimized/og.webp", width: 1200, height: 630, alt: PAGE_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ["/optimized/og.webp"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
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
        { "@type": "ListItem", position: 2, name: "Skilled Trades Resume Catalog", item: PAGE_URL },
      ],
    },
    {
      "@type": "ItemList",
      "@id": `${PAGE_URL}#career-families`,
      name: "TRADE HUSTL3 skilled-trade career families",
      numberOfItems: TRADE_CAREER_FAMILIES.length,
      itemListElement: TRADE_CAREER_FAMILIES.map((family, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: family.name,
        url: `${PAGE_URL}#${family.slug}`,
      })),
    },
  ],
};

const metrics = [
  { value: CATALOG_METRICS.careerFamilies, label: "Career families", detail: "Every family is selectable in the guided builder." },
  { value: CATALOG_METRICS.mappedRoles, label: "Job titles mapped", detail: "Named roles—not color changes counted as new templates." },
  { value: CATALOG_METRICS.guidedTracks, label: "Guided builder tracks", detail: "Trade-specific prompts for field experience and target work." },
  { value: CATALOG_METRICS.detailedGuides, label: "Detailed trade guides", detail: "Deep, crawlable pages already live for the original core." },
  { value: CATALOG_METRICS.fieldPrompts, label: "Distinct field prompts", detail: "Tools, systems, skills, duties, and credentials across the builder." },
  { value: CATALOG_METRICS.accomplishmentExamples, label: "Field bullet examples", detail: "Examples that show action, scope, and result without inventing facts." },
] as const;

export default function ResumeExamplesCatalogPage() {
  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CtaAnalytics />

      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="TRADE HUSTL3 home">
          <Image src="/optimized/resume-builder-logo-header.webp" alt="TRADE HUSTL3 Resume Builder" width={500} height={410} priority />
        </Link>
        <nav aria-label="Catalog navigation">
          <a href="#career-catalog">Browse careers</a>
          <Link href="/resume-examples/skilled-trades">Detailed examples</Link>
          <Link
            className={styles.headerCta}
            href="/#resume-start"
            data-analytics-event="cta_click"
            data-location="resume_catalog_header"
            data-destination="/#resume-start"
            data-item="resume_catalog"
          >
            Build free preview
          </Link>
        </nav>
      </header>

      <section className={styles.hero} aria-labelledby="page-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>THE SKILLED-TRADES RESUME CATALOG</p>
          <h1 id="page-title">Built for the trades. Counted by what is actually here.</h1>
          <p className={styles.heroLead}>
            TRADE HUSTL3 now covers commercial driving, warehouse and industrial maintenance, landscaping,
            roadwork and paving, roofing, automotive and diesel, plus the original HVAC, electrical,
            plumbing, construction, facilities, welding, and general-labor tracks.
          </p>
          <div className={styles.heroActions}>
            <Link
              className={styles.primaryCta}
              href="/#resume-start"
              data-analytics-event="cta_click"
              data-location="resume_catalog_hero"
              data-destination="/#resume-start"
              data-item="resume_catalog"
            >
              Build my free preview <span aria-hidden="true">→</span>
            </Link>
            <a className={styles.secondaryCta} href="#career-catalog">Find my job title</a>
            <Link
              className={styles.secondaryCta}
              href="/resume-examples/skilled-trades"
              data-analytics-event="cta_click"
              data-location="resume_catalog_hero"
              data-destination="/resume-examples/skilled-trades"
              data-item="skilled_trades_resume_examples"
            >
              See 7 detailed examples
            </Link>
          </div>
          <p className={styles.priceNote}>$0 to build and preview · $9.99 one-time to unlock · No subscription</p>
        </div>
        <aside className={styles.heroManifest} aria-label="Catalog counting standard">
          <span>CATALOG STANDARD</span>
          <strong>One named role is one mapped job title.</strong>
          <p>
            We do not multiply the same resume by colors, file formats, or experience labels and call each
            one a new template. Dedicated role pages will be counted only after their original content is published.
          </p>
          <ul>
            <li>Trade-first language</li>
            <li>Real role names</li>
            <li>Facts before hype</li>
          </ul>
        </aside>
      </section>

      <section className={styles.metricsSection} aria-labelledby="numbers-title">
        <div className={styles.metricsHeading}>
          <p className={styles.kicker}>COVERAGE YOU CAN VERIFY</p>
          <h2 id="numbers-title">The numbers—and exactly what they mean.</h2>
        </div>
        <div className={styles.metricsGrid}>
          {metrics.map((metric) => (
            <article key={metric.label}>
              <strong>{metric.value}</strong>
              <h3>{metric.label}</h3>
              <p>{metric.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <CatalogBrowser />

      <section className={styles.closingCta} aria-labelledby="closing-title">
        <p className={styles.kicker}>YOUR EXPERIENCE IS THE SOURCE</p>
        <h2 id="closing-title">Choose the lane. Show the work. Preview before you pay.</h2>
        <p>HUSTL3 BOT organizes the tools, systems, licenses, scope, and results you actually provide. It does not give you a borrowed story or made-up numbers.</p>
        <Link
          className={styles.primaryCta}
          href="/#resume-start"
          data-analytics-event="cta_click"
          data-location="resume_catalog_closing"
          data-destination="/#resume-start"
          data-item="resume_catalog"
        >
          Start my resume <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className={styles.footer}>
        <div><Image src="/optimized/trade-hustl3-logo.webp" alt="TRADE HUSTL3" width={48} height={48} /><strong>TRADE HUSTL3 LLC</strong></div>
        <p>Built by Trades. Backed by HUSTL3.<br />Atlanta, Georgia · <a href="mailto:support@tradehustl3.com">support@tradehustl3.com</a></p>
        <nav aria-label="Footer links">
          <Link href="/">Home</Link>
          <Link href="/#resume-start">Resume Builder</Link>
          <Link href="/top-10-trades">Top 10 Trades</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </footer>
    </main>
  );
}
