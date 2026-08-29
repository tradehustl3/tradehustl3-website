import Link from "next/link";
import type { ReactNode } from "react";
import { SUPPORT_EMAIL } from "../shared/customer-config";
import "./page-shell.css";

export const LEGAL_UPDATED = "August 25, 2026";
export { SUPPORT_EMAIL };

export function PolicyPage({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <main className="policy-page">
      <header className="policy-header">
        <Link className="policy-brand" href="/">TRADE HUSTL<span>3</span></Link>
        <nav aria-label="Policy navigation">
          <Link href="/book">The Book</Link>
          <Link href="/resume-builder">Resume Builder</Link>
          <Link href="/contact">Support</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </nav>
      </header>

      <section className="policy-hero">
        <p className="section-label">/ {eyebrow}</p>
        <h1>{title}</h1>
        <p>{summary}</p>
        <small>Last updated {LEGAL_UPDATED}</small>
      </section>

      <article className="policy-content">{children}</article>

      <footer className="policy-footer">
        <div><strong>TRADE HUSTL3 LLC</strong><p>Atlanta, Georgia · Built by Hustle. Backed by Trades.</p></div>
        <div className="policy-footer-links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/resume-builder/refund-policy">Resume refunds</Link>
          <Link href="/book/refund-policy">eBook policy</Link>
          <Link href="/data-deletion">Data requests</Link>
          <Link href="/resume-builder/ai-disclosure">AI disclosure</Link>
          <Link href="/contact">Support</Link>
        </div>
        <small>© 2026 TRADE HUSTL3 LLC. All grit reserved.</small>
      </footer>
    </main>
  );
}

export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2>{title}</h2>{children}</section>;
}
