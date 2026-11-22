import type { Metadata } from "next";
import Link from "next/link";
import { ResourceForm } from "../resource-form";
import { SocialLinks } from "../social-links";
import { SITE_URL } from "../site";
import styles from "./join.module.css";

export const metadata: Metadata = {
  title: "Join the HUSTL3 | Free Skilled Trades Community | TRADE HUSTL3",
  description: "Join the HUSTL3 for free skilled-trades resources, certification guidance, career tips, and TRADE HUSTL3 updates. Enter • Earn • Elevate.",
  alternates: { canonical: `${SITE_URL}/join` },
  openGraph: {
    title: "Join the HUSTL3 | Enter • Earn • Elevate",
    description: "Free resources and practical updates for your next move in the skilled trades.",
    url: `${SITE_URL}/join`,
    type: "website",
  },
};

const benefits = [
  { number: "01", title: "Free trade career resources", body: "Explore practical guides and paths into skilled trades, including options for students and career changers.", href: "/resources", link: "Explore resources" },
  { number: "02", title: "Credentials made clearer", body: "Find sourced certification and licensing information, with links to the agencies and organizations that set requirements.", href: "/resources/certifications", link: "Browse certifications" },
  { number: "03", title: "Career-building guidance", body: "Get helpful resume, interview, and career preparation tips. The Resume Builder is optional and its paid download is separate.", href: "/#resume-start", link: "Explore Resume Builder" },
  { number: "04", title: "Updates from TRADE HUSTL3", body: "Receive news about new career guides, tools, book updates, and future HUSTL3 News editions by email.", href: "/book", link: "See the book" },
];

export default function JoinPage() {
  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <Link href="/" className={styles.wordmark} aria-label="TRADE HUSTL3 home">TRADE HUSTL<span>3</span></Link>
        <nav aria-label="Community page navigation">
          <Link href="/resources">Resources</Link>
          <Link href="/resources/certifications">Certifications</Link>
          <Link href="/book">The Book</Link>
        </nav>
      </header>
      <section className={styles.hero} aria-labelledby="join-heading">
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>THE TRADE HUSTL3 COMMUNITY</div>
          <h1 id="join-heading">JOIN THE <span>HUSTL3</span></h1>
          <div className={styles.motto}>ENTER <b>•</b> EARN <b>•</b> ELEVATE</div>
          <p className={styles.lead}>Your future is worth building. Get practical information to discover a trade, understand the credentials, and make your next career move.</p>
          <p className={styles.freePill}>Free to join · No purchase required</p>
          <a className={styles.heroCta} href="#join-signup">Join free <span aria-hidden="true">↓</span></a>
        </div>
      </section>
      <section className={styles.content} aria-labelledby="benefits-heading">
        <p className={styles.kicker}>WHAT YOU GET</p>
        <h2 id="benefits-heading">Build knowledge. Find your lane.</h2>
        <p className={styles.intro}>Whether you're exploring your first trade or preparing for your next opportunity, start with information you can actually use.</p>
        <div className={styles.benefits}>
          {benefits.map((benefit) => (
            <article className={styles.benefit} key={benefit.number}>
              <span className={styles.benefitNumber}>{benefit.number}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.body}</p>
              <Link href={benefit.href}>{benefit.link} <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
      </section>
      <section id="join-signup" className={styles.signupBand} aria-labelledby="signup-heading">
        <div className={styles.signupCopy}>
          <p className={styles.kicker}>YOUR NEXT MOVE STARTS HERE</p>
          <h2 id="signup-heading">JOIN THE HUSTL3. <span>STAY IN THE KNOW.</span></h2>
          <p>Sign up for TRADE HUSTL3 email updates about free resources, career guidance, and new tools. We'll also let you know when THE HUSTL3 NEWS launches.</p>
          <p className={styles.small}>No membership fee. No obligation to purchase a book or resume download.</p>
        </div>
        <div className={styles.formCard}>
          <h3>Get free updates</h3>
          <ResourceForm
            resourceName="Join the HUSTL3 email updates"
            buttonLabel="Join the HUSTL3"
            conversion
            marketingConsent={true}
            ctaId="join-the-hustl3"
            ctaLocation="join_page"
            metaLeadContentName="newsletter"
            signupInterest="Join the HUSTL3 Community"
          />
          <p className={styles.consent}>By signing up, you agree to receive TRADE HUSTL3 email updates. You can unsubscribe anytime. Depending on the signup process, you may need to confirm your email first. See our <Link href="/privacy">Privacy Policy</Link>.</p>
        </div>
      </section>
      <section className={styles.news} aria-labelledby="news-heading">
        <div>
          <p className={styles.kicker}>COMING TO THE COMMUNITY</p>
          <h2 id="news-heading">THE HUSTL3 NEWS</h2>
          <p>Our planned weekly trade news roundup will spotlight industry developments, career resources, and useful credential updates. Join the email list to hear when the first edition goes live.</p>
        </div>
        <Link href="/resources">Explore today's resources <span aria-hidden="true">→</span></Link>
      </section>
      <footer className={styles.footer}>
        <strong>BUILT BY HUSTL3. BACKED BY TRADE.</strong>
        <SocialLinks />
        <div className={styles.footerLinks}>
          <Link href="/">Home</Link><Link href="/resources">Resources</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link>
        </div>
        <small>© {new Date().getFullYear()} TRADE HUSTL3 LLC · Atlanta, Georgia</small>
      </footer>
    </main>
  );
}
