import Image from "next/image";
import Link from "next/link";
import { findYourLaneCards } from "./home-find-your-lane-data";
import { CATALOG_METRICS } from "./resume-examples/catalog-metrics";
import { ToolSilhouette } from "./tool-silhouettes";
import styles from "./home-pathway.module.css";

/**
 * Homepage section 3 — FIND YOUR LANE. Explore the trades.
 *
 * Server-rendered, no client JavaScript. Each card answers what the worker
 * does, how people get started, and which credentials apply, with the BLS page
 * it restates. `id="trade-guides"` is kept because every trade landing page
 * links back to /#trade-guides.
 */
export function FindYourLane() {
  const cards = findYourLaneCards();

  return (
    <section className={`${styles.section} ${styles.dark}`} id="trade-guides" aria-labelledby="find-your-lane-title">
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.kicker}>TRADE HUSTL3 <span aria-hidden="true">·</span> EXPLORE YOUR FUTURE</p>
          <h2 id="find-your-lane-title" className={styles.title}>
            Find your lane. <span className={styles.gold}>Explore the trades.</span>
          </h2>
          <p className={styles.subhead}>Every skill starts somewhere.</p>
          <p className={styles.lead}>
            You don&apos;t need to have it all figured out. Discover the trades, understand the work, and find a path that fits you.
          </p>
        </header>

        {/* A grid on wider screens; a swipeable row on phones so eight full cards
            don't turn into one very long scroll. Tabbing to a card's links scrolls
            it into view, so keyboard users reach every card. */}
        <ul className={styles.laneGrid} aria-label="Trade careers">
          {cards.map((card) => (
            <li key={card.id} className={styles.lane} data-lane={card.id}>
              <div className={styles.lanePhoto}>
                <Image
                  src={card.image.src}
                  alt={card.image.alt}
                  fill
                  sizes="(max-width: 640px) 92vw, (max-width: 1100px) 46vw, 300px"
                />
                <span className={styles.laneIcon} aria-hidden="true">
                  <ToolSilhouette name={card.tool} size={30} />
                </span>
              </div>
              <div className={styles.laneBody}>
                <h3 className={styles.laneTitle}>{card.title}</h3>
                <p className={styles.laneTagline}>{card.tagline}</p>
                <dl className={styles.laneFacts}>
                  <div>
                    <dt>The work</dt>
                    <dd>{card.work}</dd>
                  </div>
                  <div>
                    <dt>How to start</dt>
                    <dd>{card.start}</dd>
                  </div>
                  <div>
                    <dt>Credentials to know</dt>
                    <dd>
                      <ul className={styles.laneCreds}>
                        {card.credentials.map((credential) => (
                          <li key={credential.slug}>
                            <Link
                              href={credential.href}
                              data-analytics-event="select_content"
                              data-location="find_your_lane_credential"
                              data-destination={credential.href}
                              data-item={credential.slug}
                            >
                              {credential.name}
                            </Link>
                            <small>{credential.requirementLabel}</small>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                </dl>
                <p className={styles.laneSource}>
                  Source: <a href={card.source.url} rel="noopener">{card.source.label}</a>
                </p>
                <div className={styles.laneActions}>
                  <Link
                    className={styles.laneExplore}
                    href={card.exploreHref}
                    aria-label={`Explore ${card.title}: paths and credentials`}
                    data-analytics-event="select_content"
                    data-location="find_your_lane"
                    data-destination={card.exploreHref}
                    data-item={card.id}
                  >
                    Explore the trade <span aria-hidden="true">→</span>
                  </Link>
                  <Link
                    className={styles.laneSecondary}
                    href={card.tradePageHref}
                    aria-label={`${card.title} resume guide`}
                    data-analytics-event="select_content"
                    data-location="find_your_lane_trade_page"
                    data-destination={card.tradePageHref}
                    data-item={card.id}
                  >
                    Resume guide
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className={styles.laneFooter}>
          <Link
            className={styles.primaryButton}
            href="/resume-examples"
            data-analytics-event="cta_click"
            data-location="find_your_lane"
            data-destination="/resume-examples"
            data-item="explore_all_trades"
          >
            Explore all {CATALOG_METRICS.careerFamilies} trades <span aria-hidden="true">→</span>
          </Link>
          <p>
            New to the trades?{" "}
            <Link
              href="/resources"
              data-analytics-event="cta_click"
              data-location="find_your_lane"
              data-destination="/resources"
              data-item="resource_center"
            >
              Start with our free career resources <span aria-hidden="true">→</span>
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
