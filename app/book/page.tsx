import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { SocialLinks } from "../social-links";
import { SITE_NAME, SITE_URL } from "../site";
import { SignupForm } from "../signup-form";
import { ResourceForm } from "../resource-form";
import LaunchPurchaseButton from "./launch-purchase-button";
import { ProgramInquiryForm } from "./program-inquiry-form";
import { READER_REVIEWS, type ReaderReview } from "./reader-reviews";
import { isHolidayGiftSeason } from "./holiday-gift";
import { BOOK_BACK_MATTER, BOOK_CHAPTER_COUNT, BOOK_PARTS, BOOK_PART_COUNT } from "./book-contents";
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
  "Skilled-trades career guide by Zachary Ellis (Mr. HUSTL3): start with no experience, pick a trade, earn more, build toward ownership. With a 90-Day Action Plan.";

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
    title: BOOK_PAGE_TITLE,
    description: BOOK_DESCRIPTION,
    images: ["/optimized/og-book-v2.jpg"],
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
  image: `${SITE_URL}/optimized/book-cover-v3.webp`,
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
  "The major trade families: construction, mechanical, electrical, industrial, fabrication, service, maintenance, and facilities",
  "How to enter the trades with no experience and start building value",
  "Training, certifications, apprenticeships, and real-world career paths",
  "How skill can create leverage, leadership, and ownership",
];

/** Each line matches who the book itself speaks to (see Chapter 4 and the 90-Day Action Plan). */
const audiences = [
  "Young people, 16 and up, deciding on a first move",
  "Beginners starting with no trade experience",
  "Career changers who need a transition plan",
  "Experienced tradespeople ready for the next level",
  "Future leaders and business owners",
  "Parents, teachers, and programs guiding someone toward a trade",
];

/**
 * Site copy for each part of the book. Part titles, chapters, and page numbers
 * come from book-contents.ts (the final paperback's Contents page); only these
 * one-line summaries are written for the site, and each one describes chapters
 * that are actually in that part.
 */
/** Source for the "200+ skilled trades in America" stat (CRS report R44174, Jan 29, 2016). */
const TRADES_COUNT_SOURCE_URL = "https://www.everycrsreport.com/reports/R44174.html";

const PART_SUMMARIES: Record<string, string> = {
  "PART I": "Understand what skilled work really is, why demand is growing, and how to begin without experience.",
  "PART II": "Explore construction, mechanical, electrical, industrial, fabrication, service, maintenance, and facilities careers.",
  "PART III": "Learn how certifications, pay growth, side work, overtime, and specialization can increase your value.",
  "PART IV": "Move from employee thinking toward ownership, choose your trade, and follow the 90-Day Action Plan.",
};

/**
 * Every answer is grounded in a verified source: editions.ts (Amazon listings
 * checked 2026-11-03), the eBook Delivery and Refund Policy, and the 7-page
 * sample PDF. Update the source first, then this copy.
 */
const faqs: Array<{ question: string; answer: ReactNode }> = [
  {
    question: "What formats can I buy?",
    answer: (
      <>
        Three: the paperback (${AMAZON_PAPERBACK.price}, {BOOK_PAPERBACK_PAGES} pages) and the Kindle eBook (${AMAZON_KINDLE.price}) are sold on Amazon. The direct eBook (${DIRECT_EBOOK.price}) is a PDF sold by TRADE HUSTL3 through secure Stripe checkout.
      </>
    ),
  },
  {
    question: "Who ships the paperback?",
    answer: <>Amazon sells, prints, and ships the paperback and delivers the Kindle edition. Orders, shipping, and returns for those formats are handled by Amazon under Amazon&apos;s terms.</>,
  },
  {
    question: "How do I get the direct eBook after I pay?",
    answer: <>After a successful purchase, a protected PDF download link is emailed to the address you used at checkout. Delivery can take several minutes, so check your spam and promotions folders before contacting support.</>,
  },
  {
    question: "Can I get a refund on the direct eBook?",
    answer: (
      <>
        Duplicate charges and nondelivery we can&apos;t fix are reviewed and refunded when confirmed. Except where required by law, change-of-mind refunds aren&apos;t offered once the PDF has been delivered or accessed. See the full <Link href="/book/refund-policy">eBook Delivery and Refund Policy</Link>. Amazon purchases follow Amazon&apos;s policies.
      </>
    ),
  },
  {
    question: "Can I read some of it before I buy?",
    answer: <>Yes. The <a href="#book-sample">free 7-page sample</a> includes the title page, the full table of contents, and the opening of Chapter 1. No purchase required.</>,
  },
  {
    question: "Do I need trade experience to use this book?",
    answer: <>No. Part I is written for people starting from zero, including a full chapter on the no-experience path into the trades.</>,
  },
  {
    question: "Can I share the PDF with my class or team?",
    answer: (
      <>
        No. Each direct eBook purchase is a personal, non-transferable license, so the file can&apos;t be shared, uploaded, or redistributed. Schools and programs that need copies for a group can <a href="#schools">send a program request</a>.
      </>
    ),
  },
];

