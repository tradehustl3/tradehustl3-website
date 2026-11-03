import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SocialLinks } from "../social-links";
import { SITE_NAME, SITE_URL } from "../site";
import { SignupForm } from "../signup-form";
import LaunchPurchaseButton from "./launch-purchase-button";
import { BrandLockup } from "../brand-lockup";
import { CtaAnalytics } from "../cta-analytics";
import {
  AMAZON_KINDLE,
  AMAZON_PAPERBACK,
  BOOK_PAPERBACK_ISBN,
  BOOK_PAPERBACK_PAGES,
  BOOK_PARTNERSHIPS_EMAIL,
  DIRECT_EBOOK,
} from "./editions";

const BOOK_TITLE = "TRADE HUSTL3: Built by Hustle, Backed by Trades";
const BOOK_PAGE_TITLE = "TRADE HUSTL3 Book by Zachary Ellis (Mr. HUSTL3)";
const BOOK_DESCRIPTION =
  "Explore 200+ skilled trades, training, certifications, and career paths with Zachary Ellis (Mr. HUSTL3). Includes a practical 90-Day Action Plan. Paperback, Kindle, and direct eBook.";

const SCHOOLS_MAILTO = `mailto:${BOOK_PARTNERSHIPS_EMAIL}?subject=${encodeURIComponent("TRADE HUSTL3 book order for our program")}`;

