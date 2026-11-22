import { SocialLinks } from './footer-enhancements';
import { ResourceForm } from './resource-form';
import styles from './home-storefront.module.css';
import { NEWS_INTEREST } from './news/constants';

export function HomeNewsletter() {
  return (
    <section className={`${styles.newsletter} ${styles.goldDivider}`} id="join-the-movement" aria-labelledby="movement-title">
      <span id="built-by-a-tradesman" />
      <span id="hub-mission" />
      <div className={styles.sectionHeading}>
        <p className={styles.kicker}><span>TRADE HUSTL3 UPDATES</span></p>
        <h2 id="movement-title">Join the HUSTL3.</h2>
      </div>
      <div className={styles.split}>
        <div>
          <p className={styles.lead}>Join THE HUSTL3 NEWS for a short weekly email built around Enter, Earn, and Elevate: practical trade resources, clearer credential guidance, and ideas for your next move.</p>
          <SocialLinks />
          <p><a href="/join">Explore the free community and benefits →</a></p>
          <p><a href="/news">Read THE HUSTL3 NEWS</a></p>
        </div>
        <div className={styles.form}>
          <ResourceForm resourceName="THE HUSTL3 NEWS" buttonLabel="Join the HUSTL3" conversion marketingConsent={true}
            ctaId="newsletter" ctaLocation="homepage_newsletter" metaLeadContentName="newsletter"
            signupInterest={NEWS_INTEREST} />
          <p className={styles.finePrint}>By subscribing, you agree to receive THE HUSTL3 NEWS and TRADE HUSTL3 updates. Unsubscribe anytime.</p>
        </div>
      </div>
    </section>
  );
}
