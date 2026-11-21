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

/** Responsive industrial footer shared by Resource Center pages. */
export function ResourceFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Link href="/" className={styles.footerLogo}>TRADE HUSTL<span>3</span></Link>
          <div className={styles.footerMotto}>ENTER <b>•</b> EARN <b>•</b> ELEVATE</div>
          <p className={styles.footerTag}>BUILT BY HUSTL3. BACKED BY TRADE.</p>
          <p className={styles.footerIntro}>Real trades. Real credentials. Real opportunities.</p>
        </div>
        <div className={styles.footerSectionTitle}>EXPLORE RESOURCES</div>
        <nav className={styles.footerResources} aria-label="Footer resources">
          <Link href="/resources/certifications"><span aria-hidden="true">▣</span>Certifications</Link>
          <Link href="/book"><span aria-hidden="true">▤</span>The Book</Link>
          <Link href="/resume-examples"><span aria-hidden="true">⚒</span>Career Paths</Link>
          <Link href="/#resume-start"><span aria-hidden="true">▦</span>Resume Builder</Link>
        </nav>
        <div className={styles.footerMovement}>JOIN THE MOVEMENT</div>
        <p className={styles.footerContact}>Have a question? <a href="mailto:support@tradehustl3.com">Email TRADE HUSTL3</a></p>
        <div className={styles.footerDisclosure}>
          <span aria-hidden="true">✓</span>
          <p>Our guides cite official sources and show when they were last checked. Partners and sponsors never edit guide content.</p>
        </div>
        <nav className={styles.footerLegal} aria-label="Footer legal and support">
          <Link href="/resources">Resource Center</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Support</Link>
        </nav>
        <p className={styles.footerCopyright}>© {new Date().getFullYear()} TRADE HUSTL3 LLC · Atlanta, Georgia</p>
      </div>
    </footer>
  );
}
