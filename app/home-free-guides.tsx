import Image from "next/image";
import Link from "next/link";
import { ResourceForm } from "./resource-form";
import styles from "./home-pathway.module.css";

/**
 * Homepage section 5 — FREE TRADE HUSTL3 GUIDES.
 *
 * The same signup the /top-10-trades and /book/sample pages use (Brevo double
 * opt-in through /api/subscribe), with the same interests, so each signup lands
 * in the same list and welcome series. Only the CTA location differs.
 */
export function FreeGuides() {
  return (
    <section className={`${styles.section} ${styles.cream}`} id="free-guides" aria-labelledby="free-guides-title">
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.kicker}>FREE TRADE HUSTL3 GUIDES</p>
          <h2 id="free-guides-title" className={styles.title}>
            Take it with you. <span className={styles.red}>Free.</span>
          </h2>
          <p className={styles.lead}>No purchase required. Enter your email and we&apos;ll send it to your inbox.</p>
        </header>

        <div className={styles.guideGrid}>
          <article className={styles.guide} aria-labelledby="guide-top10-title">
            <div className={styles.guideArt}>
              <Image src="/optimized/top-trades-guide-v1.webp" alt="Cover of the free TRADE HUSTL3 Top 10 Trades guide" width={1122} height={1402} sizes="140px" />
            </div>
            <div className={styles.guideCopy}>
              <p className={styles.guideKicker}>FREE GUIDE · 7 PAGES</p>
              <h3 id="guide-top10-title">Top 10 Trades for 2026–2027</h3>
              <p>Compare skilled-trade paths, opportunity, and practical next steps before you choose a direction.</p>
              <ResourceForm
                resourceName="Top 10 Trades 2026–2027 guide"
                buttonLabel="Email me the free guide"
                includeFirstName={false}
                ctaId="top-10-trades"
                ctaLocation="homepage_free_guides"
                metaLeadContentName="top_10_trades"
              />
              <p className={styles.consent}>
                By requesting the guide, you agree to receive TRADE HUSTL3 career and product updates. Unsubscribe anytime.{" "}
                <Link href="/top-10-trades">About the guide</Link>
              </p>
            </div>
          </article>

          <article className={styles.guide} aria-labelledby="guide-sample-title">
            <div className={styles.guideArt}>
              <Image src="/optimized/book-cover-v3.webp" alt="Official TRADE HUSTL3 book cover" width={1024} height={1536} sizes="120px" />
            </div>
            <div className={styles.guideCopy}>
              <p className={styles.guideKicker}>FREE 7-PAGE SAMPLE · THE BOOK</p>
              <h3 id="guide-sample-title">Read the first 7 pages of TRADE HUSTL3</h3>
              <p>The cover, opening pages, table of contents, and the beginning of Chapter 1.</p>
              <ResourceForm
                resourceName="free 7-page TRADE HUSTL3 book sample"
                buttonLabel="Email me the 7-page sample"
                includeFirstName={false}
                ctaId="book-sample"
                ctaLocation="homepage_free_guides"
                metaLeadContentName="book_sample"
                signupInterest="Book 7-Page Sample"
                successLinkLabel="Download my 7-page sample (PDF)"
              />
              <p className={styles.consent}>
                By requesting the sample, you agree to receive TRADE HUSTL3 book and career updates. Unsubscribe anytime.{" "}
                <Link href="/book/sample">About the sample</Link>
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
