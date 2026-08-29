import { ComingSoon } from './coming-soon';
import { CtaAnalytics } from './cta-analytics';
import { SocialLinks } from './social-links';
import Image from 'next/image';

const resumeBenefits = [
  'One-time $9.99 payment', 'No subscription', 'No recurring charge',
];

const trustPoints = [
  'Built from real skilled-trades experience', 'Designed specifically for tradespeople',
  'Clear pricing', 'No Resume Builder subscription', 'Secure checkout',
  'Practical guidance without empty promises',
];

const heroFeatures = [
  'ATS optimized', 'Keyword settings', 'Trade-specific resume enhancement',
  'Professional formatting', 'PDF + DOCX', 'Built for skilled trades',
  'Job-ready resume', 'Intelligent enhancement',
];

const builderStripFeatures = [
  { icon: '✓', label: 'ATS optimized' },
  { icon: '#', label: 'Trade-specific keywords' },
  { icon: 'A', label: 'Professional formatting' },
  { icon: '↓', label: 'PDF + DOCX files' },
  { icon: '★', label: 'Job-ready resume' },
  { icon: '⚙', label: 'Built for skilled trades' },
];

const guideBenefits = [
  { icon: '●●●', label: 'High-demand careers' },
  { icon: '⚒', label: 'Practical skills' },
  { icon: '◉', label: 'Real-world opportunities' },
  { icon: '↗', label: 'Earning potential' },
];

const resumeProcess = [
  { step: '1', icon: '▤', title: 'Tell us your HUSTL3', copy: 'Share your experience, skills, certifications, and target job.' },
  { step: '2', icon: '◆', title: 'HUSTL3 BOT enhances it', copy: 'ATS optimization, trade-specific keywords, and stronger wording.' },
  { step: '3', icon: 'DOCX', title: 'Download and edit', copy: 'Professional PDF + editable DOCX, initial build, and three corrections.' },
];

const resumeServicePoints = [
  { icon: '⚡', label: 'Fast process' },
  { icon: '◇', label: 'Initial build + 3 corrections' },
  { icon: '◷', label: '7-day edit window' },
];

