/**
 * Single source of truth for where the TRADE HUSTL3 book can be bought.
 *
 * Amazon details were verified against the live Amazon.com listings on
 * 2026-11-03 (product pages for both ASINs). If a price changes in KDP,
 * update it here: the book page copy, buttons and structured data all read
 * from these values.
 */

export const BOOK_PAPERBACK_ISBN = "9798193043355";
/**
 * Page count of the final paperback interior uploaded to KDP on 2026-11-03
 * (TRADE_HUSTL3_Interior_6x9.pdf, 486 pages, MD5 a43700cf6521764ad2dc16178debbf3d).
 */
export const BOOK_PAPERBACK_PAGES = 486;

export const AMAZON_PAPERBACK = {
  asin: "B0HFQ2ZNJN",
  url: "https://www.amazon.com/dp/B0HFQ2ZNJN",
  price: "24.99",
} as const;

export const AMAZON_KINDLE = {
  asin: "B0HPZ2KQ1R",
  url: "https://www.amazon.com/dp/B0HPZ2KQ1R",
  price: "9.99",
} as const;

/** Direct PDF eBook sold through Stripe and delivered by worker/ebook-stripe.ts. */
export const DIRECT_EBOOK = {
  url: "https://buy.stripe.com/4gM5kwaQ96EscGf2uKbfO02",
  price: "9.99",
} as const;

export const BOOK_PARTNERSHIPS_EMAIL = "partners@tradehustl3.com";
