import Image from "next/image";
import Link from "next/link";
import styles from "./home-pathway.module.css";
import hub from "./home-storefront.module.css";

export const FOUNDER_QUALIFICATIONS = [
  "EPA 608 Universal certification",
  "HVAC certification",
  "NCRR",
  "OSHA 10-Hour training",
] as const;

export function BuiltByATradesman() {
  return (
    <section className={`${styles.section} ${styles.founder} ${hub.founder}`} id="built-by-a-tradesman" aria-labelledby="founder-title">
      <div className={`${styles.inner} ${styles.founderInner}`}>
        <div className={styles.founderMark}>
          <Image className={hub.portrait} src="/optimized/author-portrait-v2.webp" alt="Zachary Ellis, founder of TRADE HUSTL3" width={800} height={800} sizes="(max-width: 720px) 72vw, 380px" />
          <p>ENTER <span aria-hidden="true">•</span> EARN <span aria-hidden="true">•</span> ELEVATE</p>
        </div>
        <div className={styles.founderCopy} id="hub-mission">
          <p className={styles.kicker}>BUILT BY A TRADESMAN</p>
          <h2 id="founder-title" className={styles.title}>
            Built by a tradesman. <span className={styles.gold}>Built from the field.</span>
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
            <Link className={styles.textLink} href="/book#schools" data-analytics-event="select_content" data-location="built_by_a_tradesman" data-destination="/book#schools" data-item="contact">
              Schools, programs &amp; employers: contact us <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
