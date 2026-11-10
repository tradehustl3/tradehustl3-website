import Link from "next/link";
import { CREDENTIAL_KIND_LABELS, CREDENTIAL_REQUIREMENT_LABELS, credentialBySlug } from "./resources/credential-library";
import styles from "./home-pathway.module.css";

/**
 * Homepage section 4 — YOUR FIRST STEPS.
 *
 * Beginner path: basics, paid apprenticeship, first credentials, state rules.
 * Apprenticeship facts restate apprenticeship.gov (U.S. Department of Labor);
 * the basics restate the BLS "How to Become One" pages used on the trade
 * cards. Credential labels come from the Credential Library, never from here.
 */

export const FIRST_STEP_SOURCES = {
  apprenticeship: { label: "Apprenticeship.gov — Registered Apprenticeship", url: "https://www.apprenticeship.gov/registered-apprenticeship" },
  apprenticeshipFinder: { label: "Apprenticeship Job Finder", url: "https://www.apprenticeship.gov/apprenticeship-job-finder" },
  licenseFinder: { label: "CareerOneStop License Finder", url: "https://www.careeronestop.org/Toolkit/Training/find-licenses.aspx" },
} as const;

/** Entry-level credentials featured here; each must exist in the library (tested). */
export const FIRST_STEP_CREDENTIALS = ["osha-outreach-10-30", "epa-608", "forklift-operator", "cdl"] as const;

function firstCredentials() {
  return FIRST_STEP_CREDENTIALS.map((slug) => {
    const record = credentialBySlug(slug);
    if (!record) throw new Error(`Unknown credential ${slug}`);
    return {
      slug,
      name: record.name,
      kind: CREDENTIAL_KIND_LABELS[record.kind],
      requirement: CREDENTIAL_REQUIREMENT_LABELS[record.requirement],
    };
  });
}

export function FirstSteps() {
  const credentials = firstCredentials();

  return (
    <section className={`${styles.section} ${styles.light}`} id="first-steps" aria-labelledby="first-steps-title">
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.kicker}>YOUR FIRST STEPS</p>
          <h2 id="first-steps-title" className={styles.title}>
            Picked a lane? <span className={styles.red}>Here&apos;s how to get in.</span>
          </h2>
          <p className={styles.lead}>
            No one starts as a journeyman. These are the common ways in, with links to the official sources so you can check the rules where you live.
          </p>
        </header>

        <ol className={styles.stepGrid}>
          <li className={styles.step}>
            <span className={styles.stepNumber} aria-hidden="true">01</span>
            <h3>Learn the basics</h3>
            <p>
              Most trades ask for a high school diploma or equivalent. Shop classes, technical schools, and community colleges teach the fundamentals, and in some trades that schooling counts toward an apprenticeship.
            </p>
            <Link className={styles.stepLink} href="/resume-examples" data-analytics-event="select_content" data-location="first_steps" data-destination="/resume-examples" data-item="compare_trades">
              Compare the trades <span aria-hidden="true">→</span>
            </Link>
          </li>

          <li className={styles.step}>
            <span className={styles.stepNumber} aria-hidden="true">02</span>
            <h3>Look for a paid apprenticeship</h3>
            <p>
              A Registered Apprenticeship is a job: you earn a wage that rises as your skills grow, learn on the job from an experienced mentor, take related classroom training, and finish with a nationally recognized credential.
            </p>
            <a className={styles.stepLink} href={FIRST_STEP_SOURCES.apprenticeshipFinder.url} rel="noopener" data-analytics-event="select_content" data-location="first_steps" data-destination={FIRST_STEP_SOURCES.apprenticeshipFinder.url} data-item="apprenticeship_finder">
              Search the {FIRST_STEP_SOURCES.apprenticeshipFinder.label} <span aria-hidden="true">↗</span>
            </a>
            <p className={styles.stepSource}>
              Source: <a href={FIRST_STEP_SOURCES.apprenticeship.url} rel="noopener">{FIRST_STEP_SOURCES.apprenticeship.label}</a>
            </p>
          </li>

          <li className={styles.step}>
            <span className={styles.stepNumber} aria-hidden="true">03</span>
            <h3>Earn your first credentials</h3>
            <p>Know what each one actually is before you put it on an application.</p>
            <ul className={styles.stepCreds}>
              {credentials.map((credential) => (
                <li key={credential.slug}>
                  <Link href={`/resources/certifications#${credential.slug}`} data-analytics-event="select_content" data-location="first_steps_credential" data-destination={`/resources/certifications#${credential.slug}`} data-item={credential.slug}>
                    {credential.name}
                  </Link>
                  <small>{credential.kind} · {credential.requirement}</small>
                </li>
              ))}
            </ul>
          </li>

          <li className={styles.step}>
            <span className={styles.stepNumber} aria-hidden="true">04</span>
            <h3>Check your state&apos;s rules</h3>
            <p>
              Licenses for electricians, plumbers, and some HVAC and welding work are set by states and localities. Look up what your state requires before you plan your training.
            </p>
            <a className={styles.stepLink} href={FIRST_STEP_SOURCES.licenseFinder.url} rel="noopener" data-analytics-event="select_content" data-location="first_steps" data-destination={FIRST_STEP_SOURCES.licenseFinder.url} data-item="license_finder">
              Use the {FIRST_STEP_SOURCES.licenseFinder.label} <span aria-hidden="true">↗</span>
            </a>
          </li>
        </ol>

        <p className={styles.stepFooter}>
          Want it all in one place?{" "}
          <Link href="/resources" data-analytics-event="cta_click" data-location="first_steps" data-destination="/resources" data-item="resource_center">
            Open the free Resource Center <span aria-hidden="true">→</span>
          </Link>
        </p>
      </div>
    </section>
  );
}
