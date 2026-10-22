import type { Metadata } from "next";
import Link from "next/link";
import { CtaAnalytics } from "../../cta-analytics";
import { homeBodyFont, homeDisplayFont } from "../../home-fonts";
import { TRADE_CAREER_FAMILIES } from "../../resume-examples/trade-career-catalog";
import { HUB_OG_IMAGE, SITE_NAME, SITE_URL } from "../../site";
import {
  CREDENTIAL_KIND_LABELS,
  CREDENTIAL_LIBRARY,
  CREDENTIAL_REQUIREMENT_LABELS,
  CREDENTIAL_REVIEW,
  credentialsForTrade,
  type CredentialKind,
} from "../credential-library";
import { ResourceFooter, ResourceHeader } from "../resource-chrome";
import styles from "../resources.module.css";

const PAGE_PATH = "/resources/certifications";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PAGE_TITLE = "Skilled-Trades Certifications, Licenses & Training Cards | TRADE HUSTL3";
const PAGE_DESCRIPTION = `EPA 608, OSHA 10/30, CDL, NATE, AWS, and more: ${CREDENTIAL_LIBRARY.length} skilled-trades credentials, who requires them, how to earn them, and the official source.`;

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
    images: [{ url: HUB_OG_IMAGE, width: 1200, height: 630, alt: PAGE_TITLE }],
  },
  twitter: { card: "summary_large_image", title: PAGE_TITLE, description: PAGE_DESCRIPTION, images: [HUB_OG_IMAGE] },
};

const KIND_ORDER: readonly CredentialKind[] = ["certification", "license", "training-card", "qualification"];
const familyName = new Map(TRADE_CAREER_FAMILIES.map((family) => [family.slug, family.name]));

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

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
      inLanguage: "en-US",
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Resource Center", item: `${SITE_URL}/resources` },
        { "@type": "ListItem", position: 3, name: "Certifications & Licenses", item: PAGE_URL },
      ],
    },
    {
      "@type": "ItemList",
      "@id": `${PAGE_URL}#credentials`,
      numberOfItems: CREDENTIAL_LIBRARY.length,
      itemListElement: CREDENTIAL_LIBRARY.map((record, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: record.name,
        url: `${PAGE_URL}#${record.slug}`,
      })),
    },
  ],
};

