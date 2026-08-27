import Image from "next/image";
import { SignupForm } from "./signup-form";
import { SocialLinks } from "./social-links";
import styles from "./home.module.css";

const proof = [
  ["ENTER", "GET THE TRADE MAP."],
  ["EARN", "BUILD THE RESUME."],
  ["ELEVATE", "MOVE WITH A PLAN."],
];

const tools = [
  {
    number: "01",
    title: "TRADE HUSTL3 RULE BUILDER",
    copy: "Pick the right lane before you waste time, money, or momentum.",
    href: "#signup-now",
    action: "SIGN UP NOW",
  },
  {
    number: "02",
    title: "RESUME BUILDER",
    copy: "Turn field experience, certifications, licenses, and skills into an ATS-ready resume.",
    href: "/resume-builder",
    action: "BUILD MY RESUME — $9.99",
  },
  {
    number: "03",
    title: "HUSTL3 BOT",
    copy: "Jobsite-minded AI guidance for trade questions, next-step planning, and career direction.",
    href: "#signup-now",
    action: "GET EARLY ACCESS",
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
            width={50}
            height={50}
            priority
            className={styles.logo}
          />
          <span className={styles.wordmark}>TRADE HUSTL<span>3</span></span>
        </a>

        <nav className={styles.nav} aria-label="Primary navigation">
          <a href="/book#free-guides">FREE GUIDES</a>
          <a href="/book">THE BOOK</a>
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

          <div className={styles.visualWrap} aria-label="TRADE HUSTL3 Resume Builder workspace preview">
            <div className={styles.visualFrame}>
              <div className={styles.visualTopline}>
                <span>TRADE HUSTL3</span>
                <span>RESUME BUILDER</span>
              </div>

              <div className={styles.workspaceScene}>
                <div className={styles.wallGlow} />
                <div className={styles.hardHat} aria-hidden="true"><span /></div>
                <div className={styles.laptop} aria-hidden="true">
                  <div className={styles.laptopScreen}>
                    <Image
                      src="/trade-hustl3-resume-builder-logo.png"
                      alt=""
                      width={210}
                      height={66}
                      className={styles.screenLogo}
                    />
                    <div className={styles.resumeSheet}>
                      <strong>SKILLED TRADES RESUME</strong>
                      <span />
                      <span />
                      <span />
                      <span className={styles.shortLine} />
                    </div>
                  </div>
                  <div className={styles.keyboard} />
                </div>
                <div className={styles.deskLine} />
                <div className={styles.toolSilhouette} aria-hidden="true" />
              </div>

              <div className={styles.visualFooter}>
                <div>
                  <strong>ATS-READY</strong>
                  <span>PDF + DOCX</span>
                </div>
                <div>
                  <strong>BUILT FOR TRADES</strong>
                  <span>REAL EXPERIENCE. REAL VALUE.</span>
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

      <section className={styles.offerSection} id="offers">
        <div className={styles.offerHeading}>
          <span>START HERE</span>
          <h2>TOOLS THAT MOVE YOU <em>FORWARD.</em></h2>
        </div>

        <div className={styles.offerGrid}>
          <article className={styles.resumeOffer}>
            <div className={styles.offerBadge}>MOST POPULAR</div>
            <Image
              src="/trade-hustl3-resume-builder-logo-llc.png"
              alt="TRADE HUSTL3 Resume Builder"
              width={430}
              height={180}
              className={styles.offerLogo}
            />
            <h3>TRADE HUSTL3 RESUME BUILDER</h3>
            <p>Built specifically for skilled trades. Turn jobsite experience, certifications, field hours, and real skills into a resume employers can understand fast.</p>
            <div className={styles.offerChips}>
              <span>ONE-TIME $9.99 PAYMENT</span>
              <span>NO SUBSCRIPTION</span>
              <span>ATS-READY</span>
              <span>PDF + DOCX</span>
            </div>
            <a href="/resume-builder" className={styles.offerCta}>BUILD MY RESUME — $9.99 <span>→</span></a>
          </article>

          <article className={styles.guideOffer}>
            <div className={styles.guideEyebrow}>FREE TRADE RESOURCE</div>
            <div className={styles.guideVisual}>
              <Image
                src="/trade-hustl3-book-cover.jpg"
                alt="TRADE HUSTL3 guide"
                width={280}
                height={420}
                className={styles.guideCover}
              />
            </div>
            <h3>TOP 10 TRADES FOR 2026–2027</h3>
            <p>Explore high-opportunity skilled trades, what they pay, how to enter, and where the demand is moving next.</p>
            <a href="/book#free-guides" className={styles.guideCta}>GET THE FREE GUIDE <span>↗</span></a>
          </article>
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
          <div className={styles.footerBrand}>
            <Image src="/trade-hustl3-logo.png" alt="TRADE HUSTL3" width={48} height={48} className={styles.footerLogo} />
            <span className={styles.wordmark}>TRADE HUSTL<span>3</span></span>
          </div>
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
