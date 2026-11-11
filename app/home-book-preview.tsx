'use client';

import { useEffect, useRef, useState } from 'react';
import { AMAZON_PAPERBACK, AMAZON_KINDLE, DIRECT_EBOOK } from './book/editions';
import { ResourceForm } from './resource-form';
import { ConversionCta } from './conversion-cta';
import styles from './home-storefront.module.css';

/** One homepage preview action; the existing resource form owns fulfillment. */
export function HomeBookPreview() {
  const [open, setOpen] = useState(false);
  const formArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function revealFromHash() {
      if (window.location.hash === '#book-preview') setOpen(true);
    }
    function revealFromLink(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest('a[href="#book-preview"]')) setOpen(true);
    }
    revealFromHash();
    window.addEventListener('hashchange', revealFromHash);
    document.addEventListener('click', revealFromLink);
    return () => {
      window.removeEventListener('hashchange', revealFromHash);
      document.removeEventListener('click', revealFromLink);
    };
  }, []);

  useEffect(() => {
    if (open) formArea.current?.querySelector<HTMLInputElement>('input[type="email"]')?.focus({ preventScroll: true });
  }, [open]);

  return (
    <div className={styles.bookPreview} id="book-preview" tabIndex={-1}>
      <p className={styles.bookAccessNote}>Email address required for the free seven-page sample.</p>
      {!open && <ConversionCta type="button" data-primary-cta="true" onClick={() => setOpen(true)}
        aria-expanded={false} aria-controls="homepage-book-email"
        data-analytics-event="cta_click" data-location="homepage_book_hero" data-item="book_sample"
        data-destination="book_preview_form">Get Your 7 FREE Pages</ConversionCta>}
      <div id="homepage-book-email" ref={formArea} hidden={!open} className={styles.form}>
        <p className={styles.bookPreviewDescription}>Read the table of contents and the start of Chapter 1 in the free seven-page preview.</p>
        <ResourceForm resourceName="7-page book preview" buttonLabel="Get Your 7 FREE Pages" conversion marketingConsent={false}
          ctaId="book-sample" ctaLocation="homepage_book_preview" metaLeadContentName="book_sample" />
        <p className={styles.finePrint}>Open your sample after submission. We’ll also email the link. To receive optional marketing updates, use Join the Movement below.</p>
      </div>
      <div className={styles.bookFormats} aria-label="Buy the book">
        {[["Paperback", AMAZON_PAPERBACK.url, "amazon-paperback"], ["Kindle", AMAZON_KINDLE.url, "amazon-kindle"], ["Direct PDF", DIRECT_EBOOK.url, "direct-ebook"]].map(([label, href, cta], index) => (
          <span key={cta}>
            {index > 0 && <span className={styles.formatDivider} aria-hidden="true">|</span>}
            <ConversionCta variant="format" href={href} rel="noopener" data-cta={cta} data-item={cta} data-cta-location="homepage_book_formats">{label}</ConversionCta>
          </span>
        ))}
      </div>
    </div>
  );
}
