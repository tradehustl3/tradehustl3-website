import Image from "next/image";
import Link from "next/link";
import { AMAZON_KINDLE, AMAZON_PAPERBACK } from "./book/editions";
import styles from "./home-pathway.module.css";

/**
 * Homepage section 6 — TURN SKILLS INTO OPPORTUNITY.
 *
 * The paid tools, presented after visitors have explored a trade and taken a
 * free guide. Resume copy states only what the shipped product does (see the
 * promise copy in customer-reviews.tsx); book prices come from book/editions.
 */
export function TurnSkillsIntoOpportunity() {
  return (
    <section className={`${styles.section} ${styles.dark}`} id="opportunity" aria-labelledby="opportunity-title">
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.kicker}>TURN SKILLS INTO OPPORTUNITY</p>
          <h2 id="opportunity-title" className={styles.title}>
            Ready to make your move? <span className={styles.gold}>Bring the right tools.</span>
          </h2>
          <p className={styles.lead}>Two tools built for the trades: one to show employers what you can do, one to learn the path.</p>
        </header>

        <div className={styles.offerGrid}>
          <article className={styles.offer} data-product="resume-builder" aria-labelledby="offer-resume-title">
            <div className={styles.offerArt}>
              <Image src="/optimized/resume-builder-logo-header.webp" alt="Official TRADE HUSTL3 Resume Builder badge" width={500} height={410} sizes="150px" />
            </div>
            <div className={styles.offerCopy}>
              <p className={styles.offerKicker}>SKILLED-TRADES RESUME BUILDER</p>
              <h3 id="offer-resume-title">Put your real experience on paper.</h3>
              <ul className={styles.offerList}>
                <li>Upload a resume or answer guided questions for your trade.</li>
                <li>See your full resume before you pay.</li>
                <li>Never invents a license, cert, employer, or number.</li>
                <li>Matching cover letter, PDF and editable Word files.</li>
              </ul>
              <p className={styles.offerPrice}><strong>$0</strong> to preview · <strong>$9.99</strong> once to unlock · No subscription</p>
              <div className={styles.offerActions}>
                <Link className={styles.primaryButton} href="#resume-start" data-analytics-event="cta_click" data-location="opportunity_resume" data-destination="#resume-start" data-item="resume_builder">
                  Build my free preview <span aria-hidden="true">→</span>
                </Link>
                <Link className={styles.textLink} href="/resume-examples/skilled-trades" data-analytics-event="select_content" data-location="opportunity_resume" data-destination="/resume-examples/skilled-trades" data-item="resume_example">
                  See sample resumes
                </Link>
              </div>
            </div>
          </article>

          <article className={styles.offer} data-product="the-book" aria-labelledby="offer-book-title">
            <div className={styles.offerArt}>
              <Image src="/optimized/book-cover-v3.webp" alt="Official TRADE HUSTL3 book cover" width={1024} height={1536} sizes="120px" />
            </div>
            <div className={styles.offerCopy}>
              <p className={styles.offerKicker}>THE BOOK · BY ZACHARY ELLIS</p>
              <h3 id="offer-book-title">TRADE HUSTL3: Built by Hustle, Backed by Trades</h3>
              <p className={styles.offerText}>Practical trade knowledge, career direction, and paths to more opportunity, from a working tradesman.</p>
              <p className={styles.offerPrice}>Paperback <strong>${AMAZON_PAPERBACK.price}</strong> · Kindle <strong>${AMAZON_KINDLE.price}</strong></p>
              <div className={styles.offerActions}>
                <a className={styles.primaryButton} href={AMAZON_PAPERBACK.url} target="_blank" rel="noopener noreferrer" data-analytics-event="cta_click" data-location="opportunity_book" data-destination={AMAZON_PAPERBACK.url} data-item="amazon_paperback">
                  Buy the paperback <span aria-hidden="true">↗</span>
                </a>
                <a className={styles.textLink} href={AMAZON_KINDLE.url} target="_blank" rel="noopener noreferrer" data-analytics-event="cta_click" data-location="opportunity_book_kindle" data-destination={AMAZON_KINDLE.url} data-item="amazon_kindle">
                  Kindle edition <span aria-hidden="true">↗</span>
                </a>
                <Link className={styles.textLink} href="/book" data-analytics-event="select_content" data-location="opportunity_book" data-destination="/book" data-item="book_page">
                  About the book
                </Link>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
