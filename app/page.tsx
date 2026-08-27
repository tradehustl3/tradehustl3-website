import { ResourceForm } from './resource-form';
import Image from 'next/image';

const resumeBenefits = [
  'One-time $9.99 payment', 'No subscription',
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
      <header className="site-header">
        <a className="brand" href="#top" aria-label="TRADE HUSTL3 home">
          <span className="brand-mark"><Image src="/trade-hustl3-logo.png" alt="" width={46} height={46} /></span><span className="brand-wordmark">TRADE HUSTL<span className="brand-three">3</span></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#resources">Free guides</a><a href="#book">The book</a>
          <a className="button button-small" href="#resume-builder">Build my resume — $9.99</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow"><span>01</span> Resume Builder / skilled trades</p>
          <h1>Your future<br />doesn&apos;t need<br /><em>permission.</em></h1>
          <p className="hero-product-title">The Resume Builder Built for Skilled Trades.</p>
          <p className="hero-lede">Build a professional resume, improve your opportunities, and create a real pathway from your first opportunity to ownership.</p>
          <div className="hero-actions">
            <a className="button" href="#resume-builder">Build my resume — $9.99 <span aria-hidden="true">↗</span></a>
            <a className="button button-secondary" href="#resources">Get the free trade guides <span aria-hidden="true">↓</span></a>
          </div>
          <div className="path-label" aria-label="Enter. Earn. Elevate."><span>Enter.</span><i /><span>Earn.</span><i /><span>Elevate.</span><i /></div>
          <p className="hero-intelligence"><span aria-hidden="true">◆</span> Powered by HUSTLE BOT — Intelligent Enhancement for Skilled Trades Resumes</p>
        </div>
        <div className="hero-visual" aria-label="TRADE HUSTL3 Resume Builder features and trust proof">
          <div className="interface-topline"><span className="product-card-brand"><Image src="/trade-hustl3-resume-builder-logo.png" alt="TRADE HUSTL3 Resume Builder" width={86} height={70} /></span><b>CAREER SYSTEM ONLINE</b></div>
          <div className="hero-workstation">
            <div className="hero-photo-frame">
              <Image src="/trade-hustl3-resume-workspace.png" alt="Trades workspace with safety vest, work boots, and laptop displaying Trash resumes equals trash results" fill sizes="(max-width: 960px) 92vw, 46vw" priority />
              <span className="photo-label">Built for the work ahead</span>
            </div>
            <div className="hero-feature-grid" aria-label="Resume Builder features">
              {heroFeatures.map((feature) => <span key={feature}>{feature}</span>)}
            </div>
            <div className="hero-proof"><span>Credibility / 01</span><strong>Trusted by thousands of tradesmen and tradeswomen</strong><p>The #1 go-to resume builder for the trades.</p></div>
          </div>
          <div className="interface-footer"><span>Powered by HUSTLE BOT</span><span className="live-dot">System online</span></div>
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
            <a className="button full-button" href="#integration-notice">Build my resume — $9.99 <span aria-hidden="true">→</span></a>
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
            <details className="guide-signup">
              <summary>Sign up now <span aria-hidden="true">→</span></summary>
              <ResourceForm resourceName="Top 10 Trades PDF" buttonLabel="Send me the free PDF" includeInterest />
            </details>
            <div className="guide-benefits" aria-label="Guide career benefits">
              {guideBenefits.map((benefit) => <div key={benefit.label}><span aria-hidden="true">{benefit.icon}</span><p>{benefit.label}</p></div>)}
            </div>
            <div className="guide-tool-art" aria-hidden="true"><Image src="/top-trades-tools.png" alt="" fill sizes="(max-width: 760px) 88vw, 42vw" /></div>
          </article>
        </div>

        <section className="builder-feature-strip" aria-labelledby="builder-features-title">
          <div className="builder-feature-main">
            <p className="strip-kicker">The professional advantage</p>
            <h3 id="builder-features-title">Get more with the<br /><span>TRADE HUSTL3 Resume Builder</span></h3>
            <div className="builder-features">
              {builderStripFeatures.map((feature) => <div key={feature.label}><span aria-hidden="true">{feature.icon}</span><p>{feature.label}</p></div>)}
            </div>
          </div>
          <div className="hustl3-bot-panel">
            <div className="bot-copy"><p>Meet HUSTL3 BOT</p><h3>Your intelligent assistant for stronger, smarter trade resumes.</h3><span>Built to HUSTL3. Backed by skill.</span></div>
            <Image src="/hustl3-bot-branded.png" alt="HUSTL3 BOT wearing a branded white hard hat and a TRADE HUSTL3 Resume Builder logo on an orange reflective safety vest" width={420} height={630} />
          </div>
        </section>
        <p className="integration-note" id="integration-notice"><strong>Review build:</strong> Production URLs, subscriber endpoints, and the two separate PDF download links were not present in the supplied project files, so this prototype does not send visitor data or invent routes.</p>
      </section>

      <section className="steps-section section-shell">
        <div className="section-heading compact"><p className="eyebrow"><span>03</span> The pathway</p><h2>Start where you are.<br /><em>Build what&apos;s next.</em></h2></div>
        <ol className="steps-grid">
          <li><span>01</span><div><h3>Choose Your Path</h3><p>Explore skilled trades and identify your direction.</p></div></li>
          <li><span>02</span><div><h3>Build Your Tools</h3><p>Create a professional resume and access practical career resources.</p></div></li>
          <li><span>03</span><div><h3>Enter. Earn. Elevate.</h3><p>Apply, build experience, increase your value, and work toward ownership.</p></div></li>
        </ol>
      </section>

      <section className="book-section" id="book">
        <div className="book-cover" aria-label="Book cover representation using the supplied TRADE HUSTL3 brand artwork">
          <span className="book-kicker">Enter. Earn. Elevate.</span>
          <Image className="book-cover-image" src="/trade-hustl3-book-cover.jpg" alt="TRADE HUSTL3 book cover" width={430} height={645} />
        </div>
        <div className="book-copy">
          <p className="eyebrow"><span>04</span> The field guide</p>
          <h2>Not just a book.<br /><em>A starting line.</em></h2>
          <p className="book-lede">TRADE HUSTL3 introduces readers to skilled-trades careers, earning potential, advancement, business ownership, and a practical 90-day action plan.</p>
          <dl className="book-meta"><div><dt>Title</dt><dd>TRADE HUSTL3</dd></div><div><dt>Author</dt><dd>Zachary Ellis <span>/ Da Maintenance Mane</span></dd></div><div><dt>ISBN</dt><dd>9798193043355</dd></div><div><dt>Release</dt><dd>September 15, 2026</dd></div></dl>
          <div className="hero-actions"><a className="text-link" href="#book-details">Explore the book <span aria-hidden="true">↓</span></a></div>
        </div>
      </section>

      <section className="founder-section section-shell" id="book-details">
        <div className="founder-photo"><Image src="/zachary-ellis.png" alt="Zachary Ellis, founder of TRADE HUSTL3" width={520} height={650} /><span>Founder / Author / Trades professional</span></div>
        <div className="founder-copy"><p className="eyebrow"><span>05</span> Built from the field</p><h2>Real experience.<br /><em>No empty promises.</em></h2><p>TRADE HUSTL3 was built by Zachary Ellis—also known as Da Maintenance Mane—a trades professional with more than ten years of hands-on HVAC, facilities-maintenance, and leadership experience.</p><blockquote>“Built by Hustle, Backed by Trades.”</blockquote></div>
      </section>

      <section className="trust-section section-shell">
        <p className="eyebrow"><span>06</span> The standard</p>
        <div className="trust-grid">{trustPoints.map((point, index) => <div key={point}><span>{String(index + 1).padStart(2, '0')}</span><p>{point}</p></div>)}</div>
      </section>

      <section className="final-cta section-shell">
        <p className="eyebrow"><span>07</span> Your next move</p><h2>Bring your skills.<br /><em>We&apos;ll help shape the story.</em></h2><p>One payment. No subscription. A professional resume built for where you&apos;re headed.</p>
        <a className="button" href="#resume-builder">Build my resume — $9.99 <span aria-hidden="true">↗</span></a>
      </section>

      <footer><div><Image src="/trade-hustl3-logo.png" alt="" width={46} height={46} /><strong>TRADE HUSTL3 LLC</strong></div><p>Built by Hustle, Backed by Trades.</p><p>ENTER. EARN. ELEVATE.</p></footer>
    </main>
  );
}

