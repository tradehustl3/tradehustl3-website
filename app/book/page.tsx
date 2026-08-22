import type { Metadata } from "next";
import Image from "next/image";
import { SITE_NAME, SITE_URL } from "../site";

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
  numberOfPages: 586,
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

export default function BookPage() {
  return (
    <main className="book-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bookStructuredData) }}
      />

      <header className="site-header book-site-header">
        <a className="brand-link" href="/" aria-label="TRADE HUSTL3 home">
          <Image className="header-logo" src="/trade-hustl3-logo.png" alt="TRADE HUSTL3 logo" width={68} height={68} priority />
          <span className="wordmark">TRADE HUSTL<span>3</span></span>
        </a>
        <nav aria-label="Book page navigation">
          <a href="/">Home</a>
          <a href="#inside">Inside the book</a>
          <a href="#author">Author</a>
          <a className="nav-cta" href="/#join">Get release updates</a>
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
          <p className="book-lead">
            The blueprint, the game plan, and the movement for people ready to build a future through skilled trades. Go from exploring your options to choosing a path, developing real ability, increasing your value, and creating something that belongs to you.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="/#join">Get launch updates <span>↗</span></a>
            <a className="button button-secondary" href="#inside">Explore the book</a>
          </div>
        </div>
      </section>

      <section className="book-facts" aria-label="Book details">
        <div><span>Release</span><strong>September 15, 2026</strong></div>
        <div><span>Formats</span><strong>Paperback + eBook</strong></div>
        <div><span>Length</span><strong>586 pages</strong></div>
        <div><span>Current KDP ISBN</span><strong>9798193043355</strong></div>
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
          The first edition is scheduled to launch on Amazon on September 15, 2026. The current ISBN shown here is specific to the KDP paperback edition. An independently owned ISBN and additional retailer links will be added as distribution expands.
        </p>
        <div className="availability-grid">
          <article><span>AMAZON PAPERBACK</span><strong>$24.99</strong><small>Scheduled for September 15, 2026</small></article>
          <article><span>KINDLE eBOOK</span><strong>$9.99</strong><small>Scheduled for September 15, 2026</small></article>
          <article><span>MORE RETAILERS</span><strong>COMING NEXT</strong><small>Links will be added when confirmed</small></article>
        </div>
        <a className="button button-primary" href="/#join">Join the book list <span>↗</span></a>
      </section>

      <footer>
        <div className="footer-brand"><div className="wordmark">TRADE HUSTL<span>3</span></div><p>Built by Hustle, Backed by Trades.</p></div>
        <div className="footer-links"><a href="/">Home</a><a href="#inside">Inside the book</a><a href="#author">Author</a><a href="mailto:partners@tradehustl3.com">Partnerships</a></div>
        <p className="copyright">© 2026 TRADE HUSTL3. ALL GRIT RESERVED.</p>
      </footer>
    </main>
  );
}
