"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import styles from "./home-first-impression.module.css";

const LINKS = [
  ["Explore Trades", "/resume-examples"],
  ["Certifications", "/resources/certifications"],
  ["Resources", "/resources"],
  ["The Book", "/book"],
] as const;

/** One red accent follows the hovered or keyboard-focused navigation link. */
export function HomeNavigation() {
  const group = useRef<HTMLDivElement>(null);
  const [accent, setAccent] = useState<{ x: number; y: number; width: number } | null>(null);

  function follow(target: EventTarget | null) {
    const link = target instanceof Element ? target.closest("a") : null;
    if (!link || !group.current?.contains(link)) {
      setAccent(null);
      return;
    }
    const parent = group.current.getBoundingClientRect();
    const bounds = link.getBoundingClientRect();
    setAccent({ x: bounds.left - parent.left, y: bounds.bottom - parent.top - 4, width: bounds.width });
  }

  return (
    <nav className={styles.nav} aria-label="Primary navigation">
      <div
        className={styles.navLinks}
        ref={group}
        data-tracking={accent !== null}
        onPointerOver={(event) => follow(event.target)}
        onPointerLeave={() => follow(document.activeElement)}
        onFocus={(event) => follow(event.target)}
        onBlur={(event) => follow(event.relatedTarget)}
      >
        {LINKS.map(([label, href]) => <Link key={href} className={styles.navLink} href={href}>{label}</Link>)}
        <span
          className={styles.navIndicator}
          aria-hidden="true"
          style={{
            width: accent?.width ?? 0,
            transform: `translate(${accent?.x ?? 0}px, ${accent?.y ?? 0}px)`,
            opacity: accent ? 1 : 0,
          }}
        />
      </div>
      <Link
        href="#resume-start"
        className={styles.headerCta}
        data-analytics-event="cta_click"
        data-location="sticky_header"
        data-destination="#resume-start"
      >Build my free preview</Link>
    </nav>
  );
}
