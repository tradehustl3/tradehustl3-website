import Image from 'next/image';
import Link from 'next/link';
import { AMAZON_KINDLE, AMAZON_PAPERBACK } from './book/editions';
import styles from './home-storefront.module.css';

export function HomeStorefront() {
  return <section className={styles.storefront} aria-labelledby="storefront-heading" id="top">
    <div className={styles.intro}>
      <p className={styles.eyebrow}>TRADE HUSTL3 • CAREER TOOLS & KNOWLEDGE</p>
      <h1 id="storefront-heading" className={styles.heading}>Build your career. Own your future.</h1>
      <p className={styles.lead}>Two ways to invest in your skilled-trades future.</p>
    </div>
    <div className={styles.offers}>
      <article className={styles.offer}>
        <Image className={styles.image} src="/optimized/resume-builder-logo-header.webp" width={500} height={410} alt="TRADE HUSTL3 Resume Builder badge" priority />
        <div className={styles.content}>
          <h2 className={styles.title}>Skilled-Trades Resume Builder</h2>
          <p className={styles.description}>ATS-friendly resume and matching cover letter. Preview before you pay.</p>
          <p className={styles.price}>Free preview • $9.99 to unlock</p>
          <Link className={styles.button} href="#resume-start" data-analytics-event="cta_click" data-location="homepage_storefront_resume" data-destination="#resume-start" data-item="resume_builder">Build My Free Preview</Link>
        </div>
      </article>
      <article className={styles.offer}>
        <Image className={styles.image} src="/optimized/book-cover-v3.webp" width={360} height={540} alt="TRADE HUSTL3 book cover" priority />
        <div className={styles.content}>
          <h2 className={styles.title}>TRADE HUSTL3 — The Book</h2>
          <p className={styles.description}>Practical knowledge for exploring trades, building skills and creating opportunities.</p>
          <p className={styles.price}>Kindle ${AMAZON_KINDLE.price} • Paperback ${AMAZON_PAPERBACK.price}</p>
          <a className={styles.button} href={AMAZON_PAPERBACK.url} target="_blank" rel="noopener noreferrer" data-analytics-event="cta_click" data-location="homepage_storefront_book" data-destination={AMAZON_PAPERBACK.url} data-item="amazon_paperback">Buy on Amazon</a>
          <a className={styles.secondary} href={AMAZON_KINDLE.url} target="_blank" rel="noopener noreferrer" data-analytics-event="cta_click" data-location="homepage_storefront_book_kindle" data-destination={AMAZON_KINDLE.url} data-item="amazon_kindle">Shop Kindle edition</a>
        </div>
      </article>
    </div>
    <p className={styles.mission}>Built for the people who build, maintain, repair, and move America.</p>
  </section>;
}
