import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SignupForm } from "../../signup-form";
import { SocialLinks } from "../../social-links";
import { SITE_NAME } from "../../site";

const GUIDE_DESCRIPTION =
  "Get the free TRADE HUSTL3 Top Ten Trades 2026-2027 guide preview with source-backed career profiles, national pay context, entry paths, and practical next steps.";

export const metadata: Metadata = {
  title: "Top Ten Skilled Trades 2026-2027 | Free TRADE HUSTL3 Guide",
  description: GUIDE_DESCRIPTION,
  alternates: { canonical: "/guides/top-10-trades-2026-2027" },
  openGraph: {
    title: "Top Ten Skilled Trades 2026-2027 | Free TRADE HUSTL3 Guide",
    description: GUIDE_DESCRIPTION,
    url: "/guides/top-10-trades-2026-2027",
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "TRADE HUSTL3 skilled-trades career resources" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Top Ten Skilled Trades 2026-2027 | Free TRADE HUSTL3 Guide",
    description: GUIDE_DESCRIPTION,
    images: ["/og.png"],
  },
};

const guideBenefits = [
  "Source-backed skilled-trade career profiles",
  "National pay context and opportunity indicators",
  "Training and entry-path information",
  "Practical next steps for choosing a direction",
];

export default function TopTenTradesGuidePage() {
  return (
    <main className="book-page">
      <header className="site-header book-site-header">
        <Link className="brand-link" href="/" aria-label="TRADE HUSTL3 home">
          <Image className="header-logo" src="/trade-hustl3-logo.png" alt="TRADE HUSTL3 logo" width={68} height={68} priority />
          <span className="wordmark">TRADE HUSTL<span>3</span></span>
        </Link>
        <nav aria-label="Guide page navigation">
          <Link href="/">Home</Link>
          <Link href="/book">The Book</Link>
          <a className="nav-cta" href="#get-guide">Get the Free Guide</a>
        </nav>
      </header>

      <section className="book-sample guide-landing" id="get-guide">
        <div className="sample-intro">
          <p className="section-label">/ FREE 2026-2027 CAREER GUIDE</p>
          <h1>TOP TEN<br /><span>SKILLED TRADES.</span></h1>
          <p>
            Get the separate TRADE HUSTL3 guide preview for people comparing skilled-trade paths. It covers opportunity, national pay context, entry routes, source standards, and practical next moves.
          </p>
          <SignupForm mode="topTrades" />
          <small className="sample-consent">By unlocking the guide, you agree to receive TRADE HUSTL3 career updates. Unsubscribe anytime.</small>
        </div>
        <div className="sample-quote">
          <p className="section-label">/ WHAT IS INSIDE</p>
          <ul>
            {guideBenefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
          </ul>
          <p><strong>Source note:</strong> Figures are national context based on cited sources and are not a guarantee of earnings. Pay and opportunity vary by location, employer, experience, licensing, and specialty.</p>
        </div>
      </section>

      <footer>
        <div className="footer-brand"><div className="wordmark">TRADE HUSTL<span>3</span></div><p>Built by Hustle, Backed by Trades.</p><SocialLinks /></div>
        <div className="footer-links"><Link href="/">Home</Link><Link href="/book">The Book</Link><Link href="/book#sample">7-page book sample</Link><Link href="/resume-builder">Resume Builder</Link></div>
        <div className="footer-legal"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Support</Link></div>
        <p className="copyright">© 2026 TRADE HUSTL3. ALL GRIT RESERVED.</p>
      </footer>
    </main>
  );
}
