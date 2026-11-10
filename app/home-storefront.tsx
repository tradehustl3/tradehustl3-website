import Image from 'next/image';
import Link from 'next/link';
import { AMAZON_KINDLE, AMAZON_PAPERBACK } from './book/editions';
import { ToolSilhouette, type ToolName } from './tool-silhouettes';
import styles from './home-storefront.module.css';

const tradeLinks: ReadonlyArray<{ label: string; href: string; tool: ToolName }> = [
  { label: 'HVAC', href: '/resume-builder/hvac', tool: 'gauge' },
  { label: 'Electrical', href: '/resume-builder/electrician', tool: 'multimeter' },
  { label: 'Plumbing', href: '/resume-builder/plumbing', tool: 'pipewrench' },
  { label: 'Welding', href: '/resume-builder/welding-fabrication', tool: 'helmet' },
  { label: 'Construction', href: '/resume-builder/construction-carpentry', tool: 'hardhat' },
  { label: 'Facilities', href: '/resume-builder/facilities-maintenance', tool: 'wrench' },
  { label: 'Heavy Equipment', href: '/resume-builder/heavy-equipment-operator', tool: 'hammer' },
  { label: '& More', href: '/resources', tool: 'drill' },
];

export function HomeStorefront() {
  return (
    <section className={styles.storefront} aria-labelledby="storefront-heading" id="top">
      <div className={styles.inner}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>TRADE HUSTL3 · CAREER TOOLS & KNOWLEDGE</p>
          <h1 id="storefront-heading" className={styles.heading}>
            Build your career. <span className={styles.goldText}>Own your future.</span>
          </h1>
          <p className={styles.mission}>Built for the people who build, maintain, repair, and move America.</p>
        </div>

        <div className={styles.offers}>
          <article className={styles.offer} data-product="resume-builder">
            <div className={styles.assetFrame}>
              <Image className={styles.resumeImage} src="/optimized/resume-builder-logo-header.webp"
                width={500} height={410} sizes="(max-width: 800px) 88px, 132px"
                alt="Official TRADE HUSTL3 Resume Builder badge" priority />
            </div>
            <div className={styles.content}>
              <p className={styles.cardKicker}>CAREER TOOL · FREE PREVIEW</p>
              <h2 className={styles.title}>Skilled-Trades Resume Builder</h2>
              <p className={styles.description}>ATS-friendly resume + matching cover letter. Preview before you pay.</p>
              <p className={styles.price}>Free preview · $9.99 one-time · No subscription</p>
              <Link className={styles.button} href="#resume-start" data-analytics-event="cta_click"
                data-location="homepage_storefront_resume" data-destination="#resume-start"
                data-item="resume_builder">Build My Free Preview <span aria-hidden="true">→</span></Link>
            </div>
          </article>

          <article className={styles.offer} data-product="the-book">
            <div className={styles.assetFrame}>
              <Image className={styles.bookImage} src="/optimized/book-cover-v3.webp"
                width={360} height={540} sizes="(max-width: 800px) 80px, 115px"
                alt="Official TRADE HUSTL3 book cover" priority />
            </div>
            <div className={styles.content}>
              <p className={styles.cardKicker}>THE BOOK · BY ZACHARY ELLIS</p>
              <h2 className={styles.title}>TRADE HUSTL3 — The Book</h2>
              <p className={styles.description}>Practical trade knowledge, career direction, and paths to more opportunity.</p>
              <p className={styles.price}>Kindle ${AMAZON_KINDLE.price} · Paperback ${AMAZON_PAPERBACK.price}</p>
              <a className={styles.button} href={AMAZON_PAPERBACK.url} target="_blank" rel="noopener noreferrer"
                data-analytics-event="cta_click" data-location="homepage_storefront_book"
                data-destination={AMAZON_PAPERBACK.url} data-item="amazon_paperback">Buy on Amazon <span aria-hidden="true">↗</span></a>
              <a className={styles.secondary} href={AMAZON_KINDLE.url} target="_blank" rel="noopener noreferrer"
                data-analytics-event="cta_click" data-location="homepage_storefront_book_kindle"
                data-destination={AMAZON_KINDLE.url} data-item="amazon_kindle">Shop Kindle edition <span aria-hidden="true">↗</span></a>
            </div>
          </article>
        </div>

        <div className={styles.trustStrip} aria-label="What makes TRADE HUSTL3 different">
          <p><strong>BUILT BY A TRADESMAN</strong><span>10+ years in HVAC and facilities maintenance</span></p>
          <Link className={styles.sampleLink} href="/resume-examples/skilled-trades"
            data-analytics-event="select_content" data-location="homepage_storefront_proof"
            data-destination="/resume-examples/skilled-trades" data-item="resume_example">
            <Image src="/sample-hvac-resume.webp" width={48} height={64} alt="Example HVAC resume thumbnail" />
            <span>See a sample resume <span aria-hidden="true">↗</span></span>
          </Link>
          <p><strong>NO SUBSCRIPTION</strong><span>Preview free. Unlock once.</span></p>
        </div>

        <nav className={styles.tradeNav} aria-label="Explore skilled trades">
          <ul className={styles.tradeList}>
            {tradeLinks.map(({ label, href, tool }) => (
              <li key={href}>
                <Link href={href} data-analytics-event="select_content"
                  data-location="homepage_storefront_trades" data-destination={href} data-item={label}>
                  <ToolSilhouette name={tool} size={28} />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.leadMagnets} aria-label="Free guides and book sample">
          <Link href="/top-10-trades" data-analytics-event="cta_click"
            data-location="homepage_storefront_free_guide" data-destination="/top-10-trades"
            data-item="top_10_trades"><span><strong>FREE TOP 10 TRADES GUIDE</strong>Find a path in the trades.</span><span aria-hidden="true">↗</span></Link>
          <Link href="/book/sample" data-analytics-event="cta_click"
            data-location="homepage_storefront_book_sample" data-destination="/book/sample"
            data-item="book_sample"><span><strong>FREE 7-PAGE BOOK SAMPLE</strong>Read before you buy.</span><span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </section>
  );
}
