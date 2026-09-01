import { CtaAnalytics } from "../cta-analytics";
import { FlowSteps } from "./flow-steps";
import { ResumeBuilderHeader } from "./resume-builder-header";
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
  className,
  withArrow = true,
}: {
  content: TradeLandingContent;
  location: string;
  label: string;
  className: string;
  withArrow?: boolean;
}) {
  const href = intakeEntryHref(content.trade);
  return (
    <a
      className={className}
      href={href}
      data-analytics-event="cta_click"
      data-location={location}
      data-destination={href}
      data-item="resume_builder_hvac"
    >
      {label}
      {withArrow ? <span aria-hidden="true"> →</span> : null}
    </a>
  );
}

function SkillGroups({ groups }: { groups: TradeLandingContent["skills"]["groups"] }) {
  return (
    <div className={styles.groupGrid}>
      {groups.map((group) => (
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
  );
}

export function TradeLandingPage({ content }: { content: TradeLandingContent }) {
  const hubHref = "/resume-builder";
  const jsonLd = buildTradeLandingJsonLd(content);
  const panelIndex = content.pricing.kicker.replace(/^\/\s*/, "");

  return (
    <main className="rb-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CtaAnalytics />

      <ResumeBuilderHeader
        action={
          <BuildCta
            content={content}
            location="hvac_header"
            label="Build my resume"
            className="rb-button rb-button-primary rb-header-cta"
            withArrow={false}
          />
        }
      />
      <FlowSteps current={1} />

      {/* -------------------------------------------------------------- hero */}
      <section className="rb-entry">
        <div className="rb-entry-copy">
          <p className="rb-kicker">{content.hero.kicker}</p>
          <h1>
            {content.hero.heading} <span>{content.hero.headingAccent}</span>
          </h1>
          <p className="rb-lead">{content.hero.lead}</p>
          <div className={styles.heroActions}>
            <BuildCta
              content={content}
              location="hvac_hero"
              label={content.hero.ctaLabel}
              className="rb-button rb-button-primary"
            />
            <a className={styles.textLink} href={hubHref}>
              or see all seven trade tracks
            </a>
          </div>
          <div className="rb-proof-row" aria-label="Package details">
            {content.hero.proofStats.map((stat) => (
              <div key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="rb-entry-panel" aria-labelledby="pricing-title">
          <p className="rb-panel-index">{panelIndex}</p>
          <h2 id="pricing-title">{content.pricing.heading}</h2>
          <div className={`rb-package-price ${styles.panelPrice}`} aria-hidden="true">
            <span>$</span>
            <strong>9</strong>
            <sup>99</sup>
          </div>
          <p className={styles.panelSubhead}>{content.pricing.subhead}</p>
          <ul className={styles.pricingList}>
            {content.pricing.bullets.map((bullet) => (
              <li key={bullet}>
                <span aria-hidden="true">✓</span> {bullet}
              </li>
            ))}
          </ul>
          <BuildCta
            content={content}
            location="hvac_pricing_card"
            label={content.pricing.ctaLabel}
            className="rb-button rb-button-primary rb-button-full"
          />
        </aside>
      </section>

      {/* ------------------------------------------------------- value props */}
      <section className={styles.lpSection} aria-labelledby="why-title">
        <div>
          <p className="rb-kicker">/ WHY THIS ONE</p>
          <h2 id="why-title">AN HVAC RESUME, NOT A GENERIC ONE</h2>
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

      {/* --------------------------------------------------------- who it's for */}
      <section className={styles.lpSection} aria-labelledby="who-title">
        <div>
          <p className="rb-kicker">/ WHO THIS IS FOR</p>
          <h2 id="who-title">BUILT FOR HVAC FIELD WORKERS AT EVERY STAGE</h2>
        </div>
        <ul className={styles.plainList}>
          {content.whoItIsFor.map((who) => (
            <li key={who}>{who}</li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------- skills */}
      <section className={styles.lpSection} aria-labelledby="skills-title">
        <div>
          <p className="rb-kicker">/ HVAC RESUME SKILLS</p>
          <h2 id="skills-title">THE HVAC SKILLS EMPLOYERS SCAN FOR</h2>
          <p className={styles.sectionLead}>{content.skills.intro}</p>
        </div>
        <SkillGroups groups={content.skills.groups} />
      </section>

      {/* ------------------------------------------------------- certifications */}
      <section className={styles.lpSection} aria-labelledby="certs-title">
        <div>
          <p className="rb-kicker">/ HVAC CERTIFICATIONS</p>
          <h2 id="certs-title">EPA 608 FIRST, THEN THE REST</h2>
          <p className={styles.sectionLead}>{content.certifications.intro}</p>
        </div>
        <div>
          <ul className={styles.plainList}>
            {content.certifications.items.map((cert) => (
              <li key={cert}>{cert}</li>
            ))}
          </ul>
          <p className={styles.note}>{content.certifications.note}</p>
        </div>
      </section>

      {/* ---------------------------------------------------- tools & equipment */}
      <section className={styles.lpSection} aria-labelledby="tools-title">
        <div>
          <p className="rb-kicker">/ HVAC TOOLS &amp; EQUIPMENT</p>
          <h2 id="tools-title">NAME THE TOOLS THAT SHOW WHAT YOU RUN SOLO</h2>
          <p className={styles.sectionLead}>{content.tools.intro}</p>
        </div>
        <SkillGroups groups={content.tools.groups} />
      </section>

      {/* ------------------------------------------------- example accomplishments */}
      <section className={styles.lpSection} aria-labelledby="examples-title">
        <div>
          <p className="rb-kicker">/ HVAC RESUME EXAMPLES</p>
          <h2 id="examples-title">EXAMPLE HVAC ACCOMPLISHMENT BULLETS</h2>
          <p className={styles.sectionLead}>{content.accomplishments.intro}</p>
        </div>
        <div>
          <ul className={styles.exampleList}>
            {content.accomplishments.examples.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>
          <p className={styles.disclaimer}>{content.accomplishments.disclaimer}</p>
        </div>
      </section>

      {/* --------------------------------------------------------- how it works */}
      <section className={styles.lpSection} aria-labelledby="how-title">
        <div>
          <p className="rb-kicker">/ HOW IT WORKS</p>
          <h2 id="how-title">HOW THE TRADE HUSTL3 RESUME BUILDER WORKS</h2>
          <p className={styles.sectionLead}>
            Prefer the overview first? The{" "}
            <a className={styles.inlineLink} href={hubHref}>
              main Resume Builder
            </a>{" "}
            covers all seven skilled-trade tracks and the same $9.99 package.
          </p>
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
      </section>

      {/* --------------------------------------------------------------- ATS */}
      <section className={styles.lpSection} aria-labelledby="ats-title">
        <div>
          <p className="rb-kicker">/ ATS &amp; JOB KEYWORDS</p>
          <h2 id="ats-title">{content.ats.heading}</h2>
        </div>
        <div className={styles.atsBody}>
          {content.ats.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------------- FAQ */}
      <section className={styles.lpSection} aria-labelledby="faq-title">
        <div>
          <p className="rb-kicker">/ HVAC RESUME FAQ</p>
          <h2 id="faq-title">HVAC RESUME QUESTIONS, ANSWERED</h2>
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
      <section className={`rb-package ${styles.closingSection}`} aria-labelledby="closing-title">
        <div>
          <p className="rb-kicker">{content.closingCta.kicker}</p>
          <h2 id="closing-title">{content.closingCta.heading}</h2>
        </div>
        <div className={styles.closingCard}>
          <p>{content.closingCta.body}</p>
          <BuildCta
            content={content}
            location="hvac_footer_cta"
            label={content.closingCta.ctaLabel}
            className="rb-button rb-button-primary rb-button-full"
          />
          <a className={styles.closingLink} href={hubHref}>
            or browse all seven trade tracks
          </a>
        </div>
      </section>

      <footer className="rb-footer">
        <strong>
          TRADE HUSTL<span>3</span>
        </strong>
        <p>Built by Hustle. Backed by Trades.</p>
        <div className="rb-footer-links">
          <a href={hubHref}>Resume Builder</a>
          <a href={tradeLandingPath(content)}>HVAC Resume Builder</a>
          <a href="/top-10-trades">Top 10 Trades</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/resume-builder/refund-policy">Refunds</a>
          <a href="/contact">Support</a>
        </div>
      </footer>
    </main>
  );
}
