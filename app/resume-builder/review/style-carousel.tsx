"use client";

import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { TEMPLATE_LABELS, type TemplateKey } from "../../../worker/resume-templates";
import { CAROUSEL_SETTLE_MS, carouselStep, shownLook, swipeDirection } from "./style-carousel-logic";

type Props = {
  /** Slides, in order. */
  looks: readonly TemplateKey[];
  /** The look saved on the resume. */
  current: TemplateKey;
  /** A look or design change is being saved. */
  busy: boolean;
  /** Something else owns the workspace (an AI run); swiping is paused. */
  disabled: boolean;
  /** Applies a look. Resolves false when it could not be saved. */
  onPick: (look: TemplateKey) => Promise<boolean>;
  /**
   * The customer's own preview in the saved look. Without it (before the first
   * build) the carousel shows the sample resume for each look.
   */
  children?: ReactNode;
};

/** True when the touch began on something that itself scrolls sideways (a zoomed page). */
function startedOnSidewaysScroller(target: EventTarget | null): boolean {
  const pages = target instanceof Element ? target.closest(".rb-pdf-pages") : null;
  return Boolean(pages && pages.scrollWidth > pages.clientWidth + 4);
}

/**
 * One resume at a time: swipe, use the arrows, or tap a dot to move between looks.
 * The look in front is the one saved to the resume; changing it is free and never
 * touches the wording.
 */
export function StyleCarousel({ looks, current, busy, disabled, onPick, children }: Props) {
  // The look the customer moved to that is not saved yet.
  const [pending, setPending] = useState<TemplateKey | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  // The parent passes a new function on every render; the timer below must not restart for that.
  const pick = useRef(onPick);
  useEffect(() => { pick.current = onPick; }, [onPick]);
  const shown = shownLook(pending, current, looks);
  const index = Math.max(0, looks.indexOf(shown));
  const waitingToApply = shown !== current;
  const live = Boolean(children) && !waitingToApply && !busy;

  // Apply the shown look once swiping settles. Swipes made while a save is running
  // are kept and applied when it finishes, so the last look shown always wins.
  useEffect(() => {
    if (!waitingToApply || busy || disabled) return;
    const look = shown;
    const timer = setTimeout(() => {
      void pick.current(look).then((saved) => {
        if (!saved) setPending((value) => (value === look ? null : value));
      });
    }, CAROUSEL_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [waitingToApply, shown, busy, disabled]);

  function go(delta: number) {
    if (disabled) return;
    const next = carouselStep(index, delta, looks.length);
    if (next === index) return;
    setDirection(delta < 0 ? -1 : 1);
    setPending(looks[next]);
  }

  function show(look: TemplateKey) {
    if (disabled || look === shown) return;
    setDirection(looks.indexOf(look) < index ? -1 : 1);
    setPending(look);
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches.length === 1 ? event.touches[0] : null;
    touchStart.current = touch && !startedOnSidewaysScroller(event.target) ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;
    const swipe = swipeDirection(touch.clientX - start.x, touch.clientY - start.y);
    if (swipe) go(swipe);
  }

  const label = TEMPLATE_LABELS[shown];
  const status = !children
    ? "Sample resume"
    : live
      ? "Your resume"
      : "Sample shown · updating your resume…";

  return (
    <div className="rb-carousel" role="group" aria-roledescription="carousel" aria-label="Resume style">
      <div className="rb-carousel-bar">
        <button type="button" className="rb-carousel-arrow" aria-label="Previous style" disabled={disabled || index === 0} onClick={() => go(-1)}>
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="rb-carousel-title" aria-live="polite">
          <strong>{label.label}</strong>
          <span>{label.tagline}</span>
          <small>Style {index + 1} of {looks.length} · switching is free</small>
        </div>
        <button type="button" className="rb-carousel-arrow" aria-label="Next style" disabled={disabled || index === looks.length - 1} onClick={() => go(1)}>
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><path d="M7.5 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      <div className="rb-carousel-dots">
        {looks.map((look) => (
          <button
            type="button"
            key={look}
            className={`rb-carousel-dot${look === shown ? " rb-carousel-dot-on" : ""}`}
            aria-label={`Show the ${TEMPLATE_LABELS[look].label} style`}
            aria-current={look === shown ? "true" : undefined}
            disabled={disabled}
            onClick={() => show(look)}
          ><span /></button>
        ))}
      </div>

      <div className="rb-carousel-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={() => { touchStart.current = null; }}>
        <p className="rb-carousel-status" role="status"><span className={`rb-status-dot${live ? "" : " rb-status-dot-wait"}`} />{status}</p>
        {live ? children : (
          <div className={`rb-carousel-sample rb-carousel-sample-${direction === 1 ? "next" : "prev"}`} key={shown}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/resume-templates/${shown}.png`} width={371} height={480} alt={`Sample resume in the ${label.label} style`} />
          </div>
        )}
      </div>
    </div>
  );
}
