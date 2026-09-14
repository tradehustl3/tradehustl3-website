import Image from "next/image";
import { CtaAnalytics } from "../cta-analytics";
import { ResumeBuilderHeader } from "./resume-builder-header";
import { ResumeHeroTexture } from "./resume-hero-texture";
import { intakeEntryHref } from "./trade-preselect";
import {
  buildTradeLandingJsonLd,
  tradeLandingPath,
  TRADE_LANDING_PAGES,
  type LabeledGroup,
  type TradeLandingContent,
} from "./trade-landing-content";
import styles from "./trade-landing.module.css";

const HUB_HREF = "/resume-builder";

const TRADE_WORKSITE_IMAGES: Record<
  TradeLandingContent["trade"],
  { src: string; alt: string; width: number; height: number }
> = {
  "HVAC & Refrigeration": {
    src: "/optimized/hvac-manifold-worksite.webp",
    alt: "HVAC manifold gauges connected to commercial equipment at an active worksite",
    width: 1400,
    height: 788,
  },
  "Facilities Maintenance": {
    src: "/trade-landings/facilities-maintenance-worksite.webp",
    alt: "Facilities maintenance tool cart, drill, ladders, and building materials in a commercial renovation corridor",
    width: 1536,
    height: 1024,
  },
  Electrical: {
    src: "/trade-landings/electrician-worksite.webp",
    alt: "Commercial electrical panel, multimeter, and insulated tools at a construction site",
    width: 1536,
    height: 1024,
  },
  Plumbing: {
    src: "/trade-landings/plumbing-drain-cleaner-worksite.webp",
    alt: "Plumber operating a wheeled auto-feed sewer auger at a commercial drain cleanout",
    width: 1536,
    height: 1024,
  },
  "Welding & Fabrication": {
    src: "/trade-landings/welding-female-pink-helmet-worksite.webp",
    alt: "Black female welder with a ponytail and pink welding helmet fabricating steel in an active shop",
    width: 1536,
    height: 1024,
  },
  "Construction & Carpentry": {
    src: "/trade-landings/construction-carpenter-framing-worksite.webp",
    alt: "Framing nail gun, speed square, carpenter pencil, and house plans at a residential framing site",
    width: 1536,
    height: 1024,
  },
  "General Labor / Trade Helper": {
    src: "/trade-landings/general-labor-traffic-control-worksite.webp",
    alt: "Road construction flagger in a high-visibility safety vest holding a stop paddle in an active work zone",
    width: 1536,
    height: 1024,
  },
};

function BuildCta({ content, location, label, className, withArrow = true }: {
  content: TradeLandingContent;
  location: string;
  label: string;
  className: string;
  withArrow?: boolean;
}) {
  const href = intakeEntryHref(content.trade);
  return (
    <a className={className} href={href} data-analytics-event="cta_click"
      data-location={location} data-destination={href} data-item={content.analyticsItem}>
      <span>{label}</span>{withArrow ? <span aria-hidden="true">→</span> : null}
    </a>
  );
}

function ChipCards({ groups }: { groups: LabeledGroup[] }) {
  return (
    <div className={styles.groupGrid}>
      {groups.map((group) => (
        <article key={group.label} className={styles.groupCard}>
          <h3>{group.label}</h3>
          <ul className={styles.chipList}>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      ))}
    </div>
  );
}

function SiblingGuides({ content }: { content: TradeLandingContent }) {
  return (
    <nav className={styles.siblingGuides} aria-label="Other trade Resume Builder guides">
      <p>Building for a different trade?</p>
      <ul>
        {TRADE_LANDING_PAGES.filter((page) => page.slug !== content.slug).map((page) => (
          <li key={page.slug}><a href={tradeLandingPath(page)}>{page.breadcrumbName}</a></li>
        ))}
      </ul>
    </nav>
  );
}

