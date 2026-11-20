import type { Metadata } from "next";
import { CtaAnalytics } from "../cta-analytics";
import { ConversionCta } from "../conversion-cta";
import { PolicyPage, PolicySection } from "../policy-page";
import { SOCIAL_PROFILE_ORDER, SOCIAL_PROFILES } from "../social-profiles";
import styles from "./links.module.css";

/**
 * /links is the page the printed TRADE HUSTL3 QR code opens. The code encodes
 * https://tradehustl3.com/links?utm_source=qr&utm_medium=print&utm_campaign=links_qr,
 * so this path must stay stable: change what the page links to, never the URL.
 *
 * It reuses the shared content shell (PolicyPage) so the header, footer, fonts
 * and colors match /contact and /subscribed.
 */
const PAGE_DESCRIPTION = "Everything TRADE HUSTL3 in one place: the Resume Builder, the book, free trade guides, and every place to follow us.";

export const metadata: Metadata = {
  title: { absolute: "TRADE HUSTL3 Links | Resume Builder, Book, and Socials" },
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/links" },
  // A hand-off page for QR scans; the pages it links to are the ones that should rank.
  robots: { index: false, follow: true },
};

const START_LINKS = [
  {
    item: "resume_builder",
    href: "/#resume-start",
    title: "Build your skilled-trades resume",
    detail: "Free preview with just your email. PDF and Word files for $9.99.",
  },
  {
    item: "the_book",
    href: "/book",
    title: "Get the TRADE HUSTL3 book",
    detail: "Paperback and Kindle on Amazon, or the PDF eBook direct.",
  },
  {
    item: "book_sample",
    href: "/book/sample",
    title: "Read the free book sample",
    detail: "Seven free pages. Enter your email to open them.",
  },
  {
    item: "resource_center",
    href: "/resources",
    title: "Free skilled-trades resource center",
    detail: "Trade guides, certifications, and licenses with official sources.",
  },
] as const;

export default function LinksPage() {
  return (
    <PolicyPage eyebrow="ENTER. EARN. ELEVATE." title="START HERE" summary={PAGE_DESCRIPTION} showUpdated={false}>
      <CtaAnalytics />
      <PolicySection title="Tools and free guides">
        <nav className={styles.group} aria-label="TRADE HUSTL3 tools and free guides">
          <ul className={styles.links}>
            {START_LINKS.map((link) => (
              <li key={link.item}>
                <ConversionCta
                  href={link.href}
                  variant="resource"
                  className={styles.linkButton}
                  data-analytics-event="cta_click"
                  data-location="links_page"
                  data-destination={link.href}
                  data-item={link.item}
                >
                  <span className={styles.linkText}>
                    <strong>{link.title}</strong>
                    <small>{link.detail}</small>
                  </span>
                </ConversionCta>
              </li>
            ))}
          </ul>
        </nav>
      </PolicySection>
      <PolicySection title="Follow TRADE HUSTL3">
        <nav className={styles.group} aria-label="TRADE HUSTL3 social media">
          <ul className={styles.socials}>
            {SOCIAL_PROFILE_ORDER.map((id) => {
              const profile = SOCIAL_PROFILES[id];
              return (
                <li key={id}>
                  <ConversionCta
                    href={profile.href}
                    variant="secondary"
                    className={styles.socialButton}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-analytics-event="cta_click"
                    data-location="links_page_social"
                    data-destination={profile.href}
                    data-item={`social_${id}`}
                  >
                    {profile.label}
                  </ConversionCta>
                </li>
              );
            })}
          </ul>
        </nav>
      </PolicySection>
    </PolicyPage>
  );
}
