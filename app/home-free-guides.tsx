import Image from 'next/image';
import Link from 'next/link';
import { ResourceForm } from './resource-form';
import styles from './home-storefront.module.css';

export function FreeGuides() {
  return (
    <section className={styles.guide} id="free-guides" aria-labelledby="free-guides-title">
      <div className={styles.split}>
        <Image className={styles.guideCover} src="/optimized/top-trades-guide-v1.webp" alt="Cover of the Top 10 Trades 2026–2027 guide"
          width={1122} height={1402} sizes="(max-width: 720px) 52vw, 290px" />
        <div>
          <p className={styles.kicker}>FREE KNOWLEDGE · PLAN YOUR NEXT YEAR</p>
          <h2 id="free-guides-title">2027 Is Coming. <span>What&apos;s Your Next Trade Move?</span></h2>
          <p className={styles.lead}>Whether you’re entering the workforce, considering a career change, or looking for a new opportunity, start by exploring the skilled trades and the opportunities they offer.</p>
          <p><strong>Top 10 Trades 2026–2027:</strong> This six-page preview features two profiles, power-line work and HVAC, plus national pay context and practical next steps.</p>
          <div className={styles.form}>
            <ResourceForm resourceName="Top 10 Trades guide preview" buttonLabel="Get Your FREE Trades Guide Preview" conversion marketingConsent={false}
              ctaId="top-10-trades" ctaLocation="homepage_top_10_guide" metaLeadContentName="top_10_trades"
              successLinkLabel="Open the guide PDF" />
            <p className={styles.finePrint}>Access the six-page preview after successful submission. We’ll also send the link by email. This request delivers the resource only. Use Join the Movement below for optional marketing updates.</p>
          </div>
          <Link className={styles.textLink} href="/resources" data-analytics-event="cta_click" data-location="homepage_top_10_guide" data-item="top_10_trades">Explore the complete Resource Center <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </section>
  );
}
