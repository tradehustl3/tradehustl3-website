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
      <a className="rb-brand" href="/" aria-label="TRADE HUSTL3 home">
        <Image src="/resume-builder-logo-llc.png" alt="TRADE HUSTL3 LLC Resume Builder logo" width={132} height={88} priority />
        <span>TRADE HUSTL<span>3</span></span>
      </a>
      <div className="rb-header-product">
        <span>Career tools</span>
        <strong>Resume Builder</strong>
      </div>
      {action ?? <a className="rb-exit" href="/">Exit builder</a>}
    </header>
  );
}
