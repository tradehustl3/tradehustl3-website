import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "../../lead-magnet.css";
import { CtaAnalytics } from "../../cta-analytics";
import { ResourceForm } from "../../resource-form";
import { SITE_NAME } from "../../site";
import { SUPPORT_EMAIL } from "../../../shared/customer-config";
import { ViewContentTracker } from "../../view-content-tracker";

const TITLE = "Read a Free 7-Page Sample | TRADE HUSTL3 Book";
const DESCRIPTION =
  "Read seven free pages of TRADE HUSTL3 by Zachary Ellis — the source standard, verified trade profiles, national pay context, and the start of the 90-Day Action Plan.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/book/sample" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/book/sample",
    siteName: SITE_NAME,
    type: "website",
    images: [
      { url: "/trade-hustl3-book-cover.jpg", width: 1024, height: 1536, alt: "TRADE HUSTL3 book cover" },
    ],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/trade-hustl3-book-cover.jpg"] },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BookSamplePage({ searchParams }: { searchParams: SearchParams }) {
  // Cold traffic sees the email-capture form (fires Meta `Lead` on a confirmed
  // signup). Traffic from the Brevo delivery email carries `?token=`, which shows
  // the read state and fires `ViewContent` (content_name=book_sample) as the
  // "sample viewed" funnel step. The token is a display hint only —
  // /api/book-sample re-verifies it.
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
          <Link href="/book">The Book</Link>
          <Link href="/resume-builder">Resume Builder</Link>
        </nav>
      </header>

      <div className="lm-main">
        <section className="lm-hero">
          <p className="section-label">/ Free 7-page sample</p>
          <h1>Read 7 pages of<br /><span>TRADE HUSTL3.</span></h1>
          <p className="lm-lede">
            <em>TRADE HUSTL3: Built by Hustle, Backed by Trades</em> by Zachary Ellis. The free sample covers the
            source standard, two verified trade profiles, national pay context, and the start of the 90-Day Action
            Plan. No purchase required.
          </p>
        </section>

        <section className="lm-panel" aria-label="Read the free 7-page sample">
          <div className="lm-panel-media">
            <Image
              src="/trade-hustl3-book-cover.jpg"
              alt="TRADE HUSTL3: Built by Hustle, Backed by Trades — book cover"
              width={480}
              height={720}
            />
          </div>
          <div className="lm-panel-body">
            {token ? (
              <div className="lm-unlocked">
                <ViewContentTracker contentName="book_sample" />
                <p className="section-label">/ Your free sample is ready</p>
                <h2>Read 7 pages of<br /><span>TRADE HUSTL3.</span></h2>
                <p className="lm-unlocked-copy">
                  The source standard, two verified trade profiles, national pay context, and the start of the
                  90-Day Action Plan. A copy is also in your inbox.
                </p>
                <a
                  className="lm-download"
                  href={`/api/book-sample?token=${encodeURIComponent(token)}`}
                  target="_blank"
                  rel="noreferrer"
                  data-cta="book-sample-download"
                  data-cta-location="book-sample"
                >
                  Read the free 7-page sample <span aria-hidden="true">↗</span>
                </a>
                <div className="lm-cta-band">
                  <p>Ready for the full playbook? TRADE HUSTL3 — Built by Hustle, Backed by Trades.</p>
                  <a
                    className="lm-cta-button"
                    href="/book#availability"
                    data-cta="the-book"
                    data-cta-location="book-sample"
                  >
                    Get the full eBook — $9.99 <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="lm-locked">
                <p className="section-label">/ Instant access</p>
                <h2>Read the free sample.</h2>
                <p className="lm-locked-copy">
                  Enter your email to open the 7-page sample. You agree to receive TRADE HUSTL3 book and career
                  updates. Unsubscribe anytime.
                </p>
                <ResourceForm
                  resourceName="7-page book sample"
                  buttonLabel="READ MY FREE 7-PAGE SAMPLE"
                  includeFirstName={false}
                  ctaId="book-sample"
                  ctaLocation="book-sample-page"
                  metaLeadContentName="book_sample"
                  nextStepHref="/book"
                  nextStepLabel="Explore the full TRADE HUSTL3 book"
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
          <Link href="/book">The Book</Link>
          <Link href="/resume-builder">Resume Builder</Link>
          <Link href="/book/refund-policy">eBook Policy</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </nav>
      </footer>
    </main>
  );
}
