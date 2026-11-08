import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, PolicySection, SUPPORT_EMAIL } from "../policy-page";

const PAGE_DESCRIPTION = "Your email is confirmed. You're on the TRADE HUSTL3 list for skilled-trades career updates.";

/** Landing page for Brevo's double opt-in redirect (see DOUBLE_OPT_IN_REDIRECT_URL
 * in worker/index.ts). Reached only from the confirmation email, so it is kept
 * out of search results and the sitemap. */
export const metadata: Metadata = {
  title: { absolute: "You're Confirmed | TRADE HUSTL3" },
  description: PAGE_DESCRIPTION,
  robots: { index: false, follow: false },
};

export default function SubscribedPage() {
  return (
    <PolicyPage eyebrow="ENTER. EARN. ELEVATE." title="YOU'RE CONFIRMED" summary={PAGE_DESCRIPTION}>
      <PolicySection title="What happens next">
        <p>Watch your inbox for practical skilled-trades guidance from TRADE HUSTL3. You can unsubscribe from any email at any time.</p>
      </PolicySection>
      <PolicySection title="Keep moving">
        <ul>
          <li><Link href="/book">TRADE HUSTL3: the book</Link></li>
          <li><Link href="/resume-builder">Build your skilled-trades resume</Link></li>
          <li><Link href="/resources">Free skilled-trades resource center</Link></li>
        </ul>
      </PolicySection>
      <PolicySection title="Need help?">
        <p>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
      </PolicySection>
    </PolicyPage>
  );
}
