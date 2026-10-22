"use client";

import { useState, type ReactNode } from "react";
import {
  DEFAULT_HERO_TRADE,
  HERO_TRADES,
  type HeroTrade,
  heroCtaHref,
  heroCtaLabel,
  heroTradeById,
  CAMPAIGN_HEADLINES,
} from "./home-hero-trades";
import type { TradeTrack } from "./resume-builder/trade-content";
import { intakeEntryHref } from "./resume-builder/trade-preselect";
import styles from "./home-first-impression.module.css";

/**
 * Homepage hero with the trade picker.
 *
 * The server renders it complete, without JavaScript: HVAC with the CTA on the
 * plain #resume-start by default, or the trade a `?trade=` names
 * (`initialTradeId`), so nothing swaps after hydration. Picking a trade is
 * progressive enhancement.
 */
export function HomeHero({
  initialTradeId = null,
  campaignTrack = null,
  asSection = false,
  logo = null,
}: {
  initialTradeId?: string | null;
  /** A `?trade=` track with no quick-pick card: headline and CTA name that trade until a chip is picked. */
  campaignTrack?: TradeTrack | null;
  asSection?: boolean;
  /** Rendered above the eyebrow; the page passes the Resume Builder logo. Kept
      as a prop so this component stays free of next/* imports (unit-tested in Node). */
  logo?: ReactNode;
}) {
  const [chosen, setChosen] = useState<HeroTrade | null>(() => heroTradeById(initialTradeId));

  const campaign = !chosen && campaignTrack ? { track: campaignTrack, ...CAMPAIGN_HEADLINES[campaignTrack] } : null;
  const shown = chosen ?? DEFAULT_HERO_TRADE;
  const headline = campaign ?? shown;
  const ctaHref = campaign ? intakeEntryHref(campaign.track) : heroCtaHref(chosen);
  const ctaLabel = campaign ? `Build my free ${campaign.short} preview` : heroCtaLabel(shown);
  // On the hub homepage this hero sits below the brand hero, so it becomes an
  // h2 section; campaign (?trade=) visits still get it as the page's h1.
  const Heading = asSection ? "h2" : "h1";

  return (
    <section className={styles.hero} id={asSection ? "resume-hero" : "top"} aria-labelledby="hero-title">
      <div className={styles.heroCopy}>
        {logo}
        <p className={styles.eyebrow}>RESUME BUILDER FOR THE SKILLED TRADES</p>
        <Heading id="hero-title" className={styles.headline}>
          Build {headline.article} <span className={styles.headlineTrade} data-hero-trade-word>{headline.word}</span> resume that looks ready for the job.
        </Heading>
        <p className={styles.heroLead}>
          Upload your resume or answer a few questions. HUSTL3 BOT turns your real experience into a clean,
          ATS-friendly resume. See the whole thing before you pay.
        </p>

        <div className={styles.picker} id="trades" role="group" aria-labelledby="trade-picker-label">
          <p id="trade-picker-label" className={styles.pickerLabel}>What&apos;s your trade?</p>
          <div className={styles.pickerChips}>
            {HERO_TRADES.map((trade) => (
              <button
                key={trade.id}
                type="button"
                className={styles.chip}
                aria-pressed={!campaign && trade.id === shown.id}
                onClick={() => setChosen(trade)}
                data-analytics-event="select_content"
                data-location="hero_trade_picker"
                data-item={trade.id}
                data-destination={heroCtaHref(trade)}
              >
                {trade.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.heroActions}>
          {/* A plain anchor, not next/link: changing ?trade= must load the page
              so AccountStart and the intake read the new trade on mount. */}
          <a
            href={ctaHref}
            className={styles.primaryCta}
            data-analytics-event="cta_click"
            data-location="hero"
            data-destination={ctaHref}
            data-item={chosen?.id}
            data-hero-cta
          >
            {ctaLabel} <span aria-hidden="true">→</span>
          </a>
          <a href="#how" className={styles.textLink}>See how it works</a>
        </div>

        <p className={styles.priceLine}>
          <span><b>$0</b> to preview</span>
          <span aria-hidden="true" className={styles.dot}>·</span>
          <span>Just your email, no card</span>
          <span aria-hidden="true" className={styles.dot}>·</span>
          <span><b>$9.99</b> once to unlock</span>
          <span aria-hidden="true" className={styles.dot}>·</span>
          <span>No subscription</span>
        </p>
      </div>

      {campaign ? null : (
      <div className={styles.exampleWrap}>
        {/* Every trade's card is stacked in one grid cell so the slot is sized
            to the tallest card up front: switching trades never shifts layout. */}
        <div className={styles.exampleStack}>
          {HERO_TRADES.map((trade) => {
            const active = trade.id === shown.id;
            return (
              <article
                key={trade.id}
                className={styles.exampleCard}
                aria-label={`Example ${trade.title} resume`}
                aria-hidden={!active}
                inert={!active}
                data-example-trade={trade.id}
                data-active={active}
              >
                <header className={styles.exampleHead}>
                  <div>
                    <p className={styles.exampleName}>JORDAN TAYLOR</p>
                    <p className={styles.exampleTitle}>{trade.title}</p>
                  </div>
                  <span className={styles.exampleTag}>EXAMPLE</span>
                </header>
                <p className={styles.exampleLabel}>CREDENTIALS &amp; SAFETY TRAINING</p>
                <p className={styles.exampleCerts}>{trade.certs}</p>
                <p className={styles.exampleLabel}>EXPERIENCE</p>
                <ul className={styles.exampleBullets}>
                  {trade.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
                <div className={styles.exampleFiles}>
                  <span>PDF</span>
                  <span>Editable DOCX</span>
                  <span>+ Cover letter</span>
                </div>
              </article>
            );
          })}
        </div>
        <p className={styles.exampleCaption}>Fictional example. Your resume uses only the facts you enter.</p>
      </div>
      )}
    </section>
  );
}
