import Image from "next/image";
import { SignupForm } from "./signup-form";
import { SocialLinks } from "./social-links";
import styles from "./home.module.css";

const systemTools = [
  ["01", "TRADE HUSTL3 RULE BUILDER", "Pick the right lane before you waste time, money, or momentum.", "#signup-now", "SIGN UP NOW"],
  ["02", "RESUME BUILDER", "Turn field experience, certifications, licenses, and skills into an ATS-ready resume.", "/resume-builder", "BUILD MY RESUME — $9.99"],
  ["03", "HUSTL3 BOT", "Jobsite-minded AI guidance for trade questions, next-step planning, and career direction.", "#signup-now", "GET EARLY ACCESS"],
];

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="TRADE HUSTL3 home">
          <Image src="/trade-hustl3-logo.png" alt="TRADE HUSTL3 logo" width={58} height={58} priority className={styles.logo} />
          <span className={styles.wordmark}>TRADE HUSTL<span>3</span></span>
        </a>
        <nav className={styles.nav} aria-label="Primary navigation">
          <a href="/book#free-guides">FREE GUIDE</a>
          <a href="#how-it-works">HOW IT WORKS</a>
          <a href="#reviews">REVIEWS</a>
          <a href="#faq">FAQ</a>
          <a href="/resume-builder">SIGN IN</a>
        </nav>
      </header>

      <section className={styles.hero} id="top">
        <div className={styles.heroShell}>
          <article className={styles.resumePanel}>
            <div className={styles.panelTopline}><span>01</span><span>BUILD YOUR EDGE</span></div>
            <div className={styles.resumeLogoWrap}>
              <Image src="/trade-hustl3-resume-builder-logo-llc.png" alt="TRADE HUSTL3 Resume Builder" width={470} height={220} priority className={styles.heroResumeLogo} />
            </div>
            <h1>TRADE HUSTL3<br />RESUME BUILDER</h1>
            <p className={styles.resumeIntro}>Turn your real experience, training, side work, and skills into a professional, ATS-ready resume built for skilled-trades opportunities.</p>

            <div className={styles.priceRow}>
              <div><span className={styles.check}>✓</span><strong>One-time $9.99 payment</strong></div>
              <div><span className={styles.check}>✓</span><strong>No subscription</strong></div>
            </div>

            <div className={styles.howDivider} id="how-it-works"><span>HOW IT WORKS — SIMPLE, FAST, BUILT FOR TRADES</span></div>

            <div className={styles.steps}>
              <div className={styles.step}>
                <span className={styles.stepNumber}>1</span>
                <div className={styles.stepIcon}>▤</div>
                <strong>Tell Us Your Hustl3</strong>
                <p>experience, skills, certifications, target job.</p>
              </div>
              <div className={styles.stepConnector}>······→</div>
              <div className={styles.step}>
                <span className={styles.stepNumber}>2</span>
                <div className={styles.stepIcon}>▣</div>
                <strong>HUSTL3 BOT Enhances It</strong>
                <p>ATS optimization, trade-specific keywords, stronger wording.</p>
              </div>
              <div className={styles.stepConnector}>······→</div>
              <div className={styles.step}>
                <span className={styles.stepNumber}>3</span>
                <div className={styles.stepIcon}>DOCX</div>
                <strong>Download &amp; Edit</strong>
                <p>professional PDF + editable DOCX, initial build + 3 corrections, 7-day edit window.</p>
              </div>
            </div>

            <div className={styles.featureStrip}>
              <span>⚡ Fast process</span>
              <span>♢ Initial build + 3 corrections</span>
              <span>◴ 7-day edit window</span>
            </div>

            <a className={styles.resumeCta} href="/resume-builder">BUILD MY RESUME — $9.99 <span>→</span></a>
          </article>

          <article className={styles.guidePanel}>
            <div className={styles.panelToplineLight}><span>02</span></div>
            <div className={styles.craneArt} aria-hidden="true">
              <span className={styles.craneMast} />
              <span className={styles.craneBoom} />
              <span className={styles.skyline} />
            </div>
            <div className={styles.tenBlock}>
              <div className={styles.ten}>10</div>
              <div className={styles.tradePaths}>TRADE<br />PATHS<span /></div>
            </div>
            <h2>TOP 10 TRADES<br />FOR 2026–2027</h2>
            <p>Discover ten skilled-trades careers with strong entry points, and room to grow. Built for real opportunities in a high-demand industry.</p>
            <a className={styles.guideCta} href="/book#free-guides">START HERE <span>→</span></a>

            <div className={styles.guideBenefits}>
              <div><span>●●●</span><strong>HIGH-DEMAND<br />CAREERS</strong></div>
              <div><span>✕</span><strong>PRACTICAL<br />SKILLS</strong></div>
              <div><span>◉</span><strong>REAL-WORLD<br />OPPORTUNITIES</strong></div>
              <div><span>↗</span><strong>EARNING<br />POTENTIAL</strong></div>
            </div>

            <div className={styles.tradeProps} aria-hidden="true">
              <div className={styles.blueprintRoll} />
              <div className={styles.tapeMeasure}>25′</div>
              <div className={styles.gloves} />
              <div className={styles.hardhatProp}><Image src="/trade-hustl3-logo.png" alt="" width={54} height={54} /></div>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.toolsSection} id="reviews">
        <div className={styles.sectionIntro}>
          <span>THE TRADE HUSTL3 SYSTEM</span>
          <h2>CHOOSE YOUR NEXT <em>HUSTL3.</em></h2>
          <p>Start with the problem you need solved, pick the tool, then move.</p>
        </div>
        <div className={styles.toolGrid}>
          {systemTools.map(([number, title, copy, href, action]) => (
            <article className={styles.toolCard} key={number}>
              <div className={styles.toolNumber}>{number}</div>
              <h3>{title}</h3><p>{copy}</p><a href={href}>{action} <span>→</span></a>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.signupSection} id="signup-now">
        <div><span>GET IN EARLY</span><h2>STAY IN THE LOOP.</h2><p>Get product drops, free trade resources, and early access to the Rule Builder and HUSTL3 BOT.</p></div>
        <div className={styles.signupWrap}><SignupForm /></div>
      </section>

      <section className={styles.faqSection} id="faq">
        <h2>BUILT FOR THE TRADES.</h2>
        <p>One-time pricing, clear steps, trade-specific tools, and no subscription trap.</p>
      </section>

      <footer className={styles.footer}>
        <div>
          <div className={styles.footerBrand}><Image src="/trade-hustl3-logo.png" alt="TRADE HUSTL3" width={48} height={48} className={styles.footerLogo} /><span className={styles.wordmark}>TRADE HUSTL<span>3</span></span></div>
          <p>Built by Hustle, Backed by Trades.</p><SocialLinks />
        </div>
        <div className={styles.footerLinks}><a href="/book">The Book</a><a href="/resume-builder">Resume Builder</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Support</a></div>
      </footer>
    </main>
  );
}