const programHighlights = [
  `${BOOK_CHAPTER_COUNT} chapters in ${BOOK_PART_COUNT} parts, from the no-experience path to a 90-Day Action Plan`,
  "Part II walks through construction, mechanical, electrical, industrial, fabrication, service, maintenance, and facilities careers",
  "Part III covers the certifications that matter, how pay really increases, side work, overtime, and specialization",
  "Written for people starting from zero, so no trade experience is required",
];

function StarRating({ rating }: { rating: NonNullable<ReaderReview["rating"]> }) {
  return (
    <p className="reader-review-rating" aria-label={`${rating} out of 5 stars`}>
      <span aria-hidden="true">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>
    </p>
  );
}

/** Renders nothing until a real, permissioned review exists in reader-reviews.ts. */
function ReaderReviews({ reviews }: { reviews: readonly ReaderReview[] }) {
  const approved = reviews.filter((review) => review.permissionToQuote === true && review.quote.trim().length > 0);
  if (approved.length === 0) return null;

  return (
    <section className="book-reviews" id="reviews" aria-labelledby="book-reviews-title">
      <div className="book-section-heading">
        <p className="section-label">/ FROM READERS</p>
        <h2 id="book-reviews-title">WHAT READERS<br /><span>ARE SAYING.</span></h2>
      </div>
      <ul className="reader-review-grid">
        {approved.map((review) => (
          <li className="reader-review" key={review.id}>
            {review.rating ? <StarRating rating={review.rating} /> : null}
            <blockquote>“{review.quote}”</blockquote>
            <p className="reader-review-credit">
              <strong>{review.name}</strong>
              <span>{review.role}{review.source === "amazon" ? " · Amazon review" : ""}</span>
            </p>
          </li>
        ))}
      </ul>
      <p className="reader-review-more">
        <a href={AMAZON_PAPERBACK.url} rel="noopener" data-cta="amazon-reviews" data-cta-location="book-reviews">Read all reviews on Amazon <span aria-hidden="true">↗</span></a>
      </p>
    </section>
  );
}

function HolidayGiftBanner() {
  return (
    <aside className="book-gift-banner" aria-label="Gift season">
      <p>
        <strong>Gift season:</strong> know someone figuring out what&apos;s next? Give them a plan. Amazon prints and ships the paperback, so order early for holiday delivery. The eBook editions are delivered digitally.
      </p>
      <a href="#availability" data-cta="book-gift" data-cta-location="book-gift-banner">Pick a format <span aria-hidden="true">↗</span></a>
    </aside>
  );
}

