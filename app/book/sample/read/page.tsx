import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CtaAnalytics } from '../../../cta-analytics';
import styles from '../page.module.css';
import { BrandLockup } from '../../../brand-lockup';
import { BOOK_BACK_MATTER, BOOK_PARTS, BOOK_CHAPTER_COUNT } from '../../book-contents';

export const metadata: Metadata = {
  title: 'Your 7-Page TRADE HUSTL3 Book Sample',
  description: 'Read the free 7-page TRADE HUSTL3 book sample.',
  robots: { index: false, follow: false },
};

// Same source as /book: the final paperback's Contents page.
const tableOfContents: Array<[string, string]> = [
  ...BOOK_PARTS.flatMap((part): Array<[string, string]> => [
    [`${part.label} — ${part.title.toUpperCase()}`, ''],
    ...part.chapters.map((chapter): [string, string] => [`${chapter.number}. ${chapter.title}`, String(chapter.page)]),
  ]),
  ...BOOK_BACK_MATTER.map((item): [string, string] => [item.title, String(item.page)]),
];

const samplePages = [
  [
    'A skill can give you leverage.',
    'And once I understood that, I started looking at work differently.',
    'That is what this book is about.',
    'Not just getting hired.',
    'Not just finding something to do after high school.',
    'Not just making enough money to survive until Friday.',
    'This is about building something that belongs to you.',
    'Something you can improve.',
    'Something you can carry into another company, another city, another position, another industry, and eventually—if that is your goal—into a business of your own.',
    'That something is skill.',
    'And skill changes the game.',
    'SO WHAT IS A SKILLED TRADE?',
    'A skilled trade is hands-on work that requires training, practice, technical knowledge, problem-solving, safety awareness, judgment, and responsibility.',
    'Read that again.',
    'Because skilled trades are not just about being good with your hands.',
    'Your hands are part of it. Your brain is part of it too.',
    'A skilled worker has to understand what they are looking at, what they are hearing, what they are measuring, what changed, what failed, what could be dangerous, and what needs to happen next.',
  ],
  [
    'Electricians keep power moving.',
    'Plumbers keep clean water coming in and waste moving out safely.',
    'HVAC technicians keep homes and buildings heated, cooled, and ventilated.',
    'Welders join materials used in buildings, equipment, vehicles, and infrastructure.',
    'Maintenance technicians keep apartment communities, schools, hospitals, factories, warehouses, hotels, offices, and other facilities operating.',
    'Carpenters build. Machinists create precision parts. Pipefitters assemble critical piping systems.',
    'Equipment technicians keep machines running. Industrial maintenance workers troubleshoot systems companies may depend on every minute of the day.',
    'These workers are not “just working with their hands.” They are solving problems people depend on being solved correctly.',
    'A skilled trade is a trained ability applied to a real-world problem.',
    'That is why the word skilled matters.',
    'HARD WORK MATTERS. SKILL CHANGES YOUR VALUE.',
    'I am not going to lie to you about the trades. There is hard work involved.',
    'You may carry material. Climb ladders. Work in heat. Work in the cold. Get dirty.',
  ],
  [
    'Stand on your feet for hours. Crawl into places you would rather not crawl into. Start early. Stay late. Clean up after the work is finished.',
    'Some days will test you. That is real.',
    'I am not going to sell you a fantasy where everybody walks into a trade, puts on a clean uniform, grabs a tool bag, and immediately starts making big money.',
    'That is not how this works.',
    'But physical effort is only one level of the game.',
    'Anybody may be able to carry a box. Fewer people know what is inside the box. Fewer know where it goes. Fewer know how it connects to the rest of the system.',
    'Fewer understand what happens if it is installed incorrectly. Fewer know how to test the finished work.',
    'And fewer still can return six months later when the system stops working and figure out why.',
    'That is skill.',
    'A beginner may know how to remove a part. A skilled technician starts asking different questions.',
    'Why did that part fail? Was the part really the problem?',
  ],
];