export const metadata: Metadata = {
  title: BOOK_PAGE_TITLE,
  description: BOOK_DESCRIPTION,
  alternates: { canonical: "/book" },
  openGraph: {
    title: BOOK_PAGE_TITLE,
    description: BOOK_DESCRIPTION,
    url: "/book",
    siteName: SITE_NAME,
    type: "book",
    images: [
      {
        url: "/optimized/og-book-v1.jpg",
        type: "image/jpeg",
        width: 800,
        height: 1200,
        alt: "Official TRADE HUSTL3 book cover",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BOOK_PAGE_TITLE,
    description: BOOK_DESCRIPTION,
    images: ["/optimized/og-book-v1.jpg"],
  },
};

const IN_STOCK = "https://schema.org/InStock";
const amazonSeller = { "@type": "Organization", name: "Amazon.com" };

const bookStructuredData = {
  "@context": "https://schema.org",
  "@type": "Book",
  "@id": `${SITE_URL}/book#book`,
  name: BOOK_TITLE,
  description: BOOK_DESCRIPTION,
  isbn: BOOK_PAPERBACK_ISBN,
  datePublished: "2026-09-15",
  inLanguage: "en-US",
  url: `${SITE_URL}/book`,
  image: `${SITE_URL}/optimized/book-cover-v2.webp`,
  sameAs: [AMAZON_PAPERBACK.url, AMAZON_KINDLE.url],
  author: {
    "@id": `${SITE_URL}/#zachary-ellis`,
  },
  publisher: {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
  },
  workExample: [
    {
      "@type": "Book",
      "@id": `${SITE_URL}/book#paperback`,
      name: BOOK_TITLE,
      bookFormat: "https://schema.org/Paperback",
      isbn: BOOK_PAPERBACK_ISBN,
      numberOfPages: BOOK_PAPERBACK_PAGES,
      url: AMAZON_PAPERBACK.url,
      offers: {
        "@type": "Offer",
        url: AMAZON_PAPERBACK.url,
        price: AMAZON_PAPERBACK.price,
        priceCurrency: "USD",
        availability: IN_STOCK,
        seller: amazonSeller,
      },
    },
    {
      "@type": "Book",
      "@id": `${SITE_URL}/book#kindle`,
      name: BOOK_TITLE,
      bookFormat: "https://schema.org/EBook",
      identifier: { "@type": "PropertyValue", propertyID: "ASIN", value: AMAZON_KINDLE.asin },
      url: AMAZON_KINDLE.url,
      offers: {
        "@type": "Offer",
        url: AMAZON_KINDLE.url,
        price: AMAZON_KINDLE.price,
        priceCurrency: "USD",
        availability: IN_STOCK,
        seller: amazonSeller,
      },
    },
    {
      "@type": "Book",
      "@id": `${SITE_URL}/book#direct-ebook`,
      name: BOOK_TITLE,
      bookFormat: "https://schema.org/EBook",
      url: `${SITE_URL}/book#availability`,
      offers: {
        "@type": "Offer",
        url: `${SITE_URL}/book#availability`,
        price: DIRECT_EBOOK.price,
        priceCurrency: "USD",
        availability: IN_STOCK,
        seller: { "@id": `${SITE_URL}/#organization` },
      },
    },
  ],
};

const discoveries = [
  "More than 200 skilled trades across every major industry",
  "How to enter the trades with no experience and start building value",
  "Training, certifications, apprenticeships, and real-world career paths",
  "How skill can create leverage, leadership, ownership, and generational wealth",
];

const audiences = [
  "Students and young adults exploring careers",
  "Job seekers and career changers",
  "Parents, educators, and workforce programs",
  "Working tradespeople ready to earn more",
  "Future supervisors, specialists, and business owners",
];

const parts = [
  ["PART I", "Build the Foundation", "Understand what skilled work really is, why demand is growing, and how to begin without experience."],
  ["PART II", "Know the Landscape", "Explore construction, mechanical, electrical, industrial, fabrication, service, maintenance, and facilities careers."],
  ["PART III", "Turn Skill Into Leverage", "Learn how certifications, specialization, overtime, side work, and reputation can increase your value."],
  ["PART IV", "Build Control", "Move from employee thinking toward leadership, ownership, and a focused 90-Day Action Plan."],
];

const chapterParts = [
  {
    label: "PART I",
    title: "Build the Foundation",
    chapters: [
      "What a Skilled Trade Really Is",
      "Why Skilled Trades Are in High Demand",
      "College vs. Trades: The Real Math",
      "The No-Experience Path",
      "Learning on the Job",
      "Trade Myths That Keep People Broke",
    ],
  },
  {
    label: "PART II",
    title: "Know the Landscape",
    chapters: [
      "The Different Types of Skilled Trades",
      "Construction Trades",
      "Mechanical Trades: HVAC, Plumbing, Pipefitting, and Refrigeration",
      "Electrical and Power Trades",
      "Industrial, Energy, and Infrastructure Trades",
      "Fabrication and Precision Trades",
      "Service, Maintenance, and Facilities Trades",
      "Personal Skilled Trades and Solo Ownership Paths",
    ],
  },
  {
    label: "PART III",
    title: "Turn Skill Into Money and Leverage",
    chapters: [
      "Certifications That Actually Matter",
      "How Pay Really Increases in the Trades",
      "Side Work, Overtime, and Specialization",
    ],
  },
  {
    label: "PART IV",
    title: "Turn Leverage Into Control",
    chapters: [
      "From Employee to Owner",
      "Choosing the Right Trade for You",
      "The Trade Hustle 90-Day Action Plan",
      "Final Word: Build Something That Belongs to You",
    ],
  },
];

export default function BookPage() {
  return (
    <main className="book-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bookStructuredData) }}
      />
      <CtaAnalytics />

      <header className="site-header book-site-header">
        <Link className="brand-link" href="/" aria-label="TRADE HUSTL3 home">
          <BrandLockup />
        </Link>
        <nav aria-label="Book page navigation">
          <Link href="/">Home</Link>
          <a href="#sample">Free guide</a>
          <a href="#chapters">Chapters</a>
          <a href="#author">Author</a>
          <a href="#schools">Schools</a>
          <a className="nav-cta" href="#availability" data-cta="buy-the-book" data-cta-location="book-header">Buy the Book</a>
        </nav>
      </header>

      <section className="book-hero">
        <div className="book-cover-stage">
          <div className="book-cover-glow" aria-hidden="true" />
          <Image
            className="book-cover-image"
            src="/optimized/book-cover-v2.webp"
            alt="Official front cover of TRADE HUSTL3"
            width={1024}
            height={1536}
            priority
          />
        </div>
        <div className="book-hero-copy">
          <p className="section-label">/ THE OFFICIAL BOOK</p>
          <p className="book-release-badge">Paperback · Kindle · eBook — Available now</p>
          <h1>TRADE<br />HUSTL<span>3</span></h1>
          <p className="book-subtitle">Built by Hustle, Backed by Trades.</p>
          <p className="book-byline">By Zachary Ellis · Mr. HUSTL3</p>
          <div className="book-hero-proof" aria-label="Book highlights">
            <span><strong>200+</strong><small>Skilled trades</small></span>
            <span><strong>21</strong><small>Chapters</small></span>
            <span><strong>90</strong><small>Day action plan</small></span>
          </div>
          <p className="book-lead">
            The blueprint, the game plan, and the movement for people ready to build a future through skilled trades. Go from exploring your options to choosing a path, developing real ability, increasing your value, and creating something that belongs to you.
          </p>
          <div className="hero-actions">
            <a
              className="button button-primary"
              href={AMAZON_PAPERBACK.url}
              rel="noopener"
              data-cta="amazon-paperback"
              data-cta-location="book-hero"
            >
              Buy the Paperback — ${AMAZON_PAPERBACK.price} <span>↗</span>
            </a>
            <a className="button button-secondary" href="#availability" data-cta="book-formats" data-cta-location="book-hero">
              Kindle or eBook — ${AMAZON_KINDLE.price}
            </a>
          </div>
          <p className="book-hero-note">
            Paperback and Kindle sold on Amazon. Not ready yet? <a className="text-link" href="#sample">Get the Free Guide preview</a>
          </p>
        </div>
      </section>

      <section className="book-facts" aria-label="Book details">
        <div><span>Paperback</span><strong>{BOOK_PAPERBACK_PAGES} pages</strong></div>
        <div><span>Formats</span><strong>Paperback · Kindle · eBook</strong></div>
        <div><span>Starting point</span><strong>No experience required</strong></div>
        <div><span>Current KDP ISBN</span><strong>{BOOK_PAPERBACK_ISBN}</strong></div>
      </section>

      <section className="book-sample" id="sample">
        <div className="sample-intro">
          <p className="section-label">/ FREE 2026-2027 GUIDE</p>
          <h2>GET THE FREE<br /><span>GUIDE PREVIEW.</span></h2>
          <p>
            Enter your email to unlock the seven-page preview of <em>TRADE HUSTL3: 10 High-Opportunity Trades — 2026-2027 Edition</em> (cover included). It includes the guide&apos;s source standard, verified power-line and HVAC profiles, national pay context, and practical next steps.
          </p>
          <SignupForm mode="sample" />
          <small className="sample-consent">By unlocking the free guide, you agree to receive TRADE HUSTL3 book and career updates. Unsubscribe anytime.</small>
        </div>
        <figure className="sample-quote">
          <blockquote>
            “You don’t have to wait for somebody to hand you a future. Learn a skill. Build your value. Earn your own. Create something nobody can take from you. <span>BUILT BY HUSTL3. BACKED BY TRADES.</span>”
          </blockquote>
          <figcaption>The TRADE HUSTL3 mindset</figcaption>
        </figure>
      </section>

      <section className="book-discover" id="inside">
        <div className="book-section-heading">
          <p className="section-label">/ WHAT YOU WILL DISCOVER</p>
          <h2>A CAREER GUIDE BUILT FOR<br /><span>REAL MOVES.</span></h2>
        </div>
        <div className="book-discover-grid">
          {discoveries.map((item, index) => (
            <article key={item}>
              <span>0{index + 1}</span>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="book-structure">
        <div className="book-structure-intro">
          <p className="section-label">/ THE ROADMAP</p>
          <h2>ENTER.<br />EARN.<br /><span>ELEVATE.</span></h2>
          <p>
            Twenty-one chapters move from the foundation of skilled work to career selection, certifications, pay growth, specialization, leadership, ownership, and a practical 90-Day Action Plan.
          </p>
        </div>
        <div className="book-parts">
          {parts.map(([label, title, copy]) => (
            <article key={label}>
              <span>{label}</span>
              <div><h3>{title}</h3><p>{copy}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="book-toc" id="chapters">
        <div className="book-section-heading">
          <p className="section-label">/ TABLE OF CONTENTS</p>
          <h2>21 CHAPTERS. FOUR PARTS.<br /><span>ONE PLAN.</span></h2>
        </div>
        <div className="toc-grid">
          {chapterParts.map((part, partIndex) => {
            const chapterOffset = chapterParts
              .slice(0, partIndex)
              .reduce((total, item) => total + item.chapters.length, 0);

            return (
              <details className="toc-part" key={part.label} open={partIndex === 0}>
                <summary>
                  <span>{part.label}</span>
                  <strong>{part.title}</strong>
                  <small>{part.chapters.length} chapters</small>
                </summary>
                <ol start={chapterOffset + 1}>
                  {part.chapters.map((chapter) => <li key={chapter}>{chapter}</li>)}
                </ol>
              </details>
            );
          })}
        </div>
        <p className="toc-appendices">
          Also included: Appendix A—200 Skilled Trades · Appendix B—Training, Certification &amp; Supply-House Resource Directory · Appendix C—Official Source Notes
        </p>
      </section>

      <section className="book-audience">
        <div>
          <p className="section-label">/ WHO THIS BOOK IS FOR</p>
          <h2>START WHERE YOU ARE.<br /><span>BUILD FROM THERE.</span></h2>
        </div>
        <ul>
          {audiences.map((audience) => <li key={audience}>{audience}</li>)}
        </ul>
      </section>

      <section className="book-schools" id="schools" aria-labelledby="book-schools-title">
        <div>
          <p className="section-label">/ FOR SCHOOLS &amp; PROGRAMS</p>
          <h2 id="book-schools-title">BRING IT TO<br /><span>YOUR PROGRAM.</span></h2>
        </div>
        <div className="book-schools-copy">
          <p>
            High schools, trade schools, Job Corps centers, workforce programs, and employers: if you want copies of TRADE HUSTL3 for your students, trainees, or new hires, email us.
          </p>
          <p>
            Include your organization, how many copies you need, the format (paperback or eBook), and when you need them. We&apos;ll reply with the options available for your order.
          </p>
          <a
            className="button button-primary"
            href={SCHOOLS_MAILTO}
            data-cta="schools-inquiry"
            data-cta-location="book-schools"
          >
            Email {BOOK_PARTNERSHIPS_EMAIL} <span>↗</span>
          </a>
        </div>
      </section>

      <section className="book-author" id="author">
        <div className="author-portrait-frame">
          <Image
            className="author-portrait"
            src="/optimized/author-portrait-v2.webp"
            alt="Zachary Ellis, known as Mr. HUSTL3, author of TRADE HUSTL3"
            width={800}
            height={800}
          />
          <p>Official author portrait</p>
        </div>
        <div className="author-copy">
          <p className="section-label">/ ABOUT THE AUTHOR · MR. HUSTL3</p>
          <h2>ZACHARY<br /><span>ELLIS.</span></h2>
          <p>
            Zachary Ellis, known as Mr. HUSTL3, is an HVAC and facilities maintenance professional with more than a decade of hands-on experience solving real problems in the field. He is EPA 608 Universal certified and OSHA-10 trained. His background includes residential and commercial systems, preventive maintenance, facilities operations, team leadership, vendor coordination, and large-scale equipment.
          </p>
          <p>
            TRADE HUSTL3 was born from real work, real lessons, and a clear purpose: help the next generation enter skilled trades, earn through useful ability, and elevate into leadership, ownership, and long-term opportunity.
          </p>
        </div>
      </section>

      <section className="book-availability" id="availability">
        <p className="section-label">/ AVAILABILITY</p>
        <h2>PICK YOUR FORMAT.<br /><span>AVAILABLE NOW.</span></h2>
        <p>
          The paperback and Kindle editions are sold and delivered by Amazon. The direct eBook is a PDF from TRADE HUSTL3, delivered by email after secure checkout.
        </p>
        <div className="availability-grid">
          <article className="availability-featured">
            <span>AMAZON PAPERBACK</span>
            <strong>${AMAZON_PAPERBACK.price}</strong>
            <small>{BOOK_PAPERBACK_PAGES} pages · Ships from Amazon</small>
            <a
              className="button button-primary"
              href={AMAZON_PAPERBACK.url}
              rel="noopener"
              data-cta="amazon-paperback"
              data-cta-location="book-availability"
            >
              Buy on Amazon <span>↗</span>
            </a>
          </article>
          <article>
            <span>KINDLE eBOOK</span>
            <strong>${AMAZON_KINDLE.price}</strong>
            <small>Read on Kindle devices and the Kindle app</small>
            <a
              className="button button-outline"
              href={AMAZON_KINDLE.url}
              rel="noopener"
              data-cta="amazon-kindle"
              data-cta-location="book-availability"
            >
              Buy on Amazon <span>↗</span>
            </a>
          </article>
          <article>
            <span>DIRECT eBOOK</span>
            <strong>${DIRECT_EBOOK.price}</strong>
            <small>Available now · secure PDF delivered by email after payment</small>
            <LaunchPurchaseButton />
          </article>
        </div>
        <p className="purchase-terms"><strong>Direct eBook: Secure checkout powered by Stripe · One-time purchase · No subscription.</strong></p>
        <p className="purchase-terms">By purchasing the direct eBook, you agree to the <Link href="/terms">Terms of Service</Link>, <Link href="/privacy">Privacy Policy</Link>, and <Link href="/book/refund-policy">eBook Delivery and Refund Policy</Link>. Amazon purchases are covered by Amazon&apos;s terms.</p>
      </section>

      <footer>
        <div className="footer-brand"><div className="wordmark">TRADE HUSTL<span>3</span></div><p>BUILT BY HUSTL3. BACKED BY TRADES.</p><SocialLinks /></div>
        <div className="footer-links"><Link href="/">Home</Link><a href="#sample">Free guide</a><a href="#chapters">Chapters</a><a href="#author">Author</a><a href="#availability">Buy the Book</a><a href="#schools">Schools &amp; programs</a><a href={`mailto:${BOOK_PARTNERSHIPS_EMAIL}`}>Partnerships</a></div>
        <div className="footer-legal"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/book/refund-policy">eBook policy</Link><Link href="/data-deletion">Data requests</Link><Link href="/contact">Support</Link></div>
        <p className="copyright">© 2026 TRADE HUSTL3. ALL GRIT RESERVED.</p>
      </footer>
    </main>
  );
}
