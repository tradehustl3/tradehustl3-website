import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SocialLinks } from "../social-links";
import { SITE_NAME, SITE_URL } from "../site";
import { SignupForm } from "../signup-form";
import LaunchPurchaseButton from "./launch-purchase-button";
import { AMAZON_KINDLE_URL, AMAZON_PAPERBACK_URL, PROGRAM_ORDER_EMAIL, PROGRAM_ORDER_MAILTO } from "./book-links";
import { BrandLockup } from "../brand-lockup";

const BOOK_TITLE = "TRADE HUSTL3: Built by Hustle, Backed by Trades";
const BOOK_DESCRIPTION =
  "Skilled-trades career guide for students, career changers, parents and educators: 200 trades, certifications, pay growth and a 90-Day Action Plan.";

export const metadata: Metadata = {
  title: "TRADE HUSTL3 Book | Da Maintenance Mane",
  description: BOOK_DESCRIPTION,
  alternates: { canonical: "/book" },
  openGraph: {
    title: "TRADE HUSTL3 Book | Da Maintenance Mane",
    description: BOOK_DESCRIPTION,
    url: "/book",
    siteName: SITE_NAME,
    type: "book",
    images: [
      {
        url: "/optimized/og-book-v2.jpg",
        type: "image/jpeg",
        width: 800,
        height: 1200,
        alt: "Official TRADE HUSTL3 book cover",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TRADE HUSTL3 Book | Da Maintenance Mane",
    description: BOOK_DESCRIPTION,
    images: ["/optimized/og-book-v2.jpg"],
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
  inLanguage: "en-US",
  url: `${SITE_URL}/book`,
  image: `${SITE_URL}/optimized/book-cover-v3.webp`,
  numberOfPages: 438,
  bookFormat: ["https://schema.org/Paperback", "https://schema.org/EBook"],
  author: {
    "@id": `${SITE_URL}/#zachary-ellis`,
  },
  publisher: {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
  },
};

const discoveries = [
  "200 skilled trades across every major industry, listed in Appendix A",
  "How to enter the trades with no experience and start building value",
  "Training, certifications, apprenticeships, and real-world career paths",
  "How skill can create leverage, leadership, ownership, and generational wealth",
];

const readerPaths = [
  {
    id: "readers",
    label: "STUDENTS & CAREER CHANGERS",
    title: "Find your trade. Make your first move.",
    copy: "No experience required. Learn what each trade pays, how people get in, which certifications matter, and how to turn a skill into a career with the 90-Day Action Plan.",
    cta: { label: "Buy the eBook — $9.99", href: "#formats" },
  },
  {
    id: "parents",
    label: "PARENTS & FAMILIES",
    title: "A straight answer on trades vs. college.",
    copy: "Chapter 3, College vs. Trades: The Real Math, and the No-Experience Path give you and your teen the same plain-language picture of training, cost, pay and growth, so you can plan together.",
    cta: { label: "Read the free guide first", href: "#sample" },
  },
  {
    id: "educators",
    label: "TEACHERS, COUNSELORS & PROGRAMS",
    title: "A ready-made career unit for your students.",
    copy: "Four parts, 21 chapters, a 200-trade appendix, a training and certification resource directory, and a 90-Day Action Plan students can complete. Built for CTE, trade schools, Job Corps and workforce programs.",
    cta: { label: "Ask about classroom orders", href: "#schools" },
  },
];

const classroomUses = [
  ["Career exploration", "Part II walks through construction, mechanical, electrical, industrial, fabrication, service and facilities trades, one chapter each."],
  ["Planning and goal-setting", "The 90-Day Action Plan in Part IV gives every student a written next step, not just a reading assignment."],
  ["Credentials and pay", "Chapters on certifications that matter and how pay really increases connect training choices to real earnings."],
  ["Resources students keep", "Appendix B is a training, certification and supply-house resource directory; Appendix C lists the official sources behind the facts."],
];

const faqs = [
  ["How do I get the eBook?", "Buy it here for $9.99. After payment you receive a secure PDF download link by email. It is a one-time purchase with no subscription."],
  ["Is there a paperback?", "Yes. The paperback is $24.99 on Amazon: 438 pages, 6 × 9 inches."],
  ["Do I need any trade experience to use this book?", "No. Part I is written for people starting from zero, and the No-Experience Path chapter shows how to get in."],
  ["Can our school or program order copies for students?", `Yes. Email ${PROGRAM_ORDER_EMAIL} with your organization, program, number of students and timeline, and we will reply with options.`],
  ["What if my eBook download does not arrive?", "Check your spam folder first, then contact support. The eBook Delivery and Refund Policy below explains delivery and refunds."],
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
          <BrandLockup />
        </Link>
        <nav aria-label="Book page navigation">
          <Link href="/">Home</Link>
          <a href="#chapters">Chapters</a>
          <a href="#schools">Schools &amp; programs</a>
          <a href="#author">Author</a>
          <a className="nav-cta" href="#formats">Get the book</a>
        </nav>
      </header>

      <section className="book-hero">
        <div className="book-cover-stage">
          <div className="book-cover-glow" aria-hidden="true" />
          <Image
            className="book-cover-image"
            src="/optimized/book-cover-v3.webp"
            alt="Front cover of TRADE HUSTL3: Built by Hustle, Backed by Trades"
            width={800}
            height={1200}
            priority
          />
        </div>
        <div className="book-hero-copy">
          <p className="section-label">/ THE OFFICIAL BOOK</p>
          <p className="book-release-badge">Available now · eBook $9.99 · Paperback $24.99</p>
          <h1>TRADE<br />HUSTL<span>3</span></h1>
          <p className="book-subtitle">Built by Hustle, Backed by Trades.</p>
          <p className="book-byline">By Da Maintenance Mane</p>
          <div className="book-hero-proof" aria-label="Book highlights">
            <span><strong>200</strong><small>Skilled trades</small></span>
            <span><strong>21</strong><small>Chapters</small></span>
            <span><strong>90</strong><small>Day action plan</small></span>
            <span><strong>438</strong><small>Pages</small></span>
          </div>
          <p className="book-lead">
            The blueprint, the game plan, and the movement for people ready to build a future through skilled trades. Go from exploring your options to choosing a path, developing real ability, increasing your value, and creating something that belongs to you.
          </p>
          <div className="hero-actions">
            <LaunchPurchaseButton />
            <a className="button button-secondary" href="#sample">Get the Free Guide <span>↗</span></a>
          </div>
          <p className="book-hero-program">
            Ordering for a class, school or program? <a className="text-link" href="#schools">See classroom options <span>→</span></a>
          </p>
        </div>
      </section>

      <section className="book-facts" aria-label="Book details">
        <div><span>Direct eBook</span><strong>Available now</strong></div>
        <div><span>Formats</span><strong>Paperback + eBook</strong></div>
        <div><span>Starting point</span><strong>No experience required</strong></div>
        <div><span>Current KDP ISBN</span><strong>9798193043355</strong></div>
      </section>

      <section className="book-paths" aria-labelledby="book-paths-title">
        <div className="book-section-heading">
          <p className="section-label">/ WHO IT&apos;S FOR</p>
          <h2 id="book-paths-title">ONE BOOK.<br /><span>THREE WAYS IN.</span></h2>
        </div>
        <div className="book-paths-grid">
          {readerPaths.map((path) => (
            <article key={path.id} id={`for-${path.id}`}>
              <span>{path.label}</span>
              <h3>{path.title}</h3>
              <p>{path.copy}</p>
              <a className="text-link" href={path.cta.href}>{path.cta.label} <span>→</span></a>
            </article>
          ))}
        </div>
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

      <section className="book-schools" id="schools" aria-labelledby="book-schools-title">
        <div className="book-schools-intro">
          <p className="section-label">/ SCHOOLS, PROGRAMS &amp; EMPLOYERS</p>
          <h2 id="book-schools-title">PUT IT IN<br /><span>THEIR HANDS.</span></h2>
          <p>
            For CTE classrooms, trade schools, Job Corps centers, workforce boards, apprenticeship programs and employers bringing on new hires. Tell us your program and how many students you serve, and we will reply with ordering options for paperback, eBook or both.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href={PROGRAM_ORDER_MAILTO}>Ask about classroom orders <span>↗</span></a>
          </div>
          <p className="book-schools-email">Or email <a href={`mailto:${PROGRAM_ORDER_EMAIL}`}>{PROGRAM_ORDER_EMAIL}</a></p>
        </div>
        <div className="book-schools-uses">
          <p className="section-label">/ HOW IT FITS A COURSE</p>
          <ul>
            {classroomUses.map(([title, copy]) => (
              <li key={title}><strong>{title}</strong><span>{copy}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="book-author" id="author">
        <div className="author-portrait-frame">
          <Image
            className="author-portrait"
            src="/optimized/author-portrait-v1.webp"
            alt="Da Maintenance Mane, author of TRADE HUSTL3"
            width={1086}
            height={1449}
          />
          <p>Official back-cover portrait</p>
        </div>
        <div className="author-copy">
          <p className="section-label">/ ABOUT THE AUTHOR</p>
          <h2>DA<br />MAINTENANCE <span>MANE.</span></h2>
          <p>
            Da Maintenance Mane is an HVAC and facilities maintenance professional with 10+ years of hands-on experience solving real problems in the field. His background includes residential and commercial systems, preventive maintenance, facilities operations, team leadership, vendor coordination, and large-scale equipment.
          </p>
          <p>
            TRADE HUSTL3 was born from real work, real lessons, and a clear purpose: help the next generation enter skilled trades, earn through useful ability, and elevate into leadership, ownership, and long-term opportunity.
          </p>
        </div>
      </section>

      <section className="book-availability" id="formats">
        <span id="availability" aria-hidden="true" />
        <p className="section-label">/ GET THE BOOK</p>
        <h2>PICK YOUR FORMAT.<br /><span>START TODAY.</span></h2>
        <p>
          The direct eBook is available now and arrives by email right after payment. The paperback is sold on Amazon.
        </p>
        <div className="availability-grid">
          <article>
            <span>DIRECT eBOOK</span>
            <strong>$9.99</strong>
            <small>Available now · secure PDF delivered by email after payment</small>
          </article>
          <article>
            <span>AMAZON PAPERBACK</span>
            <strong>$24.99</strong>
            {AMAZON_PAPERBACK_URL
              ? <a className="text-link" href={AMAZON_PAPERBACK_URL} rel="noopener noreferrer" target="_blank">Buy on Amazon <span>↗</span></a>
              : <small>438 pages · 6 × 9 in · Amazon link coming soon</small>}
          </article>
          <article>
            <span>KINDLE eBOOK</span>
            <strong>$9.99</strong>
            {AMAZON_KINDLE_URL
              ? <a className="text-link" href={AMAZON_KINDLE_URL} rel="noopener noreferrer" target="_blank">Buy on Kindle <span>↗</span></a>
              : <small>Kindle edition coming soon</small>}
          </article>
        </div>
        <LaunchPurchaseButton />
        <p className="purchase-terms"><strong>Secure checkout powered by Stripe · One-time purchase · No subscription.</strong></p>
        <p className="purchase-terms">By purchasing, you agree to the <Link href="/terms">Terms of Service</Link>, <Link href="/privacy">Privacy Policy</Link>, and <Link href="/book/refund-policy">eBook Delivery and Refund Policy</Link>.</p>
      </section>

      <section className="book-faq" aria-labelledby="book-faq-title">
        <div className="book-section-heading">
          <p className="section-label">/ QUESTIONS</p>
          <h2 id="book-faq-title">BEFORE YOU<br /><span>BUY.</span></h2>
        </div>
        <div className="book-faq-list">
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer>
        <div className="footer-brand"><div className="wordmark">TRADE HUSTL<span>3</span></div><p>BUILT BY HUSTL3. BACKED BY TRADES.</p><SocialLinks /></div>
        <div className="footer-links"><Link href="/">Home</Link><a href="#sample">Free guide</a><a href="#chapters">Chapters</a><a href="#schools">Schools &amp; programs</a><a href="#formats">Get the book</a></div>
        <div className="footer-legal"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/book/refund-policy">eBook policy</Link><Link href="/data-deletion">Data requests</Link><Link href="/contact">Support</Link></div>
        <p className="copyright">© 2026 TRADE HUSTL3. ALL GRIT RESERVED.</p>
      </footer>
    </main>
  );
}
