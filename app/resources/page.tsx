import type { Metadata } from "next";
import Link from "next/link";
import { CtaAnalytics } from "../cta-analytics";
import { homeBodyFont, homeDisplayFont } from "../home-fonts";
import { CATALOG_METRICS } from "../resume-examples/catalog-metrics";
import { TRADE_CAREER_FAMILIES } from "../resume-examples/trade-career-catalog";
import { SITE_NAME, SITE_URL } from "../site";
import {
  CREDENTIAL_KIND_DESCRIPTIONS,
  CREDENTIAL_KIND_LABELS,
  CREDENTIAL_LIBRARY,
  CREDENTIAL_REQUIREMENT_LABELS,
  credentialBySlug,
  credentialsForTrade,
  type CredentialKind,
} from "./credential-library";
import { LABOR_MARKET_FACTS, LABOR_MARKET_PERIOD, formatCount, formatPay } from "./labor-market";
import { ResourceFooter, ResourceHeader } from "./resource-chrome";
import { TradeCredentialBadge } from "./trade-credential-badge";
import { ToolRail } from "../tool-silhouettes";
import styles from "./resources.module.css";

const PAGE_PATH = "/resources";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PAGE_TITLE = "Skilled-Trades Resource Center: Trades, Certifications & Careers | TRADE HUSTL3";
const PAGE_DESCRIPTION = `Free skilled-trades resources: ${TRADE_CAREER_FAMILIES.length} trade families, ${CREDENTIAL_LIBRARY.length} certifications, licenses, and training cards checked against official sources, and real job-outlook data.`;

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
    images: [{ url: "/optimized/og-v2.webp", width: 1200, height: 630, alt: PAGE_TITLE }],
  },
  twitter: { card: "summary_large_image", title: PAGE_TITLE, description: PAGE_DESCRIPTION, images: ["/optimized/og-v2.webp"] },
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
        { "@type": "ListItem", position: 2, name: "Resource Center", item: PAGE_URL },
      ],
    },
  ],
};

const FEATURED_CREDENTIALS = ["epa-608", "osha-outreach-10-30", "cdl"] as const;
const KINDS: readonly CredentialKind[] = ["certification", "license", "training-card", "qualification"];

const COMING_NEXT = [
  ["Training & Apprenticeships", "How to find registered apprenticeships and training programs through official finders."],
  ["Interview Center", "Real questions by trade, and what a strong, honest answer covers."],
  ["Field Report", "A weekly, sourced story on credentials, training, and the trades job market."],
] as const;

