import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "../site";
import { SignupForm } from "../signup-form";
import LaunchPurchaseButton from "./launch-purchase-button";
import ReleaseCountdown from "./release-countdown";

const BOOK_TITLE = "TRADE HUSTL3: Built by Hustle, Backed by Trades";
const BOOK_DESCRIPTION =
  "A practical skilled-trades career guide by Zachary Ellis covering more than 200 trades, entry paths, certifications, earning power, ownership, and a 90-Day Action Plan.";

export const metadata: Metadata = {
  title: "TRADE HUSTL3 Book | Zachary Ellis",
  description: BOOK_DESCRIPTION,
  alternates: { canonical: "/book" },
  openGraph: {
    title: "TRADE HUSTL3 Book | Zachary Ellis",
    description: BOOK_DESCRIPTION,
    url: "/book",
    siteName: SITE_NAME,
    type: "book",
    images: [
      {
        url: "/trade-hustl3-book-cover.jpg",
        width: 1024,
        height: 1536,
        alt: "Official TRADE HUSTL3 book cover",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TRADE HUSTL3 Book | Zachary Ellis",
    description: BOOK_DESCRIPTION,
    images: ["/trade-hustl3-book-cover.jpg"],
  },
};

const bookStructuredData = {
  "@context": "https://schema.org",
  "@type": "Book",
  "@id": `${SITE_URL}/book#book`,
  name: BOOK_TITLE,
  description: BOOK_DESCRIPTION,
  isbn: "9798193043355",
  datePublished: "2026-09-15",
  bookFormat: "https://schema.org/Paperback",
  inLanguage: "en-US",
  url: `${SITE_URL}/book`,
  image: `${SITE_URL}/trade-hustl3-book-cover.jpg`,
  author: {
    "@type": "Person",
    "@id": `${SITE_URL}/#zachary-ellis`,
    name: "Zachary Ellis",
  },
  publisher: {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
  },
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

      <header className="site-header book-site-header">
        <Link className="brand-link" href="/" aria-label="TRADE HUSTL3 home">
          <Image className="header-logo" src="/trade-hustl3-logo.png" alt="TRADE HUSTL3 logo" width={68} height={68} priority />
          <span className="wordmark">TRADE HUSTL<span>3</span></span>
        </Link>
        <nav aria-label="Book page navigation">
          <Link href="/">Home</Link>
          <a href="#sample">Free sample</a>
          <a href="#chapters">Chapters</a>
          <a href="#author">Author</a>
          <a className="nav-cta" href="#sample">Read a Free Sample</a>
        </nav>
      </header>

      <section className="book-hero">
        <div className="book-cover-stage">
          <div className="book-cover-glow" aria-hidden="true" />
          <Image
            className="book-cover-image"
            src="/trade-hustl3-book-cover.jpg"
            alt="Official front cover of TRADE HUSTL3"
            width={1024}
            height={1536}
            priority
          />
        </div>
        <div className="book-hero-copy">
          <p className="section-label">/ THE OFFICIAL BOOK</p>
          <p className="book-release-badge">Amazon release · September 15, 2026</p>
          <h1>TRADE<br />HUSTL<span>3</span></h1>
          <p className="book-subtitle">Built by Hustle, Backed by Trades.</p>
          <p className="book-byline">By Zachary Ellis</p>
          <div className="book-hero-proof" aria-label="Book highlights">
            <span><strong>200+</strong><small>Skilled trades</small></span>
            <span><strong>21</strong><small>Chapters</small></span>
            <span><strong>90</strong><small>Day action plan</small></span>
          </div>
          <p className="book-lead">
            The blueprint, the game plan, and the movement for people ready to build a future through skilled trades. Go from exploring your options to choosing a path, developing real ability, increasing your value, and creating something that belongs to you.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#sample">Read a Free Sample <span>↗</span></a>
            <Link className="button button-secondary" href="/#join">Get launch updates</Link>
          </div>
          <div className="countdown-wrap">
            <p>Launch countdown · September 15, 2026</p>
            <ReleaseCountdown />
          </div>
        </div>
      </section>

      <section className="book-facts" aria-label="Book details">
        <div><span>Release</span><strong>September 15, 2026</strong></div>
        <div><span>Formats</span><strong>Paperback + eBook</strong></div>
        <div><span>Starting point</span><strong>No experience required</strong></div>
        <div><span>Current KDP ISBN</span><strong>9798193043355</strong></div>
      </section>

      <section className="book-sample" id="sample">
        <div className="sample-intro">
          <p className="section-label">/ READ BEFORE RELEASE</p>
          <h2>START WITH THE<br /><span>FIRST 7 PAGES.</span></h2>
          <p>
            Enter your email to unlock the official seven-page sample. It includes the title page, the complete table of contents, and the opening pages of Chapter 1—pulled directly from the final book interior.
          </p>
          <SignupForm mode="sample" />
          <small className="sample-consent">By unlocking the sample, you agree to receive TRADE HUSTL3 book and career updates. Unsubscribe anytime.</small>
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

      <section className="book-author" id="author">
        <div className="author-portrait-frame">
          <Image
            className="author-portrait"
            src="/zachary-ellis-author.jpg"
            alt="Zachary Ellis, author of TRADE HUSTL3"
            width={1086}
            height={1449}
          />
          <p>Official back-cover portrait</p>
        </div>
        <div className="author-copy">
          <p className="section-label">/ ABOUT THE AUTHOR</p>
          <h2>DA<br />MAINTENANCE <span>MANE.</span></h2>
          <p>
            Zachary Ellis is an HVAC and facilities maintenance professional with more than nine years of hands-on experience solving real problems in the field. His background includes residential and commercial systems, preventive maintenance, facilities operations, team leadership, vendor coordination, and large-scale equipment.
          </p>
          <p>
            TRADE HUSTL3 was born from real work, real lessons, and a clear purpose: help the next generation enter skilled trades, earn through useful ability, and elevate into leadership, ownership, and long-term opportunity.
          </p>
        </div>
      </section>

      <section className="book-availability" id="availability">
        <p className="section-label">/ AVAILABILITY</p>
        <h2>THE FIRST RELEASE.<br /><span>MORE PATHS COMING.</span></h2>
        <p>
          The first edition launches September 15, 2026. Purchase the secure direct eBook from TRADE HUSTL3 or choose the Amazon paperback and Kindle editions when their listings go live.
        </p>
        <div className="availability-grid">
          <article><span>AMAZON PAPERBACK</span><strong>$24.99</strong><small>Scheduled for September 15, 2026</small></article>
          <article><span>DIRECT eBOOK</span><strong>$9.99</strong><small>Secure PDF delivered by email after payment</small></article>
          <article><span>KINDLE eBOOK</span><strong>$9.99</strong><small>Amazon link will be added when the listing is live</small></article>
        </div>
        <LaunchPurchaseButton />
      </section>

      <footer>
        <div className="footer-brand"><div className="wordmark">TRADE HUSTL<span>3</span></div><p>Built by Hustle, Backed by Trades.</p></div>
        <div className="footer-links"><Link href="/">Home</Link><a href="#sample">Free sample</a><a href="#chapters">Chapters</a><a href="#author">Author</a><a href="mailto:partners@tradehustl3.com">Partnerships</a></div>
        <p className="copyright">© 2026 TRADE HUSTL3. ALL GRIT RESERVED.</p>
      </footer>
    </main>
  );
}
