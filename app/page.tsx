import Image from "next/image";
import { SignupForm } from "./signup-form";
import { SocialLinks } from "./social-links";

const pillars = [
  { number: "01", title: "The Book", description: "The TRADE HUSTL3 career playbook by Zachary Ellis (KDP ISBN 9798193043355), launching September 15, 2026.", action: "Explore the book", href: "/book" },
  { number: "02", title: "Resume Builder", description: "Turn licenses, certifications, field hours, and real jobsite experience into a resume that gets understood.", action: "Build your edge", href: "/resume-builder" },
  { number: "03", title: "HUSTL3 PRO", description: "Premium tools, practical training, and a community built for tradespeople ready for the next level.", action: "Join the waitlist", href: "#join" },
  { number: "04", title: "Jobsite Gear", description: "Hard-wearing essentials that carry the mindset from the jobsite to everywhere else.", action: "Gear up", href: "#join" },
  { number: "05", title: "Program Partnerships", description: "Resources and collaboration for trade schools, workforce programs, and the people building tomorrow's talent.", action: "Partner with us", href: "mailto:partners@tradehustl3.com" },
];

const steps = [
  ["ENTER", "Choose the trade. Learn the culture. Step onto the jobsite ready."],
  ["EARN", "Build real skills, stack credentials, and make your work impossible to ignore."],
  ["ELEVATE", "Lead crews, grow your income, own your future, and bring others with you."],
];

const audiences = [
  "Students exploring skilled trades",
  "Apprentices and entry-level technicians",
  "Career changers",
  "Working tradespeople",
  "Future supervisors and owners",
  "Trade schools and workforce programs",
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand-link" href="#top" aria-label="TRADE HUSTL3 home">
          <Image className="header-logo" src="/trade-hustl3-logo.png" alt="TRADE HUSTL3 logo" width={68} height={68} priority />
          <span className="wordmark">TRADE HUSTL<span>3</span></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="/book">The Book</a><a href="/resume-builder">Resume Builder</a><a href="#ecosystem">Ecosystem</a><a href="#mission">Mission</a><a href="#field">From the field</a><a className="nav-cta" href="#join">Get in early</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-content">
          <div className="eyebrow"><span /> BUILT FOR THE ONES WHO BUILD</div>
          <h1>BUILT BY <em>HUSTLE.</em><br />BACKED BY <strong>TRADES.</strong></h1>
          <p className="hero-copy">A career platform and movement for the skilled trades—made to help you enter strong, earn more, and elevate what comes next.</p>
          <div className="hero-actions"><a className="button button-primary" href="#ecosystem">Explore the ecosystem <span>↗</span></a><a className="button button-secondary" href="#mission">Why we exist</a></div>
        </div>
        <div className="hero-logo-wrap">
          <div className="logo-rule"><span>FIELD-BUILT</span><span>EST. 2026</span></div>
          <Image className="hero-logo" src="/trade-hustl3-logo.png" alt="TRADE HUSTL3 logo" width={500} height={500} priority />
        </div>
        <div className="marquee" aria-label="Enter, Earn, Elevate"><div>ENTER <b>◆</b> EARN <b>◆</b> ELEVATE <b>◆</b> ENTER <b>◆</b> EARN <b>◆</b> ELEVATE</div></div>
      </section>

      <section className="intro" id="mission">
        <p className="section-label">/ THE MISSION</p>
        <div><h2>THE TRADES DON&apos;T NEED A BACKUP PLAN.</h2><p>They need a bigger platform. TRADE HUSTL3 connects practical tools, trusted resources, and real opportunity for the people who keep the world moving.</p></div>
      </section>

      <section className="field-section" id="field">
        <div className="field-story"><p className="section-label">/ WHY WE EXIST</p><h2>BUILT FROM<br />THE <span>FIELD.</span></h2><p>Founded by HVAC and facilities maintenance professional Zachary Ellis, TRADE HUSTL3 was built from real field experience and trades supervision—not theory. The mission is to shorten the learning curve for people entering the skilled trades and give working tradespeople practical tools to earn more, move up, and build something bigger.</p></div>
        <div className="audience-block"><p className="section-label">/ WHO THIS IS FOR</p><h3>WHO THIS IS FOR</h3><ul>{audiences.map((audience, index) => <li key={audience}><span>0{index + 1}</span>{audience}</li>)}</ul></div>
      </section>

      <section className="ecosystem" id="ecosystem">
        <div className="section-heading"><p className="section-label">/ ONE ECOSYSTEM. FIVE WAYS FORWARD.</p><h2>TOOLS FOR THE<br /><span>WHOLE JOURNEY.</span></h2></div>
        <div className="pillar-grid">{pillars.map((pillar) => <article className="pillar-card" key={pillar.number}><div className="card-top"><span>{pillar.number}</span><span>↗</span></div><h3>{pillar.title}</h3><p>{pillar.description}</p><a href={pillar.href}>{pillar.action} <span>→</span></a></article>)}</div>
      </section>

      <section className="path-section"><div className="path-heading"><p className="section-label">/ THE PATH</p><h2>NO SHORTCUTS.<br />JUST <span>FORWARD.</span></h2></div><div className="steps">{steps.map(([title, copy], index) => <div className="step" key={title}><span className="step-number">0{index + 1}</span><div><h3>{title}<b>.</b></h3><p>{copy}</p></div></div>)}</div></section>
      <section className="quote-band"><blockquote>“YOUR HANDS BUILT THE WORLD.<br /><span>YOUR HUSTLE BUILDS WHAT&apos;S NEXT.</span>”</blockquote></section>

      <section className="join" id="join">
        <p className="section-label">/ GET IN EARLY</p><h2>CHOOSE YOUR<br />NEXT <span>MOVE.</span></h2>
        <p>Tell us what you want updates about. We&apos;ll keep what lands in your inbox focused on the tools, releases, and opportunities that matter to you.</p>
        <SignupForm /><small>By joining, you agree to receive TRADE HUSTL3 emails. Unsubscribe anytime. No spam—just moves worth making.</small>
      </section>

      <footer>
        <div className="footer-brand"><div className="wordmark">TRADE HUSTL<span>3</span></div><p>Built by Hustle, Backed by Trades.</p><SocialLinks /></div>
        <div className="footer-links"><a href="/book">The Book</a><a href="/resume-builder">Resume Builder</a><a href="#ecosystem">Ecosystem</a><a href="#mission">Mission</a><a href="#field">From the field</a><a href="mailto:partners@tradehustl3.com">Partnerships</a></div>
        <div className="footer-legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/resume-builder/refund-policy">Resume refunds</a><a href="/book/refund-policy">eBook policy</a><a href="/data-deletion">Data requests</a><a href="/contact">Support</a></div>
        <p className="copyright">© 2026 TRADE HUSTL3. ALL GRIT RESERVED.</p>
      </footer>
    </main>
  );
}
