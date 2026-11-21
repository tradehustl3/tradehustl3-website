import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
import art from "./credential-art.module.css";

const PAGE_PATH = "/resources/certifications";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PAGE_TITLE = "Skilled-Trades Certifications, Licenses & Training Cards | TRADE HUSTL3";
const PAGE_DESCRIPTION = `EPA 608, OSHA 10/30, CDL, NATE, AWS, and more: ${CREDENTIAL_LIBRARY.length} skilled-trades credentials explained — what each is, who requires it, how to earn it, and the official source.`;

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
    images: [{ url: HUB_OG_IMAGE, type: "image/jpeg", width: 1200, height: 630, alt: PAGE_TITLE }],
  },
  twitter: { card: "summary_large_image", title: PAGE_TITLE, description: PAGE_DESCRIPTION, images: [HUB_OG_IMAGE] },
};

const CERTIFICATION_GROUPS = [
  {
    title: "HVAC & Automotive A/C",
    slugs: ["epa-608", "epa-609", "nate", "ase"],
    card: { src: "/credentials/epa-608.webp", label: "EPA Section 608 Universal card example", height: 667 },
  },
  {
    title: "Welding",
    slugs: ["aws-certified-welder", "aws-cwi"],
    card: { src: "/credentials/aws-membership.webp", label: "American Welding Society membership card example", height: 636 },
  },
];
const GROUPED_CERTIFICATION_SLUGS = new Set(CERTIFICATION_GROUPS.flatMap((group) => group.slugs));

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
  const renderCredential = (record: (typeof sorted)[number]) => (
    <details className={art.directoryCard} key={record.slug}>
      <summary className={art.directorySummary}>
        {record.name}
        <span className={art.directoryTrade}>
          {record.slug === "epa-608" ? "Heating & Air (HVAC)" : record.slug === "epa-609" ? "Automotive A/C" : (familyName.get(record.tradeSlugs[0]) ?? record.tradeSlugs[0])}
        </span>
      </summary>
      <article className={styles.guide} id={record.slug} aria-label={record.name}>
        <span className={styles.badgeRow}>
          <span className={`${styles.badge} ${styles[`badge-${record.kind}`]}`}>{CREDENTIAL_KIND_LABELS[record.kind]}</span>
          <span className={`${styles.badge} ${styles.badgeReq}`}>{CREDENTIAL_REQUIREMENT_LABELS[record.requirement]}</span>
        </span>
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
  );

  return (
    <main className={`${styles.page} ${homeDisplayFont.variable} ${homeBodyFont.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CtaAnalytics />
      <ResourceHeader current="certifications" />

      <section className={`${styles.hero} ${art.credentialHero}`} aria-labelledby="page-title">
        <div className={art.heroFrame}>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link href="/resources">Resource Center</Link> <span aria-hidden="true">/</span> Certifications &amp; Licenses
          </nav>
          <div className={art.cardPair}>
            <Image className={art.credentialCard} src="/credentials/aws-membership.webp" alt="AWS membership card reference" width={1000} height={636} unoptimized />
            <Image className={art.credentialCard} src="/credentials/georgia-plumbing.webp" alt="Georgia journeyman plumbing license reference" width={1000} height={667} unoptimized />
          </div>
          <div className={art.centerRow}>
            <Image className={`${art.credentialCard} ${art.sideLeft}`} src="/credentials/epa-608.webp" alt="EPA Section 608 Universal card reference" width={1000} height={667} unoptimized />
            <div className={art.heroContent}>
              <div className={art.credentialEmblem} aria-hidden="true">▤</div>
              <p className={`${styles.kicker} ${art.goldKicker}`}>CREDENTIAL LIBRARY</p>
              <h1 id="page-title" className={styles.h1}>Certifications, licenses <span>&amp; training cards</span></h1>
              <div className={art.welcome}>
                <p className={art.welcomeLabel}>Welcome to the TRADE HUSTL3 Credential Library</p>
                <p className={art.welcomeQuestion}>Curious about the trades or trying to find your lane?</p>
                <p className={art.welcomeCopy}>See what the work looks like, which credentials you might need, and how to get started or take the next step.</p>
              </div>
            </div>
            <Image className={`${art.credentialCard} ${art.sideRight}`} src="/credentials/cdl.webp" alt="Commercial driver license reference" width={1000} height={667} unoptimized />
          </div>
          <div className={art.cardPair}>
            <Image className={art.credentialCard} src="/credentials/cpo.webp" alt="Certified Pool and Spa Operator certificate reference" width={1000} height={667} unoptimized />
            <Image className={art.credentialCard} src="/credentials/twic.webp" alt="Transportation Worker Identification Credential reference" width={1000} height={667} unoptimized />
          </div>
          <p className={art.referenceNote}>These sample cards are for visual reference only. Credential designs vary by issuer and state. The AWS card shows a membership example.</p>
        </div>
      </section>

      <div className={art.directory}>
        <nav className={art.directoryNav} aria-label="Browse credentials">
          {KIND_ORDER.map((kind) => (
            <a key={kind} href={`#credentials-${kind}`}>{CREDENTIAL_KIND_LABELS[kind]}s</a>
          ))}
          <a href="#by-trade-title">By trade</a>
        </nav>

        {KIND_ORDER.map((kind) => (
          <section key={kind} id={`credentials-${kind}`} className={art.directoryGroup} aria-labelledby={`heading-${kind}`}>
            <h2 id={`heading-${kind}`} className={art.directoryHeading}>{CREDENTIAL_KIND_LABELS[kind]}s</h2>
            {kind === "certification" && CERTIFICATION_GROUPS.map(({ title, slugs, card }) => (
              <section key={title} className={art.certificationCluster}>
                <h3 className={art.clusterHeading}>{title}</h3>
                {sorted.filter((record) => slugs.includes(record.slug)).map(renderCredential)}
                <figure className={art.clusterCard}>
                  <Image src={card.src} alt={card.label} width={1000} height={card.height} />
                  <figcaption>{card.label}</figcaption>
                </figure>
              </section>
            ))}
            {sorted.filter((record) => record.kind === kind && !GROUPED_CERTIFICATION_SLUGS.has(record.slug)).map(renderCredential)}
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
              </details>
            ))}
          </section>
        ))}

        <section className={art.directoryGroup} aria-labelledby="by-trade-title">
          <h2 id="by-trade-title" className={art.directoryHeading}>Credentials by Trade</h2>
          {TRADE_CAREER_FAMILIES.map((family) => (
            <details key={family.slug} className={art.directoryCard}>
              <summary className={art.directorySummary}>{family.name}</summary>
              <div id={`trade-${family.slug}`} className={styles.guide}>
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
            </details>
          ))}
        </section>
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