export default function Home() {
  const structuredData = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', name: 'TRADE HUSTL3 LLC', slogan: 'Built by Hustle, Backed by Trades.' },
      { '@type': 'Book', name: 'TRADE HUSTL3', alternateName: 'Built by Hustle, Backed by Trades', isbn: '9798193043355', datePublished: '2026-09-15',
        author: { '@type': 'Person', name: 'Zachary Ellis', alternateName: 'Da Maintenance Mane' } },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <CtaAnalytics />
      <header className="site-header">
        <a className="brand" href="#top" aria-label="TRADE HUSTL3 home">
          <span className="brand-mark"><Image src="/trade-hustl3-logo.png" alt="TRADE HUSTL3 logo" width={46} height={46} /></span><span className="brand-wordmark">TRADE HUSTL<span className="brand-three">3</span></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#resources">Free guides</a><a href="#book">The book</a>
          <a className="button button-small" href="/resume-builder" data-cta="resume-builder" data-cta-location="header">Build my resume — $9.99</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow"><span>01</span> Resume Builder / skilled trades</p>
          <h1>Your future<br />doesn&apos;t need<br /><em>permission.</em></h1>
          <p className="hero-product-title">The Resume Builder Built to Lead the Skilled Trades</p>
          <p className="hero-lede">Professional skilled-trades resume builder for HVAC, electrical, plumbing, welding, facilities maintenance, construction, and trade professionals who want stronger resumes and better opportunities.</p>
          <div className="hero-actions">
            <a className="button" href="/resume-builder" data-cta="resume-builder" data-cta-location="hero">Build my resume — $9.99 <span aria-hidden="true">↗</span></a>
            <a className="button button-secondary" href="#resources" data-cta="free-guides" data-cta-location="hero">Get the free trade guides <span aria-hidden="true">↓</span></a>
          </div>
          <div className="path-label" aria-label="Enter. Earn. Elevate."><span>Enter.</span><i /><span>Earn.</span><i /><span>Elevate.</span><i /></div>
          <p className="hero-intelligence"><span aria-hidden="true">◆</span> Powered by HUSTL3 BOT — Intelligent Enhancement for Skilled Trades Resumes</p>
        </div>
        <div className="hero-visual" aria-label="TRADE HUSTL3 Resume Builder features and trust proof">
          <div className="interface-topline"><span className="product-card-brand"><Image src="/trade-hustl3-resume-builder-logo.png" alt="TRADE HUSTL3 Resume Builder" width={86} height={70} /></span><b>CAREER SYSTEM ONLINE</b></div>
          <div className="hero-workstation">
            <div className="hero-photo-frame">
              <Image src="/trade-hustl3-resume-workspace.png" alt="Skilled-trades workspace with a safety vest, work boots, and a laptop" fill sizes="(max-width: 960px) 92vw, 46vw" priority />
              <span className="photo-label">Built for the work ahead</span>
            </div>
            <div className="hero-feature-grid" aria-label="Resume Builder features">
              {heroFeatures.map((feature) => <span key={feature}>{feature}</span>)}
            </div>
            <div className="hero-proof"><span>Credibility / 01</span><strong>Built for the people who keep America working.</strong><p>Trade-focused. ATS-ready. Built to compete.</p></div>
          </div>
          <div className="interface-footer"><span>Powered by HUSTL3 BOT</span><span className="live-dot">System online</span></div>
        </div>
      </section>

      <section className="conversion-section section-shell" id="resources">
        <div className="conversion-intro">
          <p className="eyebrow"><span>01</span> Choose your next HUSTL3</p>
          <h2><span>One direction.</span><em>Two ways to start.</em></h2>
        </div>
        <div className="conversion-grid">
          <article className="conversion-card resume-card" id="resume-builder">
            <div className="card-index"><span>01</span><b>Build your edge</b></div>
            <Image className="resume-logo" src="/trade-hustl3-resume-builder-logo.png" alt="TRADE HUSTL3 Resume Builder" width={330} height={269} />
            <h3>TRADE HUSTL3<br />Resume Builder</h3>
            <p>Turn your real experience, training, side work, and skills into a professional, ATS-ready resume built for skilled-trades opportunities.</p>
            <ul className="benefit-list">{resumeBenefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
            <div className="resume-process-heading"><span>How it works</span><b>Simple, fast, built for trades</b></div>
            <ol className="resume-process">
              {resumeProcess.map((item) => <li key={item.step}>
                <div className="process-visual"><span>{item.step}</span><i aria-hidden="true">{item.icon}</i></div>
                <h4>{item.title}</h4><p>{item.copy}</p>
              </li>)}
            </ol>
            <div className="resume-service-points">
              {resumeServicePoints.map((item) => <span key={item.label}><i aria-hidden="true">{item.icon}</i>{item.label}</span>)}
            </div>
            <a className="button full-button card-cta" href="/resume-builder" data-cta="resume-builder" data-cta-location="conversion-card">Build my resume — $9.99 <span aria-hidden="true">→</span></a>
          </article>

          <article className="conversion-card guide-card" id="top-trades-guide">
            <div className="guide-skyline" aria-hidden="true"><Image src="/guide-skyline-overlay.png" alt="" fill sizes="(max-width: 760px) 100vw, 50vw" /></div>
            <div className="card-index"><span>02</span><b>Plan your future</b></div>
            <div className="guide-mark">
              <div className="guide-number-lockup">
                <strong aria-hidden="true">10</strong>
                <span>Trade<br />paths</span>
              </div>
              <small>Free career guide</small>
            </div>
            <h3>Top 10 Trades<br />for 2026–2027</h3>
            <p>Discover ten skilled-trades careers with strong entry points and room to grow. Built for real opportunities in a high-demand industry.</p>
            <a
              className="button full-button card-cta"
              href="/top-10-trades"
              data-cta="top-10-trades"
              data-cta-location="conversion-card"
            >
              Get the free Top 10 Trades guide <span aria-hidden="true">→</span>
            </a>
            <div className="guide-benefits" aria-label="Guide career benefits">
              {guideBenefits.map((benefit) => <div key={benefit.label}><span aria-hidden="true">{benefit.icon}</span><p>{benefit.label}</p></div>)}
            </div>
            <div className="guide-tool-art" aria-hidden="true"><Image src="/top-trades-tools.png" alt="" fill sizes="(max-width: 760px) 88vw, 42vw" /></div>
          </article>
        </div>

        <section className="builder-feature-strip" aria-labelledby="builder-features-title">
          <div className="builder-feature-main">
            <p className="strip-kicker">Why TRADE HUSTL3</p>
            <h3 id="builder-features-title">Built to Become the Go-To<br /><span>Resume Builder for the Skilled Trades</span></h3>
            <p className="strip-lede">TRADE HUSTL3 Resume Builder is built specifically for HVAC technicians, electricians, plumbers, welders, maintenance professionals, construction workers, and the next generation entering the skilled trades.</p>
            <p className="strip-lede"><strong>Trade-focused. ATS-ready. Built to compete.</strong></p>
            <p className="strip-lede">HUSTL3 BOT helps turn real trade experience, certifications, skills, tools, and accomplishments into a professional resume designed for today&apos;s hiring systems.</p>
            <div className="builder-features">
              {builderStripFeatures.map((feature) => <div key={feature.label}><span aria-hidden="true">{feature.icon}</span><p>{feature.label}</p></div>)}
            </div>
          </div>
          <div className="hustl3-bot-panel">
            <div className="bot-copy"><p>Meet HUSTL3 BOT</p><h3>Your intelligent assistant for stronger, smarter trade resumes.</h3><span>Built by Hustle, Backed by Trades.</span></div>
            <Image src="/hustl3-bot-branded.png" alt="HUSTL3 BOT wearing a branded white hard hat and a TRADE HUSTL3 Resume Builder logo on an orange reflective safety vest" width={420} height={630} />
          </div>
        </section>
      </section>

      <section className="steps-section section-shell" aria-labelledby="pick-next-title">
        <div className="section-heading compact"><p className="eyebrow"><span>03</span> Pick your next HUSTL3</p><h2 id="pick-next-title">Start where you are.<br /><em>Build what&apos;s next.</em></h2></div>
        <div className="tool-grid">
          <a className="tool-card" href="#resources" data-cta="top-10-trades" data-cta-location="steps">
            <span className="tool-badge">Start here</span>
            <span className="tool-index" aria-hidden="true">01</span>
            <span className="tool-card-title">Choose Your Path</span>
            <span className="tool-card-copy">Explore skilled trades and get the free Top 10 Trades 2026–2027 guide.</span>
            <span className="tool-cta">Get the free guide <span aria-hidden="true">→</span></span>
          </a>
          <a className="tool-card is-live" href="/resume-builder" data-cta="resume-builder" data-cta-location="steps">
            <span className="tool-badge">Live now</span>
            <span className="tool-index" aria-hidden="true">02</span>
            <span className="tool-card-title">Build Your Tools</span>
            <span className="tool-card-copy">Turn your field experience into a professional, ATS-ready resume.</span>
            <span className="tool-cta">Build my resume — $9.99 <span aria-hidden="true">→</span></span>
            <span className="tool-note">More tools coming</span>
          </a>
          <ComingSoon />
        </div>
      </section>

      <section className="sample-cta section-shell" id="book" aria-labelledby="sample-cta-title">
        <article className="conversion-card sample-card">
          <div className="sample-card-art">
            <Image src="/trade-hustl3-book-cover.jpg" alt="TRADE HUSTL3: Built by Hustle, Backed by Trades — book cover" width={300} height={450} />
          </div>
          <div className="sample-card-copy">
            <p className="eyebrow"><span>04</span> Free 7-page book sample</p>
            <h3 id="sample-cta-title">Read 7 Pages of TRADE HUSTL3 Free.</h3>
            <p>Get inside <em>TRADE HUSTL3: Built by Hustle, Backed by Trades</em> before you buy — the cover, opening pages, the full table of contents, and the start of Chapter 1.</p>
            <ul className="sample-gets" aria-label="What the sample covers">
              <li><strong>The voice</strong><span>How the book talks about skilled work and real opportunity.</span></li>
              <li><strong>The structure</strong><span>The complete chapter list across all four parts.</span></li>
              <li><strong>Chapter 1</strong><span>“What a Skilled Trade Really Is,” straight from the interior.</span></li>
            </ul>
            <p className="sample-benefit">Free <span aria-hidden="true">•</span> No purchase required <span aria-hidden="true">•</span> Email delivery</p>
            <a
              className="button full-button card-cta"
              href="/book/sample"
              data-cta="book-sample"
              data-cta-location="sample-card"
            >
              Read 7 pages free <span aria-hidden="true">→</span>
            </a>
            <p className="sample-support">No purchase required. The email capture and reader live on the sample page.</p>
            <a className="sample-secondary" href="/book" data-cta="the-book" data-cta-location="sample-card">Want the full roadmap? Explore the complete book <span aria-hidden="true">→</span></a>
          </div>
        </article>
      </section>

      <section className="founder-section section-shell" id="book-details">
        <div className="founder-photo">
          <Image src="/zachary-ellis.png" alt="Zachary Ellis, known as Da Maintenance Mane, founder of TRADE HUSTL3" width={520} height={650} />
          <span>Da Maintenance Mane</span>
        </div>
        <div className="founder-copy">
          <p className="eyebrow"><span>05</span> — Built from the field</p>
          <h2>Built in the field.<br />Built for <em>what&apos;s next.</em></h2>
          <p className="founder-lede">This wasn&apos;t built from the sidelines. It was built from the work.</p>
          <p>TRADE HUSTL3 was created by Zachary Ellis — Da Maintenance Mane — after more than a decade inside the skilled trades. Rooftops. Mechanical rooms. Service calls. Work orders. Long days. Leadership. Lessons earned the hard way.</p>
          <p>But TRADE HUSTL3 isn&apos;t about one man&apos;s résumé. It&apos;s about what happens when real field knowledge gets turned into a pathway for the next generation.</p>
          <p>The mission is bigger than getting a job. It&apos;s about learning a skill, building leverage, increasing your earning power, and creating options for your life.</p>
          <blockquote className="founder-manifesto">
            The field built the knowledge.<br />
            The hustle built the mission.<br />
            <em>Now we pass it forward.</em>
          </blockquote>
          <p className="founder-sign"><strong>Da Maintenance Mane</strong><span>Founder &amp; Author, TRADE HUSTL3</span></p>
          <ul className="founder-path" aria-label="The TRADE HUSTL3 path">
            <li><span>Enter</span><p>Find your way into the skilled trades.</p></li>
            <li><span>Earn</span><p>Turn valuable skills into real earning power.</p></li>
            <li><span>Elevate</span><p>Build experience, leverage, ownership, and options.</p></li>
          </ul>
        </div>
      </section>

      <section className="trust-section section-shell">
        <p className="eyebrow"><span>06</span> The standard</p>
        <div className="trust-grid">{trustPoints.map((point, index) => <div key={point}><span>{String(index + 1).padStart(2, '0')}</span><p>{point}</p></div>)}</div>
      </section>

      <section className="ecosystem-section section-shell" aria-labelledby="ecosystem-title">
        <p className="eyebrow"><span>07</span> The TRADE HUSTL3 ecosystem</p>
        <h2 id="ecosystem-title">More is <em>on the way.</em></h2>
        <ul className="ecosystem-grid">
          <li>
            <span className="ecosystem-tag">Coming soon</span>
            <h3>TRADE HUSTL3 Gear</h3>
            <p>Jobsite-ready apparel and gear built for people who do the work.</p>
          </li>
          <li>
            <span className="ecosystem-tag">Coming soon</span>
            <h3>TRADE HUSTL3 Resources</h3>
            <p>Guides, tools, and templates to keep building leverage after you start.</p>
          </li>
        </ul>
        <div className="ecosystem-now">
          <span>Available now</span>
          <a href="/resume-builder" data-cta="resume-builder" data-cta-location="ecosystem">Resume Builder <span aria-hidden="true">→</span></a>
          <a href="#resources" data-cta="top-10-trades" data-cta-location="ecosystem">Top 10 Trades <span aria-hidden="true">→</span></a>
          <a href="/book" data-cta="the-book" data-cta-location="ecosystem">The Book <span aria-hidden="true">→</span></a>
        </div>
      </section>

      <footer>
        <div><Image src="/trade-hustl3-logo.png" alt="TRADE HUSTL3 logo" width={46} height={46} /><strong>TRADE HUSTL3 LLC</strong></div>
        <p>Built by Hustle, Backed by Trades.</p>
        <div className="footer-social">
          <p className="footer-social-title">Follow TRADE HUSTL3</p>
          <SocialLinks />
        </div>
        <nav className="footer-nav" aria-label="Footer">
          <a href="/resume-builder">Resume Builder</a>
          <a href="/book">The Book</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/resume-builder/refund-policy">Resume Refunds</a>
          <a href="/book/refund-policy">eBook Policy</a>
          <a href="/data-deletion">Data Requests</a>
          <a href="/contact">Support</a>
          <a href="mailto:support@tradehustl3.com">support@tradehustl3.com</a>
        </nav>
        <p>ENTER. EARN. ELEVATE.</p>
      </footer>
    </main>
  );
}
