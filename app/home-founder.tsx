import Image from "next/image";
import Link from "next/link";
import styles from "./home-pathway.module.css";

/**
 * Homepage section 7 — BUILT BY A TRADESMAN.
 *
 * Facts match the approved author bio on /book. The founder has asked that his
 * face not appear on the homepage, so this section uses the TH3 mark only.
 * OSHA 10 is written as training, not a certification (see the Credential
 * Library's OSHA record).
 */
export const FOUNDER_QUALIFICATIONS = [
  "EPA 608 Universal certification",
  "HVAC certification",
  "NCRR",
  "OSHA 10-Hour training",
] as const;

export function BuiltByATradesman() {
  return (
    <section className={`${styles.section} ${styles.founder}`} id="built-by-a-tradesman" aria-labelledby="founder-title">
      <div className={`${styles.inner} ${styles.founderInner}`}>
        <div className={styles.founderMark}>
          <Image src="/optimized/th3-logo-header.webp" alt="TRADE HUSTL3 logo" width={248} height={160} sizes="220px" />
          <p>ENTER <span aria-hidden="true">•</span> EARN <span aria-hidden="true">•</span> ELEVATE</p>
        </div>
        <div className={styles.founderCopy}>
          <p className={styles.kicker}>BUILT BY A TRADESMAN</p>
          <h2 id="founder-title" className={styles.title}>
            Not built by a tech company. <span className={styles.gold}>Built from the field.</span>
          </h2>
          <p>
            TRADE HUSTL3 was founded by Zachary Ellis, an HVAC and facilities maintenance professional with more than a decade of hands-on experience solving real problems in the field: residential and commercial systems, preventive maintenance, facilities operations, team leadership, vendor coordination, and large-scale equipment.
          </p>
          <p>
            He built TRADE HUSTL3 to help young adults and career changers get into the skilled trades, earn more, and build long-term careers or businesses of their own.
          </p>
          <ul className={styles.founderCreds} aria-label="Zachary Ellis's credentials">
            {FOUNDER_QUALIFICATIONS.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <div className={styles.offerActions}>
            <Link className={styles.textLink} href="/book#author" data-analytics-event="select_content" data-location="built_by_a_tradesman" data-destination="/book#author" data-item="about_the_author">
              Read the full story <span aria-hidden="true">→</span>
            </Link>
            <Link className={styles.textLink} href="/contact" data-analytics-event="select_content" data-location="built_by_a_tradesman" data-destination="/contact" data-item="contact">
              Schools, programs &amp; employers: contact us <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
