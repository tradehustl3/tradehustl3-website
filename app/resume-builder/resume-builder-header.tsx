/* eslint-disable @next/next/no-html-link-for-pages -- Resume Builder exits must work without the client router */
import type { ReactNode } from "react";
import Image from "next/image";

/**
 * Shared Resume Builder header. Every Resume Builder route renders this so the
 * approved TRADE HUSTL3 Resume Builder logo, wordmark, and product label stay
 * identical across the journey and the trade landing pages.
 *
 * `action` replaces the default "Exit builder" link in the trailing slot — the
 * trade landing pages pass a "Build my resume" CTA there instead.
 */
export function ResumeBuilderHeader({ action }: { action?: ReactNode } = {}) {
  return (
    <header className="rb-header">
      <div className="rb-header-inner">
        <a className="rb-brand" href="/" aria-label="TRADE HUSTL3 home">
          <Image
            src="/optimized/resume-builder-logo-header.webp"
            alt="TRADE HUSTL3 Resume Builder logo"
            width={500}
            height={410}
            priority
          />
          <span className="rb-brand-text" aria-hidden="true">
            <strong>TRADE HUSTL<span>3</span></strong>
            <small>Resume Builder</small>
          </span>
        </a>
        <nav className="rb-header-nav" aria-label="Resume Builder">
          {action ?? <a className="rb-exit" href="/">Exit builder</a>}
        </nav>
      </div>
    </header>
  );
}
