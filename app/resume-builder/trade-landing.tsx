/* eslint-disable @next/next/no-html-link-for-pages -- Resume Builder entry links do a full navigation into the app flow, not a client-router push */
import Image from "next/image";
import { CtaAnalytics } from "../cta-analytics";
import { intakeEntryHref } from "./trade-preselect";
import {
  buildTradeLandingJsonLd,
  tradeLandingPath,
  type TradeLandingContent,
} from "./trade-landing-content";
import styles from "./trade-landing.module.css";

/** One conversion link into the existing intake flow, wired for the global CtaAnalytics delegate. */
function BuildCta({
  content,
  location,
  label,
  variant = "primary",
}: {
  content: TradeLandingContent;
  location: string;
  label: string;
  variant?: "primary" | "nav";
}) {
  const href = intakeEntryHref(content.trade);
  return (
    <a
      className={variant === "nav" ? styles.navCta : styles.primaryButton}
      href={href}
      data-analytics-event="cta_click"
      data-location={location}
      data-destination={href}
      data-item="resume_builder_hvac"
    >
      {label}
      {variant === "primary" ? <span aria-hidden="true"> →</span> : null}
    </a>
  );
}

export function TradeLandingPage({ content }: { content: TradeLandingContent }) {
  const hubHref = "/resume-builder";
  const jsonLd = buildTradeLandingJsonLd(content);

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CtaAnalytics />

      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label="TRADE HUSTL3 home">
          <Image src="/trade-hustl3-logo.png" alt="TRADE HUSTL3 logo" width={52} height={52} priority />
          <span>TRADE HUSTL<span>3</span></span>
        </a>
        <nav className={styles.nav} aria-label="HVAC Resume Builder navigation">
          <a href={hubHref}>Resume Builder</a>
          <a href="/top-10-trades">Top 10 Trades</a>
          <BuildCta content={content} location="hvac_header" label="Build my resume — $9.99" variant="nav" />
        </nav>
      </header>

      {/* ---------------------------------------------------------------- hero */}
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{content.hero.eyebrow}</p>
          <h1 className={styles.heroHeading}>
            {content.hero.heading} <span>{content.hero.headingAccent}</span>
          </h1>
          <p className={styles.lead}>{content.hero.lead}</p>
          <div className={styles.priceLine}>
            <strong>$9.99 one-time</strong>
            <span>No subscription</span>
            <span>Clean PDF + editable DOCX</span>
          </div>
          <div className={styles.heroActions}>
            <BuildCta content={content} location="hvac_hero" label={content.hero.ctaLabel} />
            <a className={styles.textLink} href={hubHref}>
              or see all seven trade tracks
            </a>
          </div>
        </div>

        <aside className={styles.pricingCard} aria-label="Package summary">
          <p className={styles.pricingKicker}>ONE STRAIGHTFORWARD PACKAGE</p>
          <div className={styles.priceTag}>
            <span>$</span>
            <strong>9</strong>
            <sup>99</sup>
          </div>
          <ul>
            <li>One completed HVAC resume, watermarked preview before payment</li>
            <li>EPA 608 and certifications placed where ATS looks first</li>
            <li>ATS-friendly structure across the HVAC &amp; Refrigeration track</li>
            <li>Up to 3 corrections within 7 days</li>
            <li>Clean PDF + editable DOCX after payment</li>
            <li>No subscription, no auto-renewal</li>
          </ul>
          <BuildCta content={content} location="hvac_pricing_card" label={content.hero.ctaLabel} />
        </aside>
      </section>

      {/* ----------------------------------------------------------- value props */}
      <section className={styles.section} aria-labelledby="why-title">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>/ WHY THIS ONE</p>
          <h2 id="why-title" className={styles.sectionTitle}>
            An HVAC resume, not a generic one
          </h2>
        </div>
        <div className={styles.valueGrid}>
          {content.valueProps.map((prop) => (
            <article key={prop.label} className={styles.valueCard}>
              <h3>{prop.label}</h3>
              {prop.items.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </article>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- who it's for */}
      <section className={styles.section} aria-labelledby="who-title">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>/ WHO THIS IS FOR</p>
          <h2 id="who-title" className={styles.sectionTitle}>
            Built for HVAC field workers at every stage
          </h2>
        </div>
        <ul className={styles.whoList}>
          {content.whoItIsFor.map((who) => (
            <li key={who}>{who}</li>
          ))}
        </ul>
      </section>

      {/* --------------------------------------------------------------- skills */}
      <section className={styles.section} aria-labelledby="skills-title">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>/ HVAC RESUME SKILLS</p>
          <h2 id="skills-title" className={styles.sectionTitle}>
            The HVAC skills employers scan for
          </h2>
        </div>
        <p className={styles.sectionLead}>{content.skills.intro}</p>
        <div className={styles.groupGrid}>
          {content.skills.groups.map((group) => (
            <article key={group.label} className={styles.groupCard}>
              <h3>{group.label}</h3>
              <ul className={styles.chipList}>
                {group.items.map((item) => (
                  <li key={item} className={styles.chip}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- certifications */}
      <section className={styles.section} aria-labelledby="certs-title">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>/ HVAC CERTIFICATIONS</p>
          <h2 id="certs-title" className={styles.sectionTitle}>
            EPA 608 first, then the rest
          </h2>
        </div>
        <p className={styles.sectionLead}>{content.certifications.intro}</p>
        <ul className={styles.certList}>
          {content.certifications.items.map((cert) => (
            <li key={cert}>{cert}</li>
          ))}
        </ul>
        <p className={styles.note}>{content.certifications.note}</p>
      </section>

      {/* -------------------------------------------------------- tools & equipment */}
      <section className={styles.section} aria-labelledby="tools-title">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>/ HVAC TOOLS &amp; EQUIPMENT</p>
          <h2 id="tools-title" className={styles.sectionTitle}>
            Name the tools that show what you run solo
          </h2>
        </div>
        <p className={styles.sectionLead}>{content.tools.intro}</p>
        <div className={styles.groupGrid}>
          {content.tools.groups.map((group) => (
            <article key={group.label} className={styles.groupCard}>
              <h3>{group.label}</h3>
              <ul className={styles.chipList}>
                {group.items.map((item) => (
                  <li key={item} className={styles.chip}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- example accomplishments */}
      <section className={styles.section} aria-labelledby="examples-title">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>/ HVAC RESUME EXAMPLES</p>
          <h2 id="examples-title" className={styles.sectionTitle}>
            Example HVAC accomplishment bullets
          </h2>
        </div>
        <p className={styles.sectionLead}>{content.accomplishments.intro}</p>
        <ul className={styles.exampleList}>
          {content.accomplishments.examples.map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>
        <p className={styles.disclaimer}>{content.accomplishments.disclaimer}</p>
      </section>

      {/* ------------------------------------------------------------- how it works */}
      <section className={styles.section} aria-labelledby="how-title">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>/ HOW IT WORKS</p>
          <h2 id="how-title" className={styles.sectionTitle}>
            How the TRADE HUSTL3 Resume Builder works
          </h2>
        </div>
        <ol className={styles.steps}>
          {content.howItWorks.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.stepNum}>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <p className={styles.sectionLead}>
          Prefer to start from the overview first? The{" "}
          <a className={styles.inlineLink} href={hubHref}>
            main Resume Builder
          </a>{" "}
          covers all seven skilled-trade tracks and the same $9.99 package.
        </p>
      </section>

      {/* --------------------------------------------------------------- ATS */}
      <section className={`${styles.section} ${styles.atsSection}`} aria-labelledby="ats-title">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>/ ATS &amp; JOB KEYWORDS</p>
          <h2 id="ats-title" className={styles.sectionTitle}>
            {content.ats.heading}
          </h2>
        </div>
        <div className={styles.atsBody}>
          {content.ats.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------------- FAQ */}
      <section className={styles.section} aria-labelledby="faq-title">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>/ HVAC RESUME FAQ</p>
          <h2 id="faq-title" className={styles.sectionTitle}>
            HVAC resume questions, answered
          </h2>
        </div>
        <div className={styles.faqList}>
          {content.faqs.map((faq) => (
            <details key={faq.question} className={styles.faq}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- closing CTA */}
      <section className={styles.closing} aria-labelledby="closing-title">
        <p className={styles.kicker}>/ READY WHEN YOU ARE</p>
        <h2 id="closing-title" className={styles.closingTitle}>
          {content.closingCta.heading}
        </h2>
        <p>{content.closingCta.body}</p>
        <BuildCta content={content} location="hvac_footer_cta" label={content.closingCta.ctaLabel} />
      </section>

      <footer className={styles.footer}>
        <a className={styles.footerBrand} href="/">
          TRADE HUSTL<span>3</span> LLC
        </a>
        <p>Built by Hustle, Backed by Trades.</p>
        <nav aria-label="Footer links">
          <a href={hubHref}>Resume Builder</a>
          <a href={tradeLandingPath(content)}>HVAC Resume Builder</a>
          <a href="/top-10-trades">Top 10 Trades</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/resume-builder/refund-policy">Refunds</a>
          <a href="/contact">Support</a>
        </nav>
      </footer>
    </main>
  );
}
