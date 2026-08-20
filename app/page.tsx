const pillars = [
  {
    number: "01",
    title: "The Book",
    description:
      "A straight-talking playbook for building a career, a reputation, and a life in the skilled trades.",
    action: "Get the playbook",
    href: "#join",
  },
  {
    number: "02",
    title: "Resume Builder",
    description:
      "Turn licenses, certifications, field hours, and real jobsite experience into a resume that gets understood.",
    action: "Build your edge",
    href: "#join",
  },
  {
    number: "03",
    title: "HUSTL3 PRO",
    description:
      "Premium tools, practical training, and a community built for tradespeople ready for the next level.",
    action: "Join the waitlist",
    href: "#join",
  },
  {
    number: "04",
    title: "Jobsite Gear",
    description:
      "Hard-wearing essentials that carry the mindset from the jobsite to everywhere else.",
    action: "Gear up",
    href: "#join",
  },
  {
    number: "05",
    title: "Program Partnerships",
    description:
      "Resources and collaboration for trade schools, workforce programs, and the people building tomorrow's talent.",
    action: "Partner with us",
    href: "mailto:partners@tradehustl3.com",
  },
];

const steps = [
  ["ENTER", "Choose the trade. Learn the culture. Step onto the jobsite ready."],
  ["EARN", "Build real skills, stack credentials, and make your work impossible to ignore."],
  ["ELEVATE", "Lead crews, grow your income, own your future, and bring others with you."],
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="TRAD3 HUSTL3 home">
          TRAD<span>3</span> HUSTL<span>3</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#ecosystem">Ecosystem</a>
          <a href="#mission">Mission</a>
          <a className="nav-cta" href="#join">Get in early</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-noise" aria-hidden="true" />
        <div className="eyebrow"><span /> BUILT FOR THE ONES WHO BUILD</div>
        <h1>
          BUILT BY <em>HUSTLE.</em><br />
          BACKED BY <em>TRADES.</em>
        </h1>
        <p className="hero-copy">
          A career platform and movement for the skilled trades—made to help you
          enter strong, earn more, and elevate what comes next.
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href="#ecosystem">Explore the ecosystem <span>↗</span></a>
          <a className="button button-secondary" href="#mission">Why we exist</a>
        </div>
        <div className="hero-stamp" aria-hidden="true">
          <span>EST.</span><strong>TH³</strong><span>2026</span>
        </div>
        <div className="marquee" aria-label="Enter, Earn, Elevate">
          <div>ENTER <b>◆</b> EARN <b>◆</b> ELEVATE <b>◆</b> ENTER <b>◆</b> EARN <b>◆</b> ELEVATE</div>
        </div>
      </section>

      <section className="intro" id="mission">
        <p className="section-label">/ THE MISSION</p>
        <div>
          <h2>THE TRADES DON&apos;T NEED A BACKUP PLAN.</h2>
          <p>
            They need a bigger platform. TRAD3 HUSTL3 connects practical tools,
            trusted resources, and real opportunity for the people who keep the
            world moving.
          </p>
        </div>
      </section>

      <section className="ecosystem" id="ecosystem">
        <div className="section-heading">
          <p className="section-label">/ ONE ECOSYSTEM. FIVE WAYS FORWARD.</p>
          <h2>TOOLS FOR THE<br /><span>WHOLE JOURNEY.</span></h2>
        </div>
        <div className="pillar-grid">
          {pillars.map((pillar) => (
            <article className="pillar-card" key={pillar.number}>
              <div className="card-top"><span>{pillar.number}</span><span>↗</span></div>
              <h3>{pillar.title}</h3>
              <p>{pillar.description}</p>
              <a href={pillar.href}>{pillar.action} <span>→</span></a>
            </article>
          ))}
        </div>
      </section>

      <section className="path-section">
        <div className="path-heading">
          <p className="section-label">/ THE PATH</p>
          <h2>NO SHORTCUTS.<br />JUST <span>FORWARD.</span></h2>
        </div>
        <div className="steps">
          {steps.map(([title, copy], index) => (
            <div className="step" key={title}>
              <span className="step-number">0{index + 1}</span>
              <div><h3>{title}<b>.</b></h3><p>{copy}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="quote-band">
        <blockquote>“YOUR HANDS BUILT THE WORLD.<br /><span>YOUR HUSTLE BUILDS WHAT&apos;S NEXT.</span>”</blockquote>
      </section>

      <section className="join" id="join">
        <p className="section-label">/ GET IN EARLY</p>
        <h2>THE NEXT SHIFT<br />STARTS <span>NOW.</span></h2>
        <p>Be first to hear about the book, resume builder, HUSTL3 PRO, gear drops, and partnership opportunities.</p>
        <form className="signup" action="mailto:hello@tradehustl3.com" method="post" encType="text/plain">
          <label className="sr-only" htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" placeholder="YOUR EMAIL ADDRESS" required />
          <button type="submit">JOIN THE MOVEMENT <span>↗</span></button>
        </form>
        <small>No spam. Just moves worth making.</small>
      </section>

      <footer>
        <div className="footer-brand">
          <div className="wordmark">TRAD<span>3</span> HUSTL<span>3</span></div>
          <p>Built by Hustle, Backed by Trades.</p>
        </div>
        <div className="footer-links">
          <a href="#ecosystem">Ecosystem</a><a href="#mission">Mission</a><a href="mailto:partners@tradehustl3.com">Partnerships</a>
        </div>
        <p className="copyright">© 2026 TRAD3 HUSTL3. ALL GRIT RESERVED.</p>
      </footer>
    </main>
  );
}