export function TradeLandingPage({ content }: { content: TradeLandingContent }) {
  const worksiteImage = TRADE_WORKSITE_IMAGES[content.trade];

  return (
    <main className={`rb-page ${styles.page}`}>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildTradeLandingJsonLd(content)) }} />
      <CtaAnalytics />
      <ResumeBuilderHeader action={
        <BuildCta content={content} location={content.ctaLocations.header} label="Build my resume"
          className="rb-button rb-button-primary rb-header-cta" withArrow={false} />
      } />

      <div className={styles.tradeBar}>
        <span>{content.breadcrumbName} career tool</span><span>Built from the field</span>
        <a href={HUB_HREF}>View all 7 trades</a>
      </div>

      <section className={`rb-entry ${styles.hero}`}>
        <div className={styles.heroCopy}>
          <ResumeHeroTexture trade={content.trade} />
          <p className="rb-kicker">{content.hero.kicker}</p>
          <h1>{content.hero.heading} <span>{content.hero.headingAccent}</span></h1>
          <p className={styles.heroLead}>{content.hero.lead}</p>
          <div className={styles.heroActions}>
            <BuildCta content={content} location={content.ctaLocations.hero} label={content.hero.ctaLabel}
              className={`rb-button rb-button-primary ${styles.primaryCta}`} />
            <p><strong>$0 to preview</strong><span>No card required</span></p>
          </div>
          <div className={styles.proofRow} aria-label="Resume package highlights">
            {content.hero.proofStats.map((stat) => (
              <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>
            ))}
          </div>
        </div>

        <aside className={styles.heroProof} aria-labelledby="pricing-title">
          <div className={styles.workspaceFrame}>
            <Image src={worksiteImage.src} alt={worksiteImage.alt}
              width={worksiteImage.width} height={worksiteImage.height} priority />
            <span className={styles.previewBadge}>Preview before payment</span>
          </div>
          <div className={styles.priceCard}>
            <p className={styles.eyebrow}>One completed resume package</p>
            <h2 id="pricing-title">{content.pricing.heading}</h2>
            <div className="rb-package-price" aria-label="$9.99 one-time">
              <span>$</span><strong>9</strong><sup>99</sup>
            </div>
            <p>{content.pricing.subhead}</p>
            <ul><li>✓ Matching cover letter included at no extra cost</li>{content.pricing.bullets.slice(0, 3).map((bullet) => <li key={bullet}>✓ {bullet}</li>)}</ul>
            <BuildCta content={content} location={content.ctaLocations.pricing} label={content.pricing.ctaLabel}
              className="rb-button rb-button-primary rb-button-full" />
          </div>
        </aside>
      </section>

      <section className={styles.promiseStrip} aria-label="How the purchase works">
        <div><strong>01</strong><span>Build free</span><small>Guided trade intake</small></div>
        <div><strong>02</strong><span>Preview first</span><small>Check every fact</small></div>
        <div><strong>03</strong><span>Unlock once</span><small>$9.99 · no subscription</small></div>
        <div><strong>04</strong><span>Leave ready</span><small>PDF + DOCX + cover letter</small></div>
      </section>

      <section className={`${styles.section} ${styles.whiteSection}`} aria-labelledby="why-title">
        <header className={styles.sectionHeader}>
          <p className="rb-kicker">{content.valueProps.kicker}</p>
          <h2 id="why-title">{content.valueProps.heading}</h2>
          <p>Your field experience should sound as valuable on paper as it is on the jobsite.</p>
        </header>
        <div className={styles.valueGrid}>
          {content.valueProps.items.map((prop, index) => (
            <article key={prop.label} className={styles.valueCard}>
              <span>{String(index + 1).padStart(2, "0")}</span><h3>{prop.label}</h3>
              {prop.items.map((item) => <p key={item}>{item}</p>)}
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.proofSection}`} aria-labelledby="examples-title">
        <div className={styles.botPanel}>
          <div className={styles.botImage}>
            <Image src="/hustl3-bot-branded-transparent.png" alt="HUSTL3 BOT Resume Builder guide"
              width={880} height={1430} />
          </div>
          <div><p className="rb-kicker">HUSTL3 BOT FIELD GUIDANCE</p>
            <h2>TURN THE WORK YOU DID INTO PROOF.</h2><p>{content.accomplishments.intro}</p></div>
        </div>
        <div>
          <p className={styles.eyebrow}>{content.accomplishments.kicker}</p>
          <h2 id="examples-title">{content.accomplishments.heading}</h2>
          <ul className={styles.exampleList}>{content.accomplishments.examples.map((example) => <li key={example}>{example}</li>)}</ul>
          <p className={styles.disclaimer}>{content.accomplishments.disclaimer}</p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.fieldSection}`} aria-labelledby="skills-title">
        <header className={styles.sectionHeader}>
          <p className="rb-kicker">YOUR FIELD VALUE</p>
          <h2 id="skills-title">MAKE THE RIGHT {content.breadcrumbName.toUpperCase()} DETAILS EASY TO FIND.</h2>
          <p>Hiring managers scan fast. Put your strongest skills, tools, and credentials where they can see them.</p>
        </header>
        <div className={styles.fieldBlock}>
          <div className={styles.fieldBlockTitle}><span>01</span><div><p>{content.skills.kicker}</p>
            <h3>{content.skills.heading}</h3><small>{content.skills.intro}</small></div></div>
          <ChipCards groups={content.skills.groups} />
        </div>
        <div className={styles.fieldBlock}>
          <div className={styles.fieldBlockTitle}><span>02</span><div><p>{content.tools.kicker}</p>
            <h3>{content.tools.heading}</h3><small>{content.tools.intro}</small></div></div>
          <ChipCards groups={content.tools.groups} />
        </div>
        <div className={styles.fieldBlock}>
          <div className={styles.fieldBlockTitle}><span>03</span><div><p>{content.certifications.kicker}</p>
            <h3>{content.certifications.heading}</h3><small>{content.certifications.intro}</small></div></div>
          <div><ul className={styles.certList}>{content.certifications.items.map((cert) => <li key={cert}>✓ {cert}</li>)}</ul>
            <p className={styles.note}>{content.certifications.note}</p></div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.stepsSection}`} aria-labelledby="how-title">
        <header className={styles.sectionHeader}>
          <p className="rb-kicker">FROM EXPERIENCE TO DOWNLOADS</p>
          <h2 id="how-title">BUILD IT IN FOUR STRAIGHTFORWARD STEPS.</h2>
          <p>No subscription trap. You see the resume before checkout.</p>
        </header>
        <ol className={styles.steps}>{content.howItWorks.map((step, index) => (
          <li key={step.title}><span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{step.title}</h3><p>{step.body}</p></li>
        ))}</ol>
        <BuildCta content={content} location={`${content.ctaLocations.hero}_how_it_works`}
          label="Start my free preview" className={`rb-button rb-button-primary ${styles.midCta}`} />
      </section>

      <section className={`${styles.section} ${styles.fitSection}`} aria-labelledby="who-title">
        <div><p className="rb-kicker">{content.whoItIsFor.kicker}</p><h2 id="who-title">{content.whoItIsFor.heading}</h2>
          <ul className={styles.fitList}>{content.whoItIsFor.items.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div className={styles.atsCard}><p className={styles.eyebrow}>ATS + JOB KEYWORDS</p><h2>{content.ats.heading}</h2>
          {content.ats.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      </section>

      <section className={`${styles.section} ${styles.faqSection}`} aria-labelledby="faq-title">
        <header className={styles.sectionHeader}><p className="rb-kicker">{content.faq.kicker}</p>
          <h2 id="faq-title">{content.faq.heading}</h2></header>
        <div className={styles.faqList}>{content.faq.items.map((faq, index) => (
          <details key={faq.question} className={styles.faq} open={index === 0}>
            <summary>{faq.question}</summary><p>{faq.answer}</p></details>
        ))}</div>
      </section>

      <section className={`rb-package ${styles.closingSection}`} aria-labelledby="closing-title">
        <div><p className="rb-kicker">{content.closingCta.kicker}</p><h2 id="closing-title">{content.closingCta.heading}</h2>
          <p>{content.closingCta.body}</p></div>
        <div className={styles.closingCard}>
          <p><strong>$0</strong><span>Build and preview</span></p>
          <p><strong>$9.99</strong><span>Unlock once · no subscription</span></p>
          <BuildCta content={content} location={content.ctaLocations.closing} label={content.closingCta.ctaLabel}
            className="rb-button rb-button-primary rb-button-full" />
          <small>Resume, matching cover letter, PDF + DOCX downloads, and up to 3 corrections within 7 days.</small>
        </div>
      </section>

      <SiblingGuides content={content} />
      <footer className="rb-footer">
        <strong>TRADE HUSTL<span>3</span></strong><p>Built by Hustle. Backed by Trades.</p>
        <div className="rb-footer-links"><a href={HUB_HREF}>Resume Builder</a><a href="/top-10-trades">Top 10 Trades</a>
          <a href="/privacy">Privacy</a><a href="/terms">Terms</a>
          <a href="/resume-builder/refund-policy">Refunds</a><a href="/contact">Support</a></div>
      </footer>
    </main>
  );
}
