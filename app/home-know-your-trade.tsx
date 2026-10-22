"use client";

import Link from "next/link";
import { useState } from "react";
import type { KnowYourTradeMyth, KnowYourTradeTrade } from "./home-know-your-trade-data";
import styles from "./home-know-your-trade.module.css";

/**
 * Homepage "Know Your Trade" section: a trade picker over the verified
 * credential library plus a true/false Jobsite Myth Check. Server-renders the
 * first trade and first myth, so it reads correctly before hydration.
 */
export function KnowYourTrade({ trades, myths }: { trades: KnowYourTradeTrade[]; myths: KnowYourTradeMyth[] }) {
  const [tradeSlug, setTradeSlug] = useState(trades[0]?.slug);
  const [mythIndex, setMythIndex] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);

  const trade = trades.find((candidate) => candidate.slug === tradeSlug) ?? trades[0];
  const myth = myths[mythIndex % myths.length];
  if (!trade || !myth) return null;

  const answered = answer !== null;
  const correct = answered && answer === myth.isTrue;
  const answerState = (value: boolean) => (!answered ? "idle" : value === myth.isTrue ? "right" : value === answer ? "wrong" : "other");

  return (
    <section className={styles.section} id="know-your-trade" aria-labelledby="know-your-trade-title">
      <div className={styles.inner}>
        <div className={styles.head}>
          <div>
            <p className={styles.kicker}>FREE RESOURCE CENTER</p>
            <h2 id="know-your-trade-title" className={styles.title}>
              Know your trade. <span>Know what you&apos;re earning.</span>
            </h2>
            <p className={styles.lead}>
              Pick your trade to see the credentials that matter — what each one is, who requires it, and the official source.
            </p>
          </div>
          <Link
            className={styles.headLink}
            href="/resources"
            data-analytics-event="cta_click"
            data-location="know_your_trade"
            data-destination="/resources"
            data-item="resource_center"
          >
            Open the Resource Center →
          </Link>
        </div>

        <div className={styles.picker} role="group" aria-label="Choose a trade">
          {trades.map((option) => (
            <button
              key={option.slug}
              type="button"
              className={styles.chip}
              aria-pressed={option.slug === trade.slug}
              onClick={() => setTradeSlug(option.slug)}
              data-analytics-event="select_content"
              data-location="know_your_trade_picker"
              data-item={option.slug}
            >
              {option.label}
            </button>
          ))}
          <Link className={styles.chipLink} href="/resources">All 14 trades</Link>
        </div>

        <div className={styles.grid}>
          <div className={styles.panel} aria-live="polite">
            <div className={styles.panelHead}>
              <h3>{trade.name}</h3>
              <span>Checked against official sources</span>
            </div>
            <ul className={styles.creds}>
              {trade.credentials.map((credential) => (
                <li key={credential.slug} className={styles.cred}>
                  <span className={styles.badges}>
                    <span className={styles.badge} data-kind={credential.kind}>{credential.kindLabel}</span>
                    <span className={`${styles.badge} ${styles.badgeReq}`}>{credential.requirementLabel}</span>
                  </span>
                  <strong>{credential.name}</strong>
                  <span className={styles.credSummary}>{credential.summary}</span>
                  <Link href={`/resources/certifications#${credential.slug}`}>Read the guide →</Link>
                </li>
              ))}
            </ul>
            <div className={styles.panelFoot}>
              <span>Already hold some of these? Put them on a resume built for your trade.</span>
              {/* A plain anchor, not next/link: changing ?trade= must load the page so
                  AccountStart and the intake read the selected trade on mount. */}
              <a
                className={styles.cta}
                href={trade.builderHref}
                data-analytics-event="cta_click"
                data-location="know_your_trade"
                data-destination={trade.builderHref}
                data-item={trade.slug}
              >
                Build my resume — free preview
              </a>
            </div>
          </div>

          <aside className={styles.myth} aria-labelledby="myth-title">
            <div className={styles.mythHead}>
              <h3 id="myth-title">Jobsite myth check</h3>
              <span>{(mythIndex % myths.length) + 1} of {myths.length}</span>
            </div>
            <p className={styles.claim}>“{myth.claim}”</p>
            <div className={styles.answers}>
              {[true, false].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  className={styles.answer}
                  data-state={answerState(value)}
                  aria-pressed={answer === value}
                  disabled={answered}
                  onClick={() => setAnswer(value)}
                  data-analytics-event="select_content"
                  data-location="myth_check"
                  data-item={`${myth.id}:${value ? "true" : "false"}`}
                >
                  {value ? "True" : "False"}
                </button>
              ))}
            </div>
            {answered ? (
              <div className={styles.result} role="status">
                <strong data-correct={correct}>{correct ? "Right" : "Not quite"} — it’s {myth.isTrue ? "true" : "false"}.</strong>
                <p>{myth.fact}</p>
                <p className={styles.source}>
                  Source: {myth.source} · <Link href={myth.href}>Full guide</Link>
                </p>
                <button
                  type="button"
                  className={styles.next}
                  onClick={() => {
                    setMythIndex((index) => index + 1);
                    setAnswer(null);
                  }}
                >
                  Next myth →
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </section>
  );
}