export default function CertificationsPage() {
  const sorted = [...CREDENTIAL_LIBRARY].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));

  return (
    <main className={`${styles.page} ${homeDisplayFont.variable} ${homeBodyFont.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CtaAnalytics />
      <ResourceHeader current="certifications" />

      <section className={styles.hero} aria-labelledby="page-title">
        <div className={styles.heroInner}>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link href="/resources">Resource Center</Link> <span aria-hidden="true">/</span> Certifications &amp; Licenses
          </nav>
          <p className={styles.kicker}>CREDENTIAL LIBRARY</p>
          <h1 id="page-title" className={styles.h1}>Certifications, licenses <span>&amp; training cards</span></h1>
          <p className={styles.lead}>
            {CREDENTIAL_LIBRARY.length} skilled-trades credentials: what each one is, who requires it, how to earn it, and how to list it on a resume.
            Checked against official sources and reviewed by {CREDENTIAL_REVIEW.reviewer}.
          </p>
        </div>
      </section>

      <div className={styles.layout}>
        <aside className={styles.toc} aria-label="Browse credentials">
          {KIND_ORDER.map((kind) => {
            const records = sorted.filter((record) => record.kind === kind);
            if (records.length === 0) return null;
            return (
              <nav key={kind} aria-label={`${CREDENTIAL_KIND_LABELS[kind]}s`}>
                <h2>{CREDENTIAL_KIND_LABELS[kind]}s</h2>
                <ul>{records.map((record) => <li key={record.slug}><a href={`#${record.slug}`}>{record.name}</a></li>)}</ul>
              </nav>
            );
          })}
          <nav aria-label="Credentials by trade">
            <h2>By trade</h2>
            <ul>
              {TRADE_CAREER_FAMILIES.map((family) => (
                <li key={family.slug}><a href={`#trade-${family.slug}`}>{family.name}</a></li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className={styles.guides}>
          {sorted.map((record) => (
            <article className={styles.guide} id={record.slug} key={record.slug} aria-labelledby={`${record.slug}-title`}>
              <span className={styles.badgeRow}>
                <span className={`${styles.badge} ${styles[`badge-${record.kind}`]}`}>{CREDENTIAL_KIND_LABELS[record.kind]}</span>
                <span className={`${styles.badge} ${styles.badgeReq}`}>{CREDENTIAL_REQUIREMENT_LABELS[record.requirement]}</span>
              </span>
              <h2 id={`${record.slug}-title`}>{record.name}</h2>
              <p className={styles.guideSummary}>{record.summary}</p>

              <dl className={styles.facts}>
                <div><dt>Issued by</dt><dd>{record.issuer}</dd></div>
                <div><dt>Who needs it</dt><dd>{record.whoNeedsIt}</dd></div>
                <div><dt>Renewal</dt><dd>{record.renewal}</dd></div>
                {record.cost ? <div><dt>Published cost</dt><dd>{record.cost.text}</dd></div> : null}
              </dl>

              {record.details?.length ? (
                <dl className={styles.detailList}>
                  {record.details.map((detail) => (
                    <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.text}</dd></div>
                  ))}
                </dl>
              ) : null}

              <div>
                <h3>How to earn it</h3>
                <ol className={styles.steps}>{record.howToEarn.map((step) => <li key={step}>{step}</li>)}</ol>
              </div>

              <div className={styles.advice}>
                <span className={styles.adviceLabel}>ON YOUR RESUME · TRADE HUSTL3 CAREER ADVICE</span>
                <div className={styles.adviceRow}><b className={styles.adviceGood}>WRITE</b><code>{record.resumeTip.write}</code></div>
                <div className={styles.adviceRow}><b className={styles.adviceBad}>AVOID</b><code>{record.resumeTip.avoid}</code></div>
                <p>{record.resumeTip.why}</p>
              </div>

              <div>
                <h3>Trades that use it</h3>
                <div className={styles.tradeLinks}>
                  {record.tradeSlugs.map((slug) => (
                    <a key={slug} href={`#trade-${slug}`}>{familyName.get(slug) ?? slug}</a>
                  ))}
                </div>
              </div>

              <div>
                <h3>Official sources</h3>
                <ul className={styles.sources}>
                  {record.sources.map((source) => <li key={source.url}><a href={source.url} rel="noopener">{source.label}</a></li>)}
                </ul>
              </div>

              <p className={styles.verified}>
                Last checked {formatDate(record.lastVerified)} against the sources above · Reviewed by {CREDENTIAL_REVIEW.reviewer}.
                Requirements can change — confirm with the issuer before you test or apply.
              </p>
            </article>
          ))}

          <section className={styles.guide} aria-labelledby="by-trade-title">
            <h2 id="by-trade-title">Credentials by trade</h2>
            {TRADE_CAREER_FAMILIES.map((family) => (
              <div key={family.slug} id={`trade-${family.slug}`} className={styles.tradeBlock}>
                <h3>{family.name}</h3>
                <div className={styles.tradeLinks}>
                  {credentialsForTrade(family.slug).map((record) => (
                    <a key={record.slug} href={`#${record.slug}`}>{record.name}</a>
                  ))}
                </div>
                <Link
                  className={styles.textLink}
                  href={`/resume-examples#${family.slug}`}
                  data-analytics-event="select_content"
                  data-location="certifications_by_trade"
                  data-destination={`/resume-examples#${family.slug}`}
                  data-item={family.slug}
                >
                  {family.name} job titles and resume track →
                </Link>
              </div>
            ))}
          </section>
        </div>
      </div>

      <div className={styles.bridge}>
        <div className={styles.bridgeInner}>
          <div>
            <h2 className={styles.h2}>Earned it? Show it right.</h2>
            <p className={styles.body}>The Resume Builder lists only the credentials you actually hold — never an invented license or certification. Preview free; unlock for $9.99 one time.</p>
          </div>
          <Link
            className={styles.primaryCta}
            href="/#resume-start"
            data-analytics-event="cta_click"
            data-location="certifications_bridge"
            data-destination="/#resume-start"
            data-item="resume_builder"
          >
            Build my free preview <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <ResourceFooter />
    </main>
  );
}
