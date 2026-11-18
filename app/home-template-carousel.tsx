"use client";

import { useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import { PICKER_TEMPLATES, TEMPLATE_LABELS } from "../worker/resume-templates";
import { carouselStep, swipeDirection } from "./resume-builder/review/style-carousel-logic";
import styles from "./home-template-carousel.module.css";

type Slide = { key: string; label: string; tagline: string; src: string; width: number; height: number; alt: string };

/**
 * The looks a new customer can pick, in the builder's style-carousel order, then the
 * matching cover letter that comes with every resume (it follows the chosen look).
 */
const SLIDES: readonly Slide[] = [
  ...PICKER_TEMPLATES.map((key) => ({
    key,
    label: TEMPLATE_LABELS[key].label,
    tagline: TEMPLATE_LABELS[key].tagline,
    src: `/resume-templates/${key}.png`,
    width: 371,
    height: 480,
    alt: `Sample resume in the ${TEMPLATE_LABELS[key].label} style for an illustrative candidate`,
  })),
  {
    key: "cover-letter",
    label: "Matching Cover Letter",
    tagline: "Included with your resume. Styled to match your look.",
    src: "/sample-hvac-cover-letter.webp",
    width: 816,
    height: 1056,
    alt: "Sample matching cover letter for an illustrative candidate applying for an HVAC maintenance technician opening",
  },
];

/**
 * Homepage showcase of the offered resume styles plus the matching cover letter.
 * Resume slides use the same sample images the builder shows before a first build. No autoplay: the
 * visitor moves between slides with the arrows, dots, arrow keys or a swipe.
 */
export function HomeTemplateCarousel({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const current = SLIDES[index];

  function go(delta: number) {
    setIndex((value) => carouselStep(value, delta, SLIDES.length));
  }

  /** Arrow keys on any carousel control move between slides. */
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowLeft") { event.preventDefault(); go(-1); }
    else if (event.key === "ArrowRight") { event.preventDefault(); go(1); }
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches.length === 1 ? event.touches[0] : null;
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;
    const swipe = swipeDirection(touch.clientX - start.x, touch.clientY - start.y);
    if (swipe) go(swipe);
  }

  return (
    <figure className={`${styles.carousel} ${className ?? ""}`} role="region" aria-roledescription="carousel" aria-label="Resume style examples">
      <figcaption className={styles.caption}>
        <strong>Resume styles &amp; cover letter</strong><span>Sample documents · Illustrative candidates</span>
      </figcaption>

      <div className={styles.bar}>
        <button type="button" className={styles.arrow} aria-label="Previous example" disabled={index === 0} onClick={() => go(-1)} onKeyDown={onKeyDown}>
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className={styles.title} aria-live="polite">
          <strong>{current.label}</strong>
          <span>{current.tagline}</span>
          <small>{index + 1} of {SLIDES.length}</small>
        </div>
        <button type="button" className={styles.arrow} aria-label="Next example" disabled={index === SLIDES.length - 1} onClick={() => go(1)} onKeyDown={onKeyDown}>
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><path d="M7.5 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      <div className={styles.viewport} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={() => { touchStart.current = null; }}>
        <div className={styles.track} style={{ transform: `translateX(-${index * 100}%)` }}>
          {SLIDES.map((item, slide) => (
            <div key={item.key} className={styles.slide} role="group" aria-roledescription="slide" aria-label={`${slide + 1} of ${SLIDES.length}: ${item.label}`} aria-hidden={slide !== index}>
              <div className={styles.paper}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} width={item.width} height={item.height} loading={slide === 0 ? "eager" : "lazy"} decoding="async" alt={item.alt} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.dots}>
        {SLIDES.map((item, slide) => (
          <button type="button" key={item.key} className={`${styles.dot}${slide === index ? ` ${styles.dotOn}` : ""}`}
            aria-label={`Show the ${item.label}${item.key === "cover-letter" ? "" : " style"}`} aria-current={slide === index ? "true" : undefined}
            onClick={() => setIndex(slide)} onKeyDown={onKeyDown}><span /></button>
        ))}
      </div>
    </figure>
  );
}
