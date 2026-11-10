import Link from "next/link";
import { CREDENTIAL_LIBRARY } from "./resources/credential-library";
import { LABOR_MARKET_FACTS, LABOR_MARKET_PERIOD, formatCount, formatPay } from "./resources/labor-market";
import { CATALOG_METRICS } from "./resume-examples/catalog-metrics";
import styles from "./home-hub.module.css";

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

/** A clear next step for new entrants, experienced tradespeople, and career changers.
 * The three pillars match the actual TRADE HUSTL3 brand lockup.
 */
const STORY_STEPS = [
  {
    number: "01",
    pillar: "ENTER",
    heading: "Find the trade that fits.",
    copy: "Explore the work, compare career families, and see the job titles before choosing your direction.",
    href: "/resume-examples",
    cta: "Explore the trades",
    item: "enter_explore",
  },
  {
    number: "02",
    pillar: "EARN",
    heading: "Learn what the work takes.",
    copy: "Get clear on training, licenses, and employer-preferred credentials with guides linked to their sources.",
    href: "/resources/certifications",
    cta: "Check credentials",
    item: "earn_qualify",
  },
  {
    number: "03",
    pillar: "ELEVATE",
    heading: "Show what you can do.",
    copy: "Put your real skills and experience on a trades-focused resume. Preview it free before deciding to buy.",
    href: "#resume-start",
    cta: "Build my free preview",
    item: "elevate_resume",
  },
] as const;

export function HubHero() {
  return (
    <section className={styles.hero} id="hub-mission" aria-labelledby="hub-title">
      <div className={styles.storyInner}>
        <div className={styles.storyIntro}>
          <p className={styles.storyKicker}>THE TRADE HUSTL3 STORY · BUILT BY A TRADESMAN</p>
          <p className={styles.storyPromise}>ENTER <span aria-hidden="true">•</span> EARN <span aria-hidden="true">•</span> ELEVATE</p>
          <h2 id="hub-title" className={styles.storyTitle}>
            Your future is built, <span>not handed to you.</span>
          </h2>
          <p className={styles.storyLead}>
            You might be in school, starting your first job, changing careers, or already working
            in the field. Wherever you&apos;re starting, TRADE HUSTL3 gives you real trade
            information, practical career tools, and a clearer path to your next move.
          </p>
        </div>

        <div className={styles.storyCards} aria-label="Three ways to move forward in the skilled trades">
          {STORY_STEPS.map((step) => (
            <article className={styles.storyCard} key={step.pillar}>
              <div className={styles.storyCardTop}>
                <span className={styles.storyNumber} aria-hidden="true">{step.number}</span>
                <span className={styles.storyPillar}>{step.pillar}</span>
              </div>
              <h3 className={styles.storyCardTitle}>{step.heading}</h3>
              <p className={styles.storyCardCopy}>{step.copy}</p>
              <Link
                className={styles.storyAction}
                href={step.href}
                data-analytics-event="cta_click"
                data-location="hub_story"
                data-destination={step.href}
                data-item={step.item}
              >
                {step.cta} <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>

        <div className={styles.storyResources}>
          <div className={styles.storyResourcesHeader}>
            <p>Real answers, not guesswork. Start with the guides.</p>
            <Link
              className={styles.storyAllResources}
              href="/resources"
              data-analytics-event="cta_click"
              data-location="hub_hero"
              data-destination="/resources"
              data-item="resource_center"
            >
              Explore the Resource Center <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <nav className={styles.popular} aria-label="Popular credential and training guides">
            {POPULAR.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                data-analytics-event="select_content"
                data-location="hub_hero_popular"
                data-destination={href}
                data-item={label}
              >
                {label} <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </nav>
        </div>

        <dl className={styles.stats} aria-label="Explore the TRADE HUSTL3 resource library">
          <div><dt>trade families to explore</dt><dd>{CATALOG_METRICS.careerFamilies}</dd></div>
          <div><dt>mapped skilled-trades roles</dt><dd>{CATALOG_METRICS.mappedRoles}</dd></div>
          <div><dt>credentials linked to sources</dt><dd>{CREDENTIAL_LIBRARY.length}</dd></div>
          <div><dt>cost to use the guides</dt><dd>$0</dd></div>
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
];

export function HubDivisions() {
  return (
    <section className={styles.section} aria-labelledby="divisions-title">
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>EXPLORE WHAT’S AVAILABLE</p>
        <h2 id="divisions-title" className={styles.h2}>Tools for your next career move</h2>
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
      <p className={styles.sectionLead}>Coming next: training and job resources, career advice, and the Field Report.</p>
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
