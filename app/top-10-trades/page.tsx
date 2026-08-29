import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "../lead-magnet.css";
import { CtaAnalytics } from "../cta-analytics";
import { ResourceForm } from "../resource-form";
import { SITE_NAME } from "../site";
import { SUPPORT_EMAIL } from "../../shared/customer-config";
import { ViewContentTracker } from "../view-content-tracker";

const TITLE = "Free Top 10 Trades Guide (2026–2027) | TRADE HUSTL3";
const DESCRIPTION =
  "Get the free TRADE HUSTL3 guide to 10 high-opportunity skilled trades for 2026–2027 — verified profiles, national pay context, and the practical next step for each one.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/top-10-trades" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/top-10-trades",
    siteName: SITE_NAME,
    type: "website",
    images: [
      { url: "/top-trades-2026-2027-card.png", width: 1200, height: 630, alt: "TRADE HUSTL3 Top 10 Trades for 2026–2027" },
    ],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/top-trades-2026-2027-card.png"] },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TopTenTradesPage({ searchParams }: { searchParams: SearchParams }) {
  // Cold ad/social traffic lands with no token and sees the email-capture form
  // (fires Meta `Lead` on a confirmed signup). Traffic from the Brevo delivery
  // email carries `?token=`, which shows the download state and fires
  // `ViewContent` (content_name=top_10_trades) as the "guide viewed" funnel step.
  // The token is a display hint only — /api/free-sample re-verifies it.
  const resolved = await searchParams;
  const token = typeof resolved.token === "string" ? resolved.token : "";

  return (
    <main className="lead-magnet-page">
      <CtaAnalytics />

      <header className="lm-header">
        <Link className="lm-brand" href="/" aria-label="TRADE HUSTL3 home">
          TRADE HUSTL<span>3</span>
        </Link>
        <nav aria-label="Primary">
          <Link href="/resume-builder">Resume Builder</Link>
          <Link href="/book">The Book</Link>
        </nav>
      </header>

      <div className="lm-main">
        <section className="lm-hero">
          <p className="section-label">/ Free career guide</p>
          <h1>Top 10 Trades<br /><span>for 2026–2027.</span></h1>
          <p className="lm-lede">
            Ten skilled-trade careers with strong entry points and room to grow — each with a verified profile,
            national pay context, and a practical first move. Enter your email and it is yours.
          </p>
        </section>

        <section className="lm-panel" aria-label="Get the free Top 10 Trades guide">
          <div className="lm-panel-media">
            <Image
              src="/top-trades-2026-2027-card.png"
              alt="TRADE HUSTL3 Top 10 Trades for 2026–2027 guide"
              width={520}
              height={520}
            />
          </div>
          <div className="lm-panel-body">
            {token ? (
              <div className="lm-unlocked">
                <ViewContentTracker contentName="top_10_trades" />
                <p className="section-label">/ Your free guide is ready</p>
                <h2>10 high-opportunity trades<br /><span>2026–2027.</span></h2>
                <p className="lm-unlocked-copy">
                  Verified profiles, national pay context, and the practical next step for each trade. A copy
                  is also in your inbox.
                </p>
                <a
                  className="lm-download"
                  href={`/api/free-sample?token=${encodeURIComponent(token)}`}
                  target="_blank"
                  rel="noreferrer"
                  data-cta="guide-download"
                  data-cta-location="top-10-trades"
                >
                  Download / read the free guide <span aria-hidden="true">↗</span>
                </a>
                <div className="lm-cta-band">
                  <p>Found a trade that fits you? Now build the resume to go after it.</p>
                  <a
                    className="lm-cta-button"
                    href="/resume-builder"
                    data-cta="resume-builder"
                    data-cta-location="top-10-trades"
                  >
                    Build my trade resume <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="lm-locked">
                <p className="section-label">/ Instant access</p>
                <h2>Get the free guide.</h2>
                <p className="lm-locked-copy">
                  No spam — practical skilled-trades guidance and TRADE HUSTL3 updates. Unsubscribe anytime.
                </p>
                <ResourceForm
                  resourceName="Top 10 Trades guide"
                  buttonLabel="VIEW MY FREE TOP 10 TRADES GUIDE"
                  includeInterest
                  includeFirstName={false}
                  ctaId="top-10-trades"
                  ctaLocation="top-10-trades-page"
                  metaLeadContentName="top_10_trades"
                  nextStepHref="/resume-builder"
                  nextStepLabel="Turn your target trade into a job-ready resume"
                />
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="lm-footer">
        <div>
          <strong>TRADE HUSTL3 LLC</strong>
          <p>Built by Hustle. Backed by Trades.</p>
        </div>
        <nav aria-label="Footer">
          <Link href="/resume-builder">Resume Builder</Link>
          <Link href="/book">The Book</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </nav>
      </footer>
    </main>
  );
}
