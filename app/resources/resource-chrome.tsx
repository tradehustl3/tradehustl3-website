import Link from "next/link";
import styles from "./resources.module.css";
import { BrandLockup } from "../brand-lockup";

type Current = "resources" | "certifications";

/** Header shared by the Resource Center pages. */
export function ResourceHeader({ current }: { current: Current }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.brand} href="/" aria-label="TRADE HUSTL3 home">
          <BrandLockup />
        </Link>
        <nav className={styles.nav} aria-label="Resource Center navigation">
          <Link className={styles.navLink} href="/resources" aria-current={current === "resources" ? "page" : undefined}>Resource Center</Link>
          <Link className={styles.navLink} href="/resume-examples">Explore Trades</Link>
          <Link className={styles.navLink} href="/resources/certifications" aria-current={current === "certifications" ? "page" : undefined}>Certifications &amp; Licenses</Link>
          <Link className={styles.navLink} href="/book">The Book</Link>
          <Link
            className={styles.navCta}
            href="/#resume-start"
            data-analytics-event="cta_click"
            data-location={`${current}_header`}
            data-destination="/#resume-start"
            data-item="resume_builder"
          >
            Resume Builder
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** Footer shared by the Resource Center pages. */
export function ResourceFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <p>
          <span className={styles.footerTag}>BUILT BY HUSTLE. BACKED BY TRADES.</span>
          <br />
          Guides cite official sources and show when they were last checked. Partners and sponsors never edit guide content.
          <br />
          TRADE HUSTL3 LLC · Atlanta, Georgia · <a href="mailto:support@tradehustl3.com">support@tradehustl3.com</a>
        </p>
        <nav aria-label="Footer links">
          <Link href="/">Home</Link>
          <Link href="/resources">Resource Center</Link>
          <Link href="/resources/certifications">Certifications &amp; Licenses</Link>
          <Link href="/resume-examples">Trade Career Catalog</Link>
          <Link href="/#resume-start">Resume Builder</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Support</Link>
        </nav>
      </div>
    </footer>
  );
}
