import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLockup } from "../brand-lockup";
import { CtaAnalytics } from "../cta-analytics";
import { homeBodyFont, homeDisplayFont } from "../home-fonts";
import { ResourceFooter } from "../resources/resource-chrome";
import { COMMUNITY_QUESTION, COMMUNITY_REPLY_HREF } from "./constants";
import styles from "./news.module.css";

export function NewsShell({ children }: { children: ReactNode }) {
  return <main className={`${styles.page} ${homeBodyFont.variable} ${homeDisplayFont.variable}`}>
    <CtaAnalytics />
    <header className={styles.header}>
      <Link href="/" aria-label="TRADE HUSTL3 home"><BrandLockup size="lg" appearance="transparent" /></Link>
      <nav aria-label="HUSTL3 NEWS navigation">
        <Link href="/news">News archive</Link>
        <Link href="/resources">Resources</Link>
        <Link href="/join">Join the HUSTL3</Link>
      </nav>
    </header>
    {children}
    <ResourceFooter joinHref="/#join-the-movement" ctaLocation="news_footer" />
  </main>;
}

export function CommunityQuestion() {
  return <section className={styles.community} aria-labelledby="community-question">
    <p className={styles.kicker}>YOUR VOICE BELONGS HERE</p>
    <h2 id="community-question">{COMMUNITY_QUESTION}</h2>
    <p>Tell us your trade, your next goal, and the question you want answered. Your replies help shape future editions. We&apos;ll ask before publishing your name or story.</p>
    <a className={styles.button} href={COMMUNITY_REPLY_HREF} data-analytics-event="cta_click" data-location="news_community_question" data-item="news_reply" data-destination="email">Share your next move</a>
  </section>;
}
