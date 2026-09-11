"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./footer-enhancements.module.css";

const socials = [
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61593457675674", icon: "facebook" },
  { label: "Instagram", href: "https://www.instagram.com/tradehustl3/", icon: "instagram" },
  { label: "TikTok", href: "https://www.tiktok.com/@da.maintenance.ma5", icon: "tiktok" },
  { label: "YouTube", href: "https://www.youtube.com/@tradehustl3", icon: "youtube" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/zachary-ellis-a797193ab", icon: "linkedin" },
  { label: "X", href: "https://x.com/maintenancmt1k", icon: "x" },
  { label: "GitHub", href: "https://github.com/tradehustl3", icon: "github" },
] as const;

function SocialIcon({ type }: { type: (typeof socials)[number]["icon"] }) {
  if (type === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.2" cy="6.8" r="1" className={styles.fillDot} /></svg>
    );
  }
  if (type === "youtube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="3" /><path d="M10 9.2 15.2 12 10 14.8Z" className={styles.fillDot} /></svg>
    );
  }
  if (type === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6.5" cy="7" r="1.5" className={styles.fillDot} /><path d="M5 10v8M10 10v8m0-4.6c0-2.4 5-3.4 5 1V18M15 10v8" /></svg>
    );
  }
  if (type === "facebook") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h3V2.5c-.5-.1-1.7-.2-3-.2-2.8 0-4.7 1.7-4.7 4.8V10H6v3.5h3.3V22h4v-8.5h3.3L17 10h-3.7V7.5c0-1 .3-1.8.7-2.5Z" className={styles.fillDot} /></svg>;
  }
  if (type === "tiktok") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4c.7 2 2.1 3.3 4 3.7v3.2a9 9 0 0 1-4-1.3v5.2a5.1 5.1 0 1 1-4.4-5V13a2 2 0 1 0 1.4 1.9V4Z" className={styles.fillDot} /></svg>;
  }
  if (type === "github") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-2.8 17.5c.4.1.5-.2.5-.4v-1.7c-2.3.5-2.8-1-2.8-1-.4-1-.9-1.3-.9-1.3-.8-.5.1-.5.1-.5.8.1 1.3.9 1.3.9.8 1.3 2 1 2.5.8.1-.6.3-1 .6-1.3-1.8-.2-3.7-.9-3.7-4 0-.9.3-1.6.8-2.2-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.3.8a8 8 0 0 1 4.2-.6c.7 0 1.4.1 2.1.3 1.6-1 2.3-.8 2.3-.8.5 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.2 0 3.1-1.9 3.8-3.7 4 .3.3.6.8.6 1.6v2.3c0 .2.1.5.5.4A9 9 0 0 0 12 3Z" className={styles.fillDot} /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4 19 20M19 4 5 20" /></svg>;
}

export function FooterEnhancements() {
  const pathname = usePathname();
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (pathname !== "/") {
      setHost(null);
      return;
    }
    setHost(document.querySelector("footer"));
  }, [pathname]);

  if (pathname !== "/" || !host) return null;

  return createPortal(
    <div className={styles.wrap}>
      <div className={styles.guideBlock}>
        <div>
          <span className={styles.kicker}>FREE CAREER GUIDE</span>
          <strong>Get the free 7-page Top 10 Trades guide.</strong>
          <p>Compare 10 skilled-trade paths for 2026–2027 and choose your next move.</p>
        </div>
        <Link className={styles.guideButton} href="/top-10-trades#get-guide">
          Get the Free 7-Page Guide <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className={styles.socialBlock}>
        <div>
          <span className={styles.kicker}>FOLLOW TRADE HUSTL3</span>
          <p>Stay connected for skilled-trades career, resume, and field content.</p>
        </div>
        <nav className={styles.socials} aria-label="TRADE HUSTL3 social media links">
          {socials.map((social) => (
            <a key={social.label} href={social.href} target="_blank" rel="noreferrer" aria-label={social.label} title={social.label}>
              <SocialIcon type={social.icon} />
            </a>
          ))}
        </nav>
      </div>
    </div>,
    host,
  );
}
