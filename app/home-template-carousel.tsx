"use client";

import { useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import { PICKER_TEMPLATES, TEMPLATE_LABELS } from "../worker/resume-templates";
import { carouselStep, swipeDirection } from "./resume-builder/review/style-carousel-logic";
import styles from "./home-template-carousel.module.css";

/** The looks a new customer can pick, in the same order as the builder's style carousel. */
const SLIDES = PICKER_TEMPLATES;

/**
 * Homepage showcase of the offered resume styles. Each slide is the same sample
 * image the builder shows before a customer's first build. No autoplay: the
 * visitor moves between slides with the arrows, dots, arrow keys or a swipe.
 */
export function HomeTemplateCarousel({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const look = SLIDES[index];
  const label = TEMPLATE_LABELS[look];

  function go(delta: number) {
    setIndex((value) => carouselStep(value, delta, SLIDES.length));
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
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
    <figure className={`${styles.carousel} ${className ?? ""}`} role="region" aria-roledescription="carousel" aria-label="Resume style examples" onKeyDown={onKeyDown}>
      <figcaption className={styles.caption}>
        <strong>Resume styles</strong><span>Sample resumes · Illustrative candidates</span>
      </figcaption>

      <div className={styles.bar}>
        <button type="button" className={styles.arrow} aria-label="Previous style" disabled={index === 0} onClick={() => go(-1)}>
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className={styles.title} aria-live="polite">
          <strong>{label.label}</strong>
          <span>{label.tagline}</span>
          <small>Style {index + 1} of {SLIDES.length}</small>
        </div>
        <button type="button" className={styles.arrow} aria-label="Next style" disabled={index === SLIDES.length - 1} onClick={() => go(1)}>
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><path d="M7.5 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      <div className={styles.viewport} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={() => { touchStart.current = null; }}>
        <div className={styles.track} style={{ transform: `translateX(-${index * 100}%)` }}>
          {SLIDES.map((key, slide) => (
            <div key={key} className={styles.slide} role="group" aria-roledescription="slide" aria-label={`${slide + 1} of ${SLIDES.length}: ${TEMPLATE_LABELS[key].label}`} aria-hidden={slide !== index}>
              <div className={styles.paper}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/resume-templates/${key}.png`} width={371} height={480} loading={slide === 0 ? "eager" : "lazy"} decoding="async"
                  alt={`Sample resume in the ${TEMPLATE_LABELS[key].label} style for an illustrative candidate`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.dots}>
        {SLIDES.map((key, slide) => (
          <button type="button" key={key} className={`${styles.dot}${slide === index ? ` ${styles.dotOn}` : ""}`}
            aria-label={`Show the ${TEMPLATE_LABELS[key].label} style`} aria-current={slide === index ? "true" : undefined}
            onClick={() => setIndex(slide)}><span /></button>
        ))}
      </div>
    </figure>
  );
}