export default function ResourceCenterPage() {
  const featured = FEATURED_CREDENTIALS.map((slug) => credentialBySlug(slug)).filter((record) => record !== undefined);

  return (
    <main className={`${styles.page} ${homeDisplayFont.variable} ${homeBodyFont.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CtaAnalytics />
      <ResourceHeader current="resources" />

      <section className={styles.hero} aria-labelledby="page-title">
        <div className={styles.heroInner}>
          <p className={styles.kicker}>TRADE HUSTL3 RESOURCE CENTER · FREE TO USE</p>
          <h1 id="page-title" className={styles.h1}>Know your trade. <span>Build your future.</span></h1>
          <p className={styles.lead}>
            Career paths, credentials, and job-outlook data for {TRADE_CAREER_FAMILIES.length} skilled-trades families.
            Every credential guide links to the agency or organization that issues it.
          </p>
          <dl className={styles.stats}>
            <div><dt>trade families</dt><dd>{TRADE_CAREER_FAMILIES.length}</dd></div>
            <div><dt>mapped job titles</dt><dd>{CATALOG_METRICS.mappedRoles}</dd></div>
            <div><dt>credentials checked against official sources</dt><dd>{CREDENTIAL_LIBRARY.length}</dd></div>
            <div><dt>to use every guide</dt><dd>$0</dd></div>
          </dl>
        </div>
      </section>
      <ToolRail />

      <section className={styles.section} aria-labelledby="trades-title">
        <div className={styles.sectionHead}>
          <div>
            <p className={`${styles.kicker} ${styles.kickerRed}`}>BROWSE BY TRADE</p>
            <h2 id="trades-title" className={styles.h2}>{TRADE_CAREER_FAMILIES.length} trade families</h2>
            <p className={styles.body}>See the job titles in each trade and the credentials that go with it.</p>
          </div>
          <Link className={styles.textLink} href="/resume-examples">See all {CATALOG_METRICS.mappedRoles} job titles →</Link>
        </div>
        <ul className={styles.tradeGrid}>
          {TRADE_CAREER_FAMILIES.map((family) => (
            <li key={family.slug}>
              <Link
                className={styles.tradeCard}
                href={`/resume-examples#${family.slug}`}
                data-analytics-event="select_content"
                data-location="resources_trades"
                data-destination={`/resume-examples#${family.slug}`}
                data-item={family.slug}
              >
                <TradeCredentialBadge tradeSlug={family.slug} />
                <span className={styles.tradeName}>{family.name}</span>
                <span className={styles.tradeDesc}>{family.description}</span>
                <span className={styles.pills}>
                  <span className={styles.pill}>{family.roles.length} job titles</span>
                  <span className={`${styles.pill} ${styles.pillDark}`}>{credentialsForTrade(family.slug).length} credentials</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="cred-title">
        <div className={styles.sectionHead}>
          <div>
            <p className={`${styles.kicker} ${styles.kickerRed}`}>CREDENTIAL LIBRARY</p>
            <h2 id="cred-title" className={styles.h2}>Know exactly what you&apos;re earning</h2>
            <p className={styles.body}>
              A certification, a license, and a training card are not the same thing — and employers notice when a resume mixes them up.
            </p>
          </div>
          <Link className={styles.textLink} href="/resources/certifications">Open all {CREDENTIAL_LIBRARY.length} credentials →</Link>
        </div>
        <ul className={styles.kindList} aria-label="Credential types">
          {KINDS.map((kind) => (
            <li key={kind}>
              <span className={`${styles.badge} ${styles[`badge-${kind}`]}`}>{CREDENTIAL_KIND_LABELS[kind]}</span>
              {CREDENTIAL_KIND_DESCRIPTIONS[kind]}
            </li>
          ))}
        </ul>
        <ul className={styles.credGrid}>
          {featured.map((record) => (
            <li key={record.slug}>
              <article className={styles.credCard}>
                <span className={styles.badgeRow}>
                  <span className={`${styles.badge} ${styles[`badge-${record.kind}`]}`}>{CREDENTIAL_KIND_LABELS[record.kind]}</span>
                  <span className={`${styles.badge} ${styles.badgeReq}`}>{CREDENTIAL_REQUIREMENT_LABELS[record.requirement]}</span>
                </span>
                <h3>{record.name}</h3>
                <p>{record.summary}</p>
                <Link href={`/resources/certifications#${record.slug}`}>Read the guide →</Link>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="outlook-title">
        <div className={styles.sectionHead}>
          <div>
            <p className={`${styles.kicker} ${styles.kickerRed}`}>THE TRADES ARE HIRING</p>
            <h2 id="outlook-title" className={styles.h2}>Real openings. Every year.</h2>
            <p className={styles.body}>Average openings projected each year, {LABOR_MARKET_PERIOD}, from the U.S. Bureau of Labor Statistics.</p>
          </div>
        </div>
        <div className={styles.factGrid}>
          {LABOR_MARKET_FACTS.map((fact) => (
            <figure className={styles.fact} key={fact.id}>
              <strong>{formatCount(fact.annualOpenings)}</strong>
              <figcaption>
                openings a year for {fact.label}
                {fact.medianPay ? ` · median pay ${formatPay(fact.medianPay)} (May 2025)` : ""}
                {fact.growthPercent ? ` · ${fact.growthPercent}% projected growth` : ""}
              </figcaption>
            </figure>
          ))}
        </div>
        <p className={styles.sourceNote}>
          Source: BLS Occupational Outlook Handbook (
          {LABOR_MARKET_FACTS.map((fact, index) => (
            <span key={fact.id}>{index > 0 ? ", " : ""}<a href={fact.sourceUrl} rel="noopener">{fact.label}</a></span>
          ))}
          ). Electricians and HVAC are included in the broader groups, so these numbers should not be added together.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="next-title">
        <div className={styles.sectionHead}>
          <div>
            <p className={`${styles.kicker} ${styles.kickerRed}`}>COMING NEXT</p>
            <h2 id="next-title" className={styles.h2}>Still being built</h2>
          </div>
        </div>
        <ul className={styles.comingList}>
          {COMING_NEXT.map(([title, copy]) => <li key={title}><strong>{title}</strong>{copy}</li>)}
        </ul>
      </section>

      <div className={styles.bridge}>
        <div className={styles.bridgeInner}>
          <div>
            <h2 className={styles.h2}>Ready to apply?</h2>
            <p className={styles.body}>Build a resume for your trade and see the whole thing free. Unlock is $9.99 one time — resume, matching cover letter, PDF and editable Word.</p>
          </div>
          <Link
            className={styles.primaryCta}
            href="/#resume-start"
            data-analytics-event="cta_click"
            data-location="resources_bridge"
            data-destination="/#resume-start"
            data-item="resume_builder"
          >
            Preview my resume free <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <section className={styles.section} aria-labelledby="standards-title">
        <h2 id="standards-title" className={styles.h2}>How we keep this accurate</h2>
        <div className={styles.standards}>
          <div><strong>Official sources</strong>Every requirement links to the agency or issuer that sets it.</div>
          <div><strong>Dated checks</strong>Each guide shows when it was last checked.</div>
          <div><strong>Requirement vs. advice</strong>Resume tips are labeled as our career advice, not official rules.</div>
          <div><strong>Independent</strong>Partners and sponsors never edit guide content.</div>
        </div>
      </section>

      <ResourceFooter />
    </main>
  );
}
