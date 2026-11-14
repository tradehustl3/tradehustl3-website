import { SocialLinks } from './footer-enhancements';
import { ResourceForm } from './resource-form';
import styles from './home-storefront.module.css';

export function HomeNewsletter() {
  return (
    <section className={`${styles.newsletter} ${styles.goldDivider}`} id="join-the-movement" aria-labelledby="movement-title">
      <span className={styles.painterMoney} aria-hidden="true">$</span>
      <span id="built-by-a-tradesman" />
      <span id="hub-mission" />
      <div className={styles.sectionHeading}>
        <p className={styles.kicker}>TRADE HUSTL3 UPDATES</p>
        <h2 id="movement-title">Join the Movement.</h2>
      </div>
      <div className={styles.split}>
        <div>
          <p className={styles.lead}>We’re building a stronger future for people who work with their hands. Keep your momentum with practical career resources, book updates, and new tools for the skilled trades.</p>
          <SocialLinks />
        </div>
        <div className={styles.form}>
          <ResourceForm resourceName="TRADE HUSTL3 updates" buttonLabel="Subscribe" conversion marketingConsent={true}
            ctaId="newsletter" ctaLocation="homepage_newsletter" metaLeadContentName="newsletter"
            signupInterest="General TRADE HUSTL3 Updates" />
          <p className={styles.finePrint}>By subscribing, you agree to receive TRADE HUSTL3 updates. Unsubscribe anytime.</p>
        </div>
      </div>
    </section>
  );
}
