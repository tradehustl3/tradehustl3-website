"use client";

import { useState } from "react";
import {
  DEFAULT_HERO_TRADE,
  HERO_TRADES,
  type HeroTrade,
  heroCtaHref,
  heroCtaLabel,
  heroTradeById,
} from "./home-hero-trades";
import styles from "./home-first-impression.module.css";

/**
 * Homepage hero with the trade picker.
 *
 * The server renders it complete, without JavaScript: HVAC with the CTA on the
 * plain #resume-start by default, or the trade a `?trade=` names
 * (`initialTradeId`), so nothing swaps after hydration. Picking a trade is
 * progressive enhancement.
 */
export function HomeHero({ initialTradeId = null }: { initialTradeId?: string | null }) {
  const [chosen, setChosen] = useState<HeroTrade | null>(() => heroTradeById(initialTradeId));

  const shown = chosen ?? DEFAULT_HERO_TRADE;
  const ctaHref = heroCtaHref(chosen);

  return (
    <section className={styles.hero} id="top" aria-labelledby="hero-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>RESUME BUILDER FOR THE SKILLED TRADES</p>
        <h1 id="hero-title" className={styles.headline}>
          Build {shown.article} <span className={styles.headlineTrade} data-hero-trade-word>{shown.word}</span> resume that looks ready for the job.
        </h1>
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
                aria-pressed={trade.id === shown.id}
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
            {heroCtaLabel(shown)} <span aria-hidden="true">→</span>
          </a>
          <a href="#how" className={styles.textLink}>See how it works</a>
        </div>

        <p className={styles.priceLine}>
          <span><b>$0</b> to preview</span>
          <span aria-hidden="true" className={styles.dot}>·</span>
          <span><b>$9.99</b> once to unlock</span>
          <span aria-hidden="true" className={styles.dot}>·</span>
          <span>No subscription</span>
          <span aria-hidden="true" className={styles.dot}>·</span>
          <span>No credit card to start</span>
        </p>
      </div>

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
                <p className={styles.exampleLabel}>CERTIFICATIONS</p>
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
    </section>
  );
}
