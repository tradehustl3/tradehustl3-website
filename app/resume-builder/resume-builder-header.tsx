/* eslint-disable @next/next/no-html-link-for-pages -- Resume Builder exits must work without the client router */
import type { ReactNode } from "react";
import { BrandLockup } from "../brand-lockup";

/**
 * Shared Resume Builder header. Every Resume Builder route renders this so the
 * TH3 brand lockup (logo + ENTER • EARN • ELEVATE) and the "Resume Builder"
 * product label stay identical across the journey and the trade landing pages
 * (approved Oct 21 2026: TH3 + Resume Builder label).
 *
 * `action` replaces the default "Exit builder" link in the trailing slot — the
 * trade landing pages pass a "Build my resume" CTA there instead.
 */
export function ResumeBuilderHeader({ action }: { action?: ReactNode } = {}) {
  return (
    <header className="rb-header">
      <div className="rb-header-inner">
        <a className="rb-brand" href="/" aria-label="TRADE HUSTL3 home">
          <BrandLockup size="sm" />
          <span className="rb-product-label">Resume Builder</span>
        </a>
        <nav className="rb-header-nav" aria-label="Resume Builder">
          {action ?? <a className="rb-exit" href="/">Exit builder</a>}
        </nav>
      </div>
    </header>
  );
}
