import Image from 'next/image';
import { HomeBookPreview } from './home-book-preview';
import styles from './home-storefront.module.css';

export function HomeStorefront() {
  return (
    <section className={styles.storefront} id="top" aria-labelledby="storefront-heading">
      <div className={styles.hero}>
        <div className={`${styles.heroCopy} ${styles.bookCopy}`}>
          <p className={`${styles.kicker} ${styles.bookEyebrow}`}>THE BOOK</p>
          <h1 className={styles.bookTitle} id="storefront-heading">TRADE HUSTL3</h1>
          <p className={styles.bookAuthor}>BY MR. HUSTL3</p>
          <h2 className={styles.bookMessage}>A Story From the Trades. A Message for the Next Generation.</h2>
          <p className={styles.slogan}>BUILT BY HUSTL3. BACKED BY TRADES.</p>
          <HomeBookPreview />
        </div>
        <div className={styles.coverFrame}>
          <Image className={styles.cover} src="/optimized/book-cover-v3.webp" width={1024} height={1536}
            sizes="(max-width: 720px) 48vw, 340px" alt="Official cover of TRADE HUSTL3: Built by Hustle, Backed by Trades" priority />
        </div>
      </div>
    </section>
  );
}

