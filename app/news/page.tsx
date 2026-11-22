import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "../site";
import { FIRST_ISSUE } from "./content";
import { FIRST_ISSUE_PATH } from "./constants";
import { CommunityQuestion, NewsShell } from "./news-chrome";
import styles from "./news.module.css";

export const metadata: Metadata = {
  title: "THE HUSTL3 NEWS | Enter • Earn • Elevate | TRADE HUSTL3",
  description: "Practical skilled-trades guidance, credential explainers, and next steps for your career. Read THE HUSTL3 NEWS and join the conversation.",
  alternates: { canonical: `${SITE_URL}/news` },
  openGraph: { title: "THE HUSTL3 NEWS", description: "Trade knowledge. Real next moves. Your voice.", url: `${SITE_URL}/news`, type: "website" },
};

export default function NewsArchivePage() {
  return <NewsShell>
    <section className={styles.hero} aria-labelledby="news-title">
      <p className={styles.kicker}>BUILT AROUND YOUR NEXT MOVE</p>
      <h1 id="news-title">THE HUSTL3 <span>NEWS</span></h1>
      <p className={styles.motto}>ENTER <b>•</b> EARN <b>•</b> ELEVATE</p>
      <p className={styles.lead}>A short weekly read for people building a future in the trades. Practical direction, clearer credentials, and a conversation you can be part of.</p>
      <Link className={styles.button} href="/#join-the-movement">Get the next edition by email</Link>
    </section>
    <section className={styles.archive} aria-labelledby="archive-heading">
      <p className={styles.kicker}>START READING</p>
      <h2 id="archive-heading">One useful move at a time.</h2>
      <article className={styles.issueCard}>
        <div className={styles.issueNumber}>ISSUE <strong>{FIRST_ISSUE.number}</strong></div>
        <div>
          <p className={styles.meta}>Launch edition · <time dateTime={FIRST_ISSUE.date}>{FIRST_ISSUE.dateLabel}</time></p>
          <h3><Link href={FIRST_ISSUE_PATH}>{FIRST_ISSUE.title}</Link></h3>
          <p>{FIRST_ISSUE.summary}</p>
          <Link className={styles.textLink} href={FIRST_ISSUE_PATH} data-analytics-event="select_content" data-location="news_archive" data-item="hustl3_news_001" data-destination={FIRST_ISSUE_PATH}>Read issue #001</Link>
        </div>
      </article>
    </section>
    <CommunityQuestion />
  </NewsShell>;
}