export default function BookPage() {
  const showGiftBanner = isHolidayGiftSeason();
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
          <a href="#sample">Free sample</a>
          <a href="#chapters">Chapters</a>
          <a href="#author">Author</a>
          <a href="#schools">Schools</a>
          <a href="#faq">FAQ</a>
          <a className="nav-cta" href="#availability" data-cta="buy-the-book" data-cta-location="book-header">Buy the Book</a>
        </nav>
      </header>

      {showGiftBanner ? <HolidayGiftBanner /> : null}

      <section className="book-hero" id="top">
        <div className="book-cover-stage">
          <div className="book-cover-glow" aria-hidden="true" />
          <Image
            className="book-cover-image"
            src="/optimized/book-cover-v3.webp"
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
            <span><strong>200+</strong><small>Skilled trades in America<a className="book-hero-source-ref" href="#trades-source" aria-label="Source for 200+ skilled trades">*</a></small></span>
            <span><strong>{BOOK_CHAPTER_COUNT}</strong><small>Chapters</small></span>
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
            Paperback and Kindle sold on Amazon. Not ready yet? <a className="text-link" href="#book-sample" data-cta="book-sample" data-cta-location="book-hero">Read 7 pages free</a>
          </p>
          {/* A fact about America (also on the front cover), not a count of what the book lists. */}
          <p className="book-hero-source" id="trades-source">
            * 200+ is a conservative count: the U.S. Department of Labor lists more than 1,000 occupations that can register an apprenticeship (<a href={TRADES_COUNT_SOURCE_URL} rel="noopener">Congressional Research Service, 2016</a>).
          </p>
        </div>
      </section>

      <section className="book-facts" aria-label="Book details">
        <div><span>Paperback</span><strong>{BOOK_PAPERBACK_PAGES} pages</strong></div>
        <div><span>Formats</span><strong>Paperback · Kindle · eBook</strong></div>
        <div><span>Starting point</span><strong>No experience required</strong></div>
        <div><span>Includes</span><strong>90-Day Action Plan</strong></div>
      </section>

      <section className="book-sample" id="sample" aria-labelledby="book-sample-heading">
        <div className="book-section-heading">
          <p className="section-label">/ READ BEFORE YOU BUY</p>
          <h2 id="book-sample-heading">START READING<br /><span>FREE.</span></h2>
        </div>
        <article className="sample-card sample-card-book" id="book-sample" aria-labelledby="book-sample-card-title">
          <div className="sample-card-intro">
            <p className="sample-card-kicker">Free book sample · 7 pages</p>
            <h3 id="book-sample-card-title">Read the opening of the book.</h3>
            <p>
              Get seven pages from the start of <em>TRADE HUSTL3: Built by Hustle, Backed by Trades</em>: the title page, the full table of contents, and the opening of Chapter 1. We&apos;ll email you the PDF link.
            </p>
          </div>
          <div className="sample-card-action">
            <ResourceForm
              resourceName="free 7-page TRADE HUSTL3 book sample"
              buttonLabel="Email me the 7-page sample"
              includeFirstName={false}
              ctaId="book-sample"
              ctaLocation="book-page-sample"
              metaLeadContentName="book_sample"
              signupInterest="Book 7-Page Sample"
              successLinkLabel="Download my 7-page sample (PDF)"
            />
            <small className="sample-consent">No purchase required. By requesting the sample, you agree to receive TRADE HUSTL3 book and career updates. Unsubscribe anytime.</small>
          </div>
        </article>
        {/* Secondary offer: same guide and signup contract as before, folded so it
            no longer competes with the book sample. */}
        <details className="sample-guide-alt">
          <summary>
            <span className="sample-card-kicker">Free 2026-2027 guide</span>
            <strong>Still choosing a trade? Get the Free Guide preview.</strong>
          </summary>
          <div className="sample-guide-alt-body">
            <p>
              Enter your email to unlock the seven-page preview of <em>TRADE HUSTL3: 10 High-Opportunity Trades — 2026-2027 Edition</em> (cover included). It includes the guide&apos;s source standard, verified power-line and HVAC profiles, national pay context, and practical next steps.
            </p>
            <SignupForm mode="sample" />
            <small className="sample-consent">By unlocking the free guide, you agree to receive TRADE HUSTL3 book and career updates. Unsubscribe anytime.</small>
          </div>
        </details>
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

      <section className="book-mindset" aria-label="From the book">
        <figure className="sample-quote">
          {/* Verbatim from Chapter 1, page 5 of the paperback. */}
          <blockquote>
            “There is a difference between having a job and having a skill. A job can give you a paycheck. <span>A skill can give you leverage.</span>”
          </blockquote>
          <figcaption>From Chapter 1, “What a Skilled Trade Really Is”</figcaption>
        </figure>
      </section>

      <section className="book-structure">
        <div className="book-structure-intro">
          <p className="section-label">/ THE ROADMAP</p>
          <h2>ENTER.<br />EARN.<br /><span>ELEVATE.</span></h2>
          <p>
            The chapters move from the foundation of skilled work to career selection, certifications, pay growth, specialization, leadership, ownership, and a practical 90-Day Action Plan.
          </p>
        </div>
        <div className="book-parts">
          {BOOK_PARTS.map((part) => (
            <article key={part.label}>
              <span>{part.label}</span>
              <div><h3>{part.title}</h3><p>{PART_SUMMARIES[part.label]}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="book-toc" id="chapters" aria-labelledby="book-toc-title">
        <div className="book-section-heading">
          <p className="section-label">/ CONTENTS</p>
          <h2 id="book-toc-title">WHAT&apos;S INSIDE<br /><span>THE BOOK.</span></h2>
        </div>
        {/* Mirrors the printed Contents page of the paperback (app/book/book-contents.ts). */}
        <div className="toc-grid">
          {BOOK_PARTS.map((part) => (
            <article className="toc-part" key={part.label} aria-labelledby={`toc-${part.label.replace(" ", "-").toLowerCase()}`}>
              <h3 className="toc-part-heading" id={`toc-${part.label.replace(" ", "-").toLowerCase()}`}>
                <span>{part.label}</span>
                <strong>{part.title}</strong>
              </h3>
              <ol className="toc-chapters">
                {part.chapters.map((chapter) => (
                  <li key={chapter.number}>
                    <span className="toc-chapter-number">{chapter.number}.</span>
                    <span className="toc-chapter-title">{chapter.title}</span>
                    <span className="toc-chapter-page" aria-label={`page ${chapter.page}`}>{chapter.page}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
        <p className="toc-back-matter">
          {BOOK_BACK_MATTER.map((item) => (
            <span key={item.title}>{item.title} <b aria-label={`page ${item.page}`}>{item.page}</b></span>
          ))}
          <small>Page numbers are from the {BOOK_PAPERBACK_PAGES}-page paperback.</small>
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
        <div className="book-schools-copy">
          <p className="section-label">/ FOR SCHOOLS &amp; PROGRAMS</p>
          <h2 id="book-schools-title">BRING IT TO<br /><span>YOUR PROGRAM.</span></h2>
          <p>
            High schools, trade schools, Job Corps centers, workforce programs, apprenticeship programs, and employers: if you want copies of TRADE HUSTL3 for your students, trainees, or new hires, send a request and we&apos;ll reply with the options available for your order.
          </p>
          <h3>What your program gets</h3>
          <ul className="book-schools-highlights">
            {programHighlights.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <dl className="book-schools-details">
            <div><dt>Formats</dt><dd>Paperback or direct eBook (PDF). Each PDF is a personal license, so group copies go through a program request.</dd></div>
            <div><dt>Current KDP ISBN</dt><dd>{BOOK_PAPERBACK_ISBN}</dd></div>
          </dl>
          <p className="book-schools-sample">
            Reviewing it first? <a className="text-link" href="#book-sample" data-cta="book-sample" data-cta-location="book-schools">Read the free 7-page sample</a>
          </p>
        </div>
        <div className="book-schools-form">
          <ProgramInquiryForm fallbackEmail={BOOK_PARTNERSHIPS_EMAIL} />
          <p className="book-schools-email">
            Prefer email?{" "}
            <a
              href={SCHOOLS_MAILTO}
              data-cta="schools-inquiry"
              data-cta-location="book-schools"
            >
              {BOOK_PARTNERSHIPS_EMAIL}
            </a>
          </p>
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
            Zachary Ellis, known as Mr. HUSTL3, is an HVAC and facilities maintenance professional with more than a decade of hands-on experience solving real problems in the field. He holds EPA 608 Universal certification, an HVAC certification, NCRR, and OSHA 10. His background includes residential and commercial systems, preventive maintenance, facilities operations, team leadership, vendor coordination, and large-scale equipment.
          </p>
          <p>
            TRADE HUSTL3 was born from real work, real lessons, and a clear purpose: help the next generation enter skilled trades, earn through useful ability, and elevate into leadership, ownership, and long-term opportunity.
          </p>
        </div>
      </section>

      <ReaderReviews reviews={READER_REVIEWS} />

      <section className="book-faq" id="faq" aria-labelledby="book-faq-title">
        <div className="book-section-heading">
          <p className="section-label">/ QUESTIONS</p>
          <h2 id="book-faq-title">BEFORE YOU<br /><span>BUY.</span></h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq) => (
            <details className="faq-item" key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="book-availability" id="availability" aria-labelledby="final-cta-title">
        <p className="section-label">/ AVAILABILITY</p>
        <h2 id="final-cta-title">PICK YOUR FORMAT.<br /><span>AVAILABLE NOW.</span></h2>
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

      {/* Mobile-only quick-buy bar. CtaAnalytics shows it once the hero is
          scrolled past and hides it while the availability section is visible. */}
      <div className="book-sticky-buy" data-location="mobile_sticky" aria-hidden="true">
        <a
          className="button button-primary"
          href={AMAZON_PAPERBACK.url}
          rel="noopener"
          data-cta="amazon-paperback"
          data-cta-location="book-mobile-sticky"
        >
          Paperback ${AMAZON_PAPERBACK.price} <span aria-hidden="true">↗</span>
        </a>
        <a className="book-sticky-formats" href="#availability" data-cta="book-formats" data-cta-location="book-mobile-sticky">
          All formats
        </a>
      </div>

      <footer>
        <div className="footer-brand"><div className="wordmark">TRADE HUSTL<span>3</span></div><p>BUILT BY HUSTL3. BACKED BY TRADES.</p><SocialLinks /></div>
        <div className="footer-links"><Link href="/">Home</Link><a href="#sample">Free sample</a><a href="#chapters">Chapters</a><a href="#author">Author</a><a href="#faq">FAQ</a><a href="#availability">Buy the Book</a><a href="#schools">Schools &amp; programs</a><a href={`mailto:${BOOK_PARTNERSHIPS_EMAIL}`}>Partnerships</a></div>
        <div className="footer-legal"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/book/refund-policy">eBook policy</Link><Link href="/data-deletion">Data requests</Link><Link href="/contact">Support</Link></div>
        <p className="copyright">© 2026 TRADE HUSTL3. ALL GRIT RESERVED.</p>
      </footer>
    </main>
  );
}
