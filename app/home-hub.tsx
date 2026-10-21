import Link from "next/link";
import { CREDENTIAL_LIBRARY } from "./resources/credential-library";
import { LABOR_MARKET_FACTS, LABOR_MARKET_PERIOD, formatCount, formatPay } from "./resources/labor-market";
import { CATALOG_METRICS } from "./resume-examples/catalog-metrics";
import styles from "./home-hub.module.css";
import { ToolHeroArt } from "./tool-silhouettes";

/**
 * Hub homepage sections (approved design, Oct 21 2026): TRADE HUSTL3 as a
 * skilled-trades career and resource hub, with the Resume Builder as one of its
 * products. Every count is computed from the catalog or credential library.
 */

const POPULAR = [
  ["EPA 608", "/resources/certifications#epa-608"],
  ["OSHA 10 vs. OSHA 30", "/resources/certifications#osha-outreach-10-30"],
  ["CDL classes", "/resources/certifications#cdl"],
  ["Forklift training", "/resources/certifications#forklift-operator"],
] as const;

export function HubHero() {
  return (
    <section className={styles.hero} id="top" aria-labelledby="hub-title">
      <ToolHeroArt />
      <div className={styles.heroInner}>
        <p className={styles.kicker}>SKILLED-TRADES CAREER &amp; RESOURCE HUB</p>
        <h1 id="hub-title" className={styles.h1}>Built for the people who build, maintain, repair, and move America.</h1>
        <p className={styles.lead}>
          Explore your trade. Develop your skills. Advance your career. Free trade guides, sourced credential guides,
          and career tools — built by a tradesman.
        </p>
        <div className={styles.heroActions}>
          <Link
            className={styles.lightCta}
            href="/resources"
            data-analytics-event="cta_click"
            data-location="hub_hero"
            data-destination="/resources"
            data-item="resource_center"
          >
            Explore the Resource Center
          </Link>
          <a
            className={styles.outlineCta}
            href="#resume-start"
            data-analytics-event="cta_click"
            data-location="hub_hero"
            data-destination="#resume-start"
            data-item="resume_builder"
          >
            Build a resume — free preview
          </a>
        </div>
        <div className={styles.popular}>
          <span>Popular:</span>
          {POPULAR.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              data-analytics-event="select_content"
              data-location="hub_hero_popular"
              data-destination={href}
              data-item={label}
            >
              {label}
            </Link>
          ))}
        </div>
        <dl className={styles.stats}>
          <div><dt>trade families</dt><dd>{CATALOG_METRICS.careerFamilies}</dd></div>
          <div><dt>mapped job titles</dt><dd>{CATALOG_METRICS.mappedRoles}</dd></div>
          <div><dt>credentials checked against official sources</dt><dd>{CREDENTIAL_LIBRARY.length}</dd></div>
          <div><dt>to use every guide</dt><dd>$0</dd></div>
        </dl>
      </div>
    </section>
  );
}

type Division = { title: string; copy: string; tag: string; href?: string; cta?: string; paid?: boolean };

const DIVISIONS: readonly Division[] = [
  { title: "Trade Explorer", tag: "Free", copy: `${CATALOG_METRICS.careerFamilies} trade families and ${CATALOG_METRICS.mappedRoles} job titles, with what each trade looks for.`, href: "/resume-examples", cta: "Explore trades" },
  { title: "Credential Center", tag: "Free", copy: `${CREDENTIAL_LIBRARY.length} certifications, licenses, and training cards — labeled by type and linked to the issuer.`, href: "/resources/certifications", cta: "Browse credentials" },
  { title: "Career Tools", tag: "Free preview · $9.99", copy: "The TRADE HUSTL3 Resume Builder with a matching cover letter, PDF and editable Word.", href: "#resume-start", cta: "Build my resume", paid: true },
  { title: "Training & Jobs", tag: "Coming soon", copy: "How to find apprenticeships and training through official finders." },
  { title: "Career Center", tag: "Coming soon", copy: "Trade interview questions, application tips, and moving up." },
  { title: "Field Report", tag: "Coming soon", copy: "A weekly, sourced story on credentials, training, and the trades job market." },
];

export function HubDivisions() {
  return (
    <section className={styles.section} aria-labelledby="divisions-title">
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>ONE BRAND · SIX WAYS IN</p>
        <h2 id="divisions-title" className={styles.h2}>Everything a trade career needs</h2>
      </div>
      <ul className={styles.divisions}>
        {DIVISIONS.map((division) => {
          const body = (
            <>
              <span className={styles.divisionTag} data-variant={division.paid ? "paid" : division.href ? "free" : "soon"}>{division.tag}</span>
              <span className={styles.divisionTitle}>{division.title}</span>
              <span className={styles.divisionCopy}>{division.copy}</span>
              {division.cta ? <span className={styles.divisionCta}>{division.cta} →</span> : null}
            </>
          );
          return (
            <li key={division.title}>
              {division.href ? (
                <Link
                  className={styles.division}
                  data-live="true"
                  href={division.href}
                  data-analytics-event="select_content"
                  data-location="hub_divisions"
                  data-destination={division.href}
                  data-item={division.title}
                >
                  {body}
                </Link>
              ) : (
                <div className={styles.division} data-live="false">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function HubOutlook() {
  return (
    <section className={styles.section} aria-labelledby="outlook-title">
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>THE TRADES ARE HIRING</p>
        <h2 id="outlook-title" className={styles.h2}>Real openings. Every year.</h2>
        <p className={styles.sectionLead}>Average openings projected each year, {LABOR_MARKET_PERIOD}, from the U.S. Bureau of Labor Statistics.</p>
      </div>
      <div className={styles.facts}>
        {LABOR_MARKET_FACTS.map((fact, index) => (
          <figure key={fact.id} className={styles.fact} data-tone={index < 2 ? "dark" : "light"}>
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
        Source: <a href="https://www.bls.gov/ooh/" rel="noopener">BLS Occupational Outlook Handbook</a>, 2025–35 projections.
        Electricians and HVAC are included in the broader groups, so these numbers should not be added together.
      </p>
    </section>
  );
}
