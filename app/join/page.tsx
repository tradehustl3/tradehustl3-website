import type { Metadata } from "next";
import Link from "next/link";
import { BrandLockup } from "../brand-lockup";
import { ResourceForm } from "../resource-form";
import { homeBodyFont, homeDisplayFont } from "../home-fonts";
import { ResourceFooter } from "../resources/resource-chrome";
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

const steps = [
  { word: "Enter", title: "Find your starting point.", body: "Explore the trades and see where your interests could take you." },
  { word: "Earn", title: "Build skills that matter.", body: "Understand the training and credentials behind your next opportunity." },
  { word: "Elevate", title: "Keep moving forward.", body: "Prepare your resume, grow your knowledge, and plan your next move." },
];

function BenefitIcon({ number }: { number: string }) {
  const paths: Record<string, string> = {
    "01": "M12 7C9 4 5 4 2 5v14c3-1 7-1 10 2m0-14c3-3 7-3 10-2v14c-3-1-7-1-10 2V7Z",
    "02": "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6",
    "03": "M8 7V4h8v3M3 7h18v14H3V7Zm0 6c6 3 12 3 18 0m-9 0v4",
    "04": "M3 5h18v14H3V5Zm0 1 9 7 9-7",
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[number]} /></svg>;
}

export default function JoinPage() {
  return (
    <main className={`${styles.page} ${homeBodyFont.variable} ${homeDisplayFont.variable}`}>
      <header className={styles.topBar}>
        <Link href="/" className={styles.brand} aria-label="TRADE HUSTL3 home"><BrandLockup size="lg" appearance="transparent" /></Link>
        <nav aria-label="Community page navigation">
          <Link href="/resources">Resources</Link>
          <Link href="/resources/certifications">Certifications</Link>
          <Link href="/book">The Book</Link>
        </nav>
      </header>
      <section className={styles.hero} aria-labelledby="join-heading">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>YOUR AMBITION HAS A PLACE HERE</div>
            <h1 id="join-heading">WELCOME TO THE <span>HUSTL3.</span></h1>
            <p className={styles.welcome}>
              <span className={styles.welcomePrompt}>Just getting started? Making a change?</span>{" "}
              <strong className={styles.welcomeEmphasis}>You belong here.</strong>
            </p>
            <p className={styles.lead}><strong className={styles.futureEmphasis}>Your future is worth building.</strong>{" "}Find practical trade resources, clearer credential guidance, and ideas for your next move — wherever you&apos;re starting from.</p>
            <div className={styles.heroActions}>
              <a className={styles.heroCta} href="#join-signup">Join the HUSTL3 <span aria-hidden="true">→</span></a>
              <a className={styles.secondaryCta} href="#join-benefits">See what&apos;s inside <span aria-hidden="true">↓</span></a>
            </div>
            <p className={styles.freePill}><span aria-hidden="true">✓</span> Free to join · No purchase required</p>
          </div>
          <aside className={styles.pathCard} aria-labelledby="path-heading">
            <p className={styles.pathEyebrow}>ONE MOVE CAN OPEN A NEW CHAPTER</p>
            <h2 id="path-heading">Let&apos;s build <span>what&apos;s next.</span></h2>
            <ol className={styles.steps}>
              {steps.map((step, index) => (
                <li key={step.word}>
                  <span className={styles.stepNumber} aria-hidden="true">0{index + 1}</span>
                  <div><span className={styles.stepWord}>{step.word}</span><h3>{step.title}</h3><p>{step.body}</p></div>
                </li>
              ))}
            </ol>
            <p className={styles.pathNote}>Your starting point is just the beginning.</p>
          </aside>
        </div>
        <div className={styles.motto}>ENTER <b>•</b> EARN <b>•</b> ELEVATE</div>
      </section>
      <section id="join-benefits" className={styles.content} aria-labelledby="benefits-heading">
        <p className={styles.kicker}>A LITTLE DIRECTION FOR YOUR NEXT BIG MOVE</p>
        <h2 id="benefits-heading">Find your lane. <span>Build your future.</span></h2>
        <p className={styles.intro}>Whether you&apos;re exploring your first trade or preparing for your next opportunity, start with information you can actually use.</p>
        <div className={styles.benefits}>
          {benefits.map((benefit) => (
            <article className={styles.benefit} key={benefit.number}>
              <div className={styles.benefitTop}><span className={styles.benefitIcon}><BenefitIcon number={benefit.number} /></span><span className={styles.benefitNumber} aria-hidden="true">{benefit.number}</span></div>
              <h3>{benefit.title}</h3>
              <p>{benefit.body}</p>
              <Link href={benefit.href}>{benefit.link} <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
      </section>
      <section id="join-signup" className={styles.signupBand} aria-labelledby="signup-heading">
        <div className={styles.signupCopy}>
          <p className={styles.kicker}>COME AS YOU ARE. BUILD FROM HERE.</p>
          <h2 id="signup-heading">Your next chapter.<br /><span>Let&apos;s get into it.</span></h2>
          <p>Sign up for TRADE HUSTL3 email updates about free resources, career guidance, and new tools. We&apos;ll also let you know when THE HUSTL3 NEWS launches.</p>
          <p className={styles.small}>Free to join. Unsubscribe anytime. Your next move is yours.</p>
        </div>
        <div className={styles.formCard}>
          <span className={styles.formBadge}>YOU&apos;RE INVITED</span>
          <h3>Make room for your next move.</h3>
          <p className={styles.formIntro}>Get free HUSTL3 updates in your inbox.</p>
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
          <h2 id="news-heading">THE HUSTL3 <span>NEWS</span></h2>
          <p>Our planned weekly trade news roundup will spotlight industry developments, career resources, and useful credential updates. Join the email list to hear when the first edition goes live.</p>
        </div>
        <Link href="/resources">Explore today&apos;s resources <span aria-hidden="true">→</span></Link>
      </section>
      <ResourceFooter joinHref="#join-signup" ctaLocation="join_footer" />
    </main>
  );
}