export default function BookSampleReaderPage() {
  return (
    <main className={styles.page}>
      <CtaAnalytics />

      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="TRADE HUSTL3 home">
          <BrandLockup />
        </Link>
        <nav aria-label="Book sample reader navigation">
          <Link href="/book">The full book</Link>
          <Link href="/top-10-trades">Top 10 Trades</Link>
          <a className={styles.navCta} href="#read">Read 7 pages</a>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.coverWrap}>
          <div className={styles.coverGlow} aria-hidden="true" />
          <Image
            className={styles.cover}
            src="/optimized/book-cover-v3.webp"
            alt="TRADE HUSTL3: Built by Hustle, Backed by Trades book cover"
            width={1024}
            height={1536}
            priority
          />
        </div>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>YOUR FREE 7-PAGE BOOK SAMPLE</p>
          <h1>YOUR SAMPLE<br /><span>IS READY.</span></h1>
          <p className={styles.lede}>
            Your signup is complete. Read the title page, the full table of contents, and the beginning of Chapter 1 below.
          </p>
          <a className={styles.readJump} href="#read">Start reading the 7 pages <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section className={styles.readerIntro} id="read" aria-labelledby="reader-title">
        <p className={styles.eyebrow}>THE SAMPLE</p>
        <h2 id="reader-title">7 PAGES. COVER INCLUDED.</h2>
        <p>The cover, title page, full contents, and the opening of Chapter 1 from the current TRADE HUSTL3 edition.</p>
      </section>

      <section className={styles.reader} aria-label="Seven-page TRADE HUSTL3 book sample">
        <article className={`${styles.bookPage} ${styles.coverPage}`} aria-label="Sample page 1 of 7 — cover">
          <span className={styles.pageNumber}>01 / 07</span>
          <Image src="/optimized/book-cover-v3.webp" alt="TRADE HUSTL3 book cover" width={1024} height={1536} />
        </article>

        <article className={`${styles.bookPage} ${styles.titlePage}`} aria-label="Sample page 2 of 7 — title page">
          <span className={styles.pageNumber}>02 / 07</span>
          <div>
            <h3>TRADE HUSTL3</h3>
            <p>Built by Hustle, Backed by Trades</p>
            <p>ENTER • EARN • ELEVATE</p>
            <small>Zachary C. Ellis</small>
          </div>
        </article>

        <article className={`${styles.bookPage} ${styles.tocPage}`} aria-label="Sample page 3 of 7 — table of contents">
          <span className={styles.pageNumber}>03 / 07</span>
          <h3>CONTENTS</h3>
          <div className={styles.tocList}>
            {tableOfContents.map(([title, page]) => (
              <div key={title} className={page ? '' : styles.tocPart}>
                <span>{title}</span><b>{page}</b>
              </div>
            ))}
          </div>
          <footer>TRADE HUSTL3 · Built by Hustle, Backed by Trades</footer>
        </article>

        <article className={styles.bookPage} aria-label="Sample page 4 of 7 — Chapter 1">
          <span className={styles.pageNumber}>04 / 07</span>
          <div className={styles.chapterHeading}>
            <p>CHAPTER 1</p>
            <h3>WHAT A SKILLED TRADE REALLY IS</h3>
            <h4>BEFORE I BECAME THE MAINTENANCE MAN</h4>
          </div>
          <p>On my first day working in HVAC, I fell through an attic.</p>
          <p>Not once. Not twice. Three times. Three times in one day.</p>
          <p>That was my introduction to the skilled trades.</p>
          <p>There was no perfect first day. No walking onto the job already knowing what I was doing. No magic moment where somebody handed me a tool bag and suddenly I became the Maintenance Man.</p>
          <p>The field humbled me immediately. And looking back, I needed that.</p>
          <p>Because before you become skilled, you have to be willing to be unskilled.</p>
          <p>You have to be willing to say, “I don’t know.” You have to listen. You have to get corrected.</p>
          <p>You have to learn how to move, how to think, how to work safely, how to use the tools, and how to stop making the same mistake twice.</p>
          <p>That first day taught the Maintenance Man something that has stayed with me ever since:</p>
          <p><strong>There is a difference between having a job and having a skill.</strong></p>
          <p>A job can give you a paycheck.</p>
          <footer>TRADE HUSTL3 · Built by Hustle, Backed by Trades</footer>
        </article>

        {samplePages.map((paragraphs, index) => (
          <article key={index} className={styles.bookPage} aria-label={`Sample page ${index + 5} of 7 — Chapter 1 continued`}>
            <span className={styles.pageNumber}>0{index + 5} / 07</span>
            {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <footer>TRADE HUSTL3 · Built by Hustle, Backed by Trades</footer>
          </article>
        ))}
      </section>

      <section className={styles.finish}>
        <div>
          <p className={styles.eyebrow}>YOU’VE ONLY SEEN THE START</p>
          <h2>KEEP READING. BUILD YOUR NEXT MOVE.</h2>
          <p>The full TRADE HUSTL3 book runs {BOOK_CHAPTER_COUNT} chapters across four parts: the foundation, the trades themselves, turning skill into money and leverage, and ownership, ending with a 90-Day Action Plan.</p>
        </div>
        <Link className={styles.primaryButton} href="/book" data-cta="the-book" data-cta-location="book-sample-reader">
          Explore the full book <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className={styles.footer}>
        <Link href="/">TRADE HUSTL<span>3</span> LLC</Link>
        <p>BUILT BY HUSTL3. BACKED BY TRADES.</p>
        <nav aria-label="Footer links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Support</Link>
        </nav>
      </footer>
    </main>
  );
}
