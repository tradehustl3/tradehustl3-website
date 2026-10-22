import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, PolicySection, SUPPORT_EMAIL } from "./policy-page";

const SUMMARY = "That page moved or never existed. Here are the fastest ways back to the resources, guides, and resume tools.";

// The framework already emits <meta name="robots" content="noindex"> on every
// not-found response. Clearing the root layout's `robots` (index, follow) here
// leaves that single noindex tag, and `alternates: null` keeps any inherited
// canonical off the error page (Oct 22, 2026 audit: conflicting 404 signals).
export const metadata: Metadata = {
  title: "Page Not Found",
  description: SUMMARY,
  robots: null,
  alternates: null,
};

const DESTINATIONS: { href: string; label: string; note: string }[] = [
  { href: "/", label: "TRADE HUSTL3 home", note: "Start at the skilled-trades hub." },
  { href: "/#resume-start", label: "Resume Builder", note: "Build a free trade resume preview." },
  { href: "/resources", label: "Resource Center", note: "Trade families, careers, and job-outlook data." },
  { href: "/resources/certifications", label: "Certifications and licenses", note: "EPA 608, OSHA 10/30, CDL, and more." },
  { href: "/top-10-trades", label: "Free Top 10 Trades guide", note: "Ten high-opportunity trades for 2026–2027." },
  { href: "/book", label: "The Book", note: "TRADE HUSTL3: the skilled-trades career guide." },
];

export default function NotFound() {
  return (
    <PolicyPage eyebrow="404" title="PAGE NOT FOUND" summary={SUMMARY} updated={null}>
      <PolicySection title="Where to go next">
        <ul>
          {DESTINATIONS.map((destination) => (
            <li key={destination.href}>
              <Link href={destination.href}>{destination.label}</Link> — {destination.note}
            </li>
          ))}
        </ul>
      </PolicySection>
      <PolicySection title="Followed a broken link?">
        <p>
          Let us know where you found it at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we will fix it.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
