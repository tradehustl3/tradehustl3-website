import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BrandLockup } from './brand-lockup';
import { CtaAnalytics } from './cta-analytics';
import { CustomerReviews } from './customer-reviews';
import { homeBodyFont, homeDisplayFont } from './home-fonts';
import { HomeStorefront } from './home-storefront';
import { HomeNavigation } from './home-navigation';
import { HubHero, HubOutlook } from './home-hub';
import { HubStages } from './home-hub-stages';
import { FindYourLane } from './home-find-your-lane';
import { FirstSteps } from './home-first-steps';
import { FreeGuides } from './home-free-guides';
import { TurnSkillsIntoOpportunity } from './home-opportunity';
import { BuiltByATradesman } from './home-founder';
import { ResumeStartSection } from './home-resume-start';
import { ResumeFirstBody, ResumeFirstTop } from './home-resume-first';
import { ToolRail } from './tool-silhouettes';
import { KnowYourTrade } from './home-know-your-trade';
import { knowYourTradeMyths, knowYourTradeTrades } from './home-know-your-trade-data';
import { heroTradeFromParam } from './home-hero-trades';
import { resolveTradeParam } from './resume-builder/trade-preselect';
import { ResumeBuilderStartAnalytics } from './resume-builder/funnel-analytics';
import './resume-builder/rb-foundation.css';
import styles from './home-traffic-director.module.css';
import fi from './home-first-impression.module.css';
import { HOME_DESCRIPTION, HOME_TITLE, HUB_OG_IMAGE, SITE_NAME } from './site';


export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: '/',
    siteName: SITE_NAME,
    locale: 'en_US',
    type: 'website',
    images: [{ url: HUB_OG_IMAGE, type: "image/jpeg", width: 1200, height: 630, alt: 'TRADE HUSTL3 — skilled-trades career and resource hub' }],
  },
  twitter: { card: 'summary_large_image', title: HOME_TITLE, description: HOME_DESCRIPTION, images: [HUB_OG_IMAGE] },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Hub homepage order (approved Nov 9, 2026):
 *   1. Storefront — who TRADE HUSTL3 is and what it offers
 *   2. Story — the mission: ENTER • EARN • ELEVATE
 *   3. Where are you in your trade? — where each visitor can start
 *   4. Find Your Lane — discover trade careers
 *   5. Your First Steps — training, apprenticeships, credentials, free resources
 *   6. Free TRADE HUSTL3 Guides — Top 10 Trades and the 7-page book sample
 *   7. Turn Skills Into Opportunity — Resume Builder and the book, the purchase
 *      promises, then the #resume-start account entry
 *   8. Built by a Tradesman
 * Help first, free value second, paid tools once the value is clear.
 */
function HubHome() {
  return (
    <>
      <HomeStorefront />
      <HubHero />
      <ToolRail />
      <HubStages />
      <FindYourLane />
      <HubOutlook />
      <FirstSteps />
      <KnowYourTrade trades={knowYourTradeTrades()} myths={knowYourTradeMyths()} />
      <FreeGuides />
      <TurnSkillsIntoOpportunity />
      <CustomerReviews />
      <ResumeStartSection />
      <BuiltByATradesman />
    </>
  );
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  // Render a ?trade= from a trade landing page or campaign on the server, so the
  // hero never swaps its headline after hydration (and works without JavaScript).
  const { trade } = await searchParams;
  const tradeParam = typeof trade === 'string' ? trade : null;
  const initialTrade = heroTradeFromParam(tradeParam);
  // Campaign and trade-landing visits (?trade= for any of the 14 builder tracks)
  // keep the resume-first layout; everyone else gets the hub homepage.
  const campaignTrack = resolveTradeParam(tradeParam);
  const isCampaignVisit = campaignTrack !== null;

  return (
    <main className={styles.page}>
      <CtaAnalytics />
      {/* Campaign visits land on the builder itself; hub visits count only once the start section is on screen. */}
      <ResumeBuilderStartAnalytics trigger={isCampaignVisit ? 'mount' : 'visible'} />
      <div className={`${fi.top} ${homeDisplayFont.variable} ${homeBodyFont.variable}`}>
        <header className={fi.header}>
          <div className={fi.headerInner}>
            <Link className={fi.brand} href="#top" aria-label="TRADE HUSTL3 home">
              <BrandLockup />
            </Link>
            <HomeNavigation />
          </div>
        </header>

        {isCampaignVisit ? (
          <ResumeFirstTop initialTradeId={initialTrade?.id ?? null} campaignTrack={initialTrade ? null : campaignTrack} />
        ) : (
          <HubHome />
        )}
      </div>

      {isCampaignVisit ? <ResumeFirstBody /> : null}

      <footer className={styles.footer} data-site-footer>
        <div className={styles.footerBrand}><Image className={styles.footerMark} src="/optimized/th3-logo-header.webp" alt="TRADE HUSTL3 logo" width={248} height={160} /><strong>TRADE HUSTL3 LLC</strong></div>
        <p>BUILT BY HUSTL3. BACKED BY TRADES.<br />TRADE HUSTL3 LLC · Atlanta, Georgia · <a href="mailto:support@tradehustl3.com">support@tradehustl3.com</a></p>
        <nav aria-label="Footer links">
          <Link href="#resume-start">Resume Builder</Link>
          <Link href="/resources">Resource Center</Link>
          <Link href="/resume-examples">Trade Career Catalog</Link>
          {/* Server-rendered links to pages that the client-side stage picker
              only shows after a click, so crawlers can always reach them. */}
          <Link href="/resume-examples/skilled-trades">Trade Resume Examples</Link>
          <Link href="/resume-examples/maintenance-resume-tips">Maintenance Resume Tips</Link>
          <Link href="/top-10-trades">Top 10 Trades</Link>
          <Link href="/book">The Book</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Support</Link>
        </nav>
      </footer>

      <Link href="#resume-start" className={styles.mobileStickyCta} data-analytics-event="cta_click" data-location="mobile_sticky" data-destination="#resume-start">Build Free Preview <span aria-hidden="true">→</span></Link>
    </main>
  );
}
