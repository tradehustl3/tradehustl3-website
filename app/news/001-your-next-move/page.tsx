import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "../../site";
import { FIRST_ISSUE } from "../content";
import { FIRST_ISSUE_PATH } from "../constants";
import { CommunityQuestion, NewsShell } from "../news-chrome";
import styles from "../news.module.css";

export const metadata: Metadata = {
  title: "Your Next Move Starts Here | HUSTL3 NEWS #001 | TRADE HUSTL3",
  description: FIRST_ISSUE.summary,
  alternates: { canonical: `${SITE_URL}${FIRST_ISSUE_PATH}` },
  openGraph: { title: "HUSTL3 NEWS #001: Your next move starts here", description: FIRST_ISSUE.summary, url: `${SITE_URL}${FIRST_ISSUE_PATH}`, type: "article" },
};

export default function FirstNewsIssuePage() {
  return <NewsShell>
    <section className={styles.hero} aria-labelledby="issue-title">
      <Link className={styles.backLink} href="/news">THE HUSTL3 NEWS</Link>
      <p className={styles.kicker}>ISSUE {FIRST_ISSUE.number} · LAUNCH EDITION</p>
      <h1 id="issue-title">Your next move <span>starts here.</span></h1>
      <p className={styles.lead}>{FIRST_ISSUE.summary}</p>
      <p className={styles.heroMeta}><time dateTime={FIRST_ISSUE.date}>{FIRST_ISSUE.dateLabel}</time> · From TRADE HUSTL3</p>
    </section>
    <article className={styles.article} aria-label="HUSTL3 NEWS issue 001">
      <p className={styles.introduction}>{FIRST_ISSUE.introduction}</p>
      {FIRST_ISSUE.sections.map(section => <section className={styles.articleSection} key={section.label} aria-labelledby={`issue-${section.label.toLowerCase()}`}>
        <p className={styles.sectionLabel}>{section.label}</p>
        <h2 id={`issue-${section.label.toLowerCase()}`}>{section.title}</h2>
        {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        <p className={styles.action}>{section.action}</p>
        <Link className={styles.textLink} href={section.link.href} data-analytics-event="cta_click" data-location={`news_001_${section.label.toLowerCase()}`} data-item="news_resource" data-destination={section.link.href}>{section.link.label}</Link>
      </section>)}
      <section className={styles.credential} aria-labelledby="credential-spotlight">
        <p className={styles.kicker}>CREDENTIAL CHECK</p>
        <h2 id="credential-spotlight">{FIRST_ISSUE.credential.title}</h2>
        <p>{FIRST_ISSUE.credential.body}</p>
        <p className={styles.source}>Source: <a href={FIRST_ISSUE.credential.sourceUrl} target="_blank" rel="noopener noreferrer">{FIRST_ISSUE.credential.sourceLabel}</a>. Checked {FIRST_ISSUE.credential.checkedOn}.</p>
        <Link className={styles.textLink} href="/resources/certifications#osha-outreach-10-30">Explore the credential guide</Link>
      </section>
      <p className={styles.closing}>You don&apos;t have to finish the whole journey this week. Start with a move you can stand behind.</p>
    </article>
    <CommunityQuestion />
    <section className={styles.subscribe} aria-labelledby="next-edition">
      <h2 id="next-edition">Keep your next move in sight.</h2>
      <p>Join THE HUSTL3 NEWS for the next weekly edition. Free to join. Unsubscribe anytime.</p>
      <Link className={styles.button} href="/#join-the-movement">Join the HUSTL3</Link>
    </section>
  </NewsShell>;
}
