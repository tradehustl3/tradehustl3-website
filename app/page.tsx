import Image from "next/image";
import { SignupForm } from "./signup-form";
import { SocialLinks } from "./social-links";
import styles from "./home.module.css";

const proof = [
  ["ENTER", "Get the trade map."],
  ["EARN", "Build the resume."],
  ["ELEVATE", "Move with a plan."],
];

const tools = [
  {
    number: "01",
    title: "TRADE HUSTL3 Rule Builder",
    copy: "Pick the right lane before you waste time, money, or momentum.",
    href: "#signup-now",
    action: "Sign Up Now",
  },
  {
    number: "02",
    title: "Resume Builder",
    copy: "Turn your real field experience, certifications, and skills into an ATS-ready resume.",
    href: "/resume-builder",
    action: "Build My Resume — $9.99",
  },
  {
    number: "03",
    title: "HUSTL3 BOT",
    copy: "Jobsite-minded AI guidance for trade questions, next-step planning, and career direction.",
    href: "#signup-now",
    action: "Get Early Access",
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="TRADE HUSTL3 home">
          <Image
            src="/trade-hustl3-logo.png"
            alt="TRADE HUSTL3 logo"
            width={54}
            height={54}
            priority
            className={styles.logo}
          />
        </a>

        <nav className={styles.nav} aria-label="Primary navigation">
          <a href="/book#free-guides">FREE GUIDES</a>
          <a href="/book">THE BOOK</a>
          <a href="/resume-builder">BUILD MY RESUME</a>
          <a className={styles.navCta} href="/resume-builder">BUILD MY RESUME — $9.99</a>
        </nav>
      </header>

      <section className={styles.hero} id="top">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <div className={styles.kicker}>BUILT FOR THE ONES WHO BUILD</div>
            <h1>
              YOUR FUTURE<br />
              DOESN&apos;T NEED<br />
              <span>PERMISSION.</span>
            </h1>
            <p className={styles.subhead}>THE RESUME BUILDER BUILT FOR SKILLED TRADES.</p>
            <p className={styles.bodyCopy}>
              Turn real field experience into a professional, ATS-ready resume without watering down what you actually know how to do.
            </p>

            <div className={styles.actions}>
              <a className={styles.primaryButton} href="/resume-builder">BUILD MY RESUME — $9.99 <span>→</span></a>
              <a className={styles.secondaryButton} href="/book#free-guides">GET THE FREE TRADE GUIDES <span>↗</span></a>
            </div>

            <p className={styles.microcopy}>ONE-TIME $9.99 · NO SUBSCRIPTION · BUILT FOR THE TRADES</p>
          </div>

          <div className={styles.visualWrap} aria-label="TRADE HUSTL3 Resume Builder preview">
            <div className={styles.visualCard}>
              <div className={styles.visualTopline}>
                <span>TRADE HUSTL3</span>
                <span>RESUME BUILDER</span>
              </div>
              <div className={styles.screenShell}>
                <div className={styles.screenBar}>
                  <span />
                  <span />
                  <span />
                </div>
                <div className={styles.resumePreview}>
                  <div className={styles.resumeBrand}>TH</div>
                  <div className={styles.resumeText}>
                    <strong>FIELD EXPERIENCE THAT READS LIKE VALUE.</strong>
                    <span />
                    <span />
                    <span />
                    <span className={styles.shortLine} />
                  </div>
                </div>
              </div>
              <div className={styles.visualFooter}>
                <Image
                  src="/trade-hustl3-resume-builder-logo.png"
                  alt="TRADE HUSTL3 Resume Builder"
                  width={250}
                  height={80}
                  className={styles.resumeLogo}
                />
                <div>
                  <strong>ATS READY</strong>
                  <span>PDF + DOCX</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.proofStrip}>
          {proof.map(([title, copy]) => (
            <div className={styles.proofItem} key={title}>
              <strong>{title}</strong>
              <span>{copy}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.toolsSection} id="tools">
        <div className={styles.sectionIntro}>
          <span>THE TRADE HUSTL3 SYSTEM</span>
          <h2>CHOOSE YOUR NEXT <em>HUSTL3.</em></h2>
          <p>Start with the problem you need solved, pick the tool, then move.</p>
        </div>

        <div className={styles.toolGrid}>
          {tools.map((tool) => (
            <article className={styles.toolCard} key={tool.number}>
              <div className={styles.toolNumber}>{tool.number}</div>
              <h3>{tool.title}</h3>
              <p>{tool.copy}</p>
              <a href={tool.href}>{tool.action} <span>→</span></a>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.signupSection} id="signup-now">
        <div>
          <span>GET IN EARLY</span>
          <h2>STAY IN THE LOOP.</h2>
          <p>Get product drops, free trade resources, and early access to the Rule Builder and HUSTL3 BOT.</p>
        </div>
        <div className={styles.signupWrap}>
          <SignupForm />
        </div>
      </section>

      <footer className={styles.footer}>
        <div>
          <Image src="/trade-hustl3-logo.png" alt="TRADE HUSTL3" width={54} height={54} className={styles.footerLogo} />
          <p>Built by Hustle, Backed by Trades.</p>
          <SocialLinks />
        </div>
        <div className={styles.footerLinks}>
          <a href="/book">The Book</a>
          <a href="/resume-builder">Resume Builder</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/contact">Support</a>
        </div>
      </footer>
    </main>
  );
}
