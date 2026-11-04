import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CtaAnalytics } from '../../../cta-analytics';
import styles from '../page.module.css';
import { BrandLockup } from '../../../brand-lockup';

export const metadata: Metadata = {
  title: 'Your 7-Page TRADE HUSTL3 Book Sample',
  description: 'Read the free 7-page TRADE HUSTL3 book sample.',
  robots: { index: false, follow: false },
};

/**
 * Pages 1, 3 and 5–8 of the final paperback interior uploaded to KDP on
 * 2026-11-03 (486 pages). Text is verbatim from that file; the downloadable
 * PDF (worker/assets/trade-hustl3-seven-page-book-sample.pdf) is cut from the
 * same file. Update both together if the book is ever re-released.
 */
const tableOfContents = [
  ['PART I — BUILD THE FOUNDATION', ''],
  ['1. What a Skilled Trade Really Is', '5'],
  ['2. Why Skilled Trades Are in High Demand', '30'],
  ['3. College vs. Trades: The Real Math', '45'],
  ['4. The No-Experience Path', '62'],
  ['5. Learning on the Job', '84'],
  ['6. Trade Myths That Keep People Broke', '104'],
  ['PART II — KNOW THE TRADESCAPE', ''],
  ['7. The Different Types of Skilled Trades', '127'],
  ['8. Construction Trades', '151'],
  ['9. Mechanical Trades: HVAC, Plumbing, Pipefitting, and Refrigeration', '176'],
  ['10. Electrical and Power Trades', '203'],
  ['11. Industrial, Energy, and Infrastructure Trades', '228'],
  ['12. Fabrication and Precision Trades', '254'],
  ['13. Service, Maintenance, and Facilities Trades', '272'],
  ['14. Personal Skilled Trades and Solo Ownership Paths', '291'],
  ['PART III — TURN SKILL INTO MONEY AND LEVERAGE', ''],
  ['15. Certifications That Actually Matter', '308'],
  ['16. How Pay Really Increases in the Trades', '325'],
  ['17. Side Work, Overtime, and Specialization', '340'],
  ['PART IV — TURN LEVERAGE INTO CONTROL', ''],
  ['18. From Employee to Owner', '359'],
  ['19. Choosing the Right Trade for You', '374'],
  ['20. The Trade Hustle 90-Day Action Plan', '402'],
  ['21. Final Word: Build Something That Belongs to You', '443'],
  ['Appendix A — 200 Skilled Trades', '468'],
  ['Appendix B — Training, Certification & Supply-House Resource Directory', '473'],
  ['Appendix C — Official Source Notes', '483'],
  ['About the Author', '486'],
];

const learningObjectives = [
  'Explain what makes work a skilled trade, beyond physical effort.',
  'Describe the six rungs of the trade ladder, from helper to owner.',
  'Compare the service, construction and installation, and industrial and facilities lanes inside one trade.',
  'Identify early habits that build value, such as finishing the job, protecting your reputation, and staying humble.',
];

/** Book pages 6–8, one entry per printed line group. Headings are marked with "## ". */
const samplePages: Array<{ bookPage: number; lines: string[] }> = [
  {
    bookPage: 6,
    lines: [
      'You have to learn how to move, how to think, how to work safely, how to use the tools, and how to stop making the same mistake twice.',
      'That first day taught Mr. HUSTL3 something that has stayed with me ever since:',
      'There is a difference between having a job and having a skill.',
      'A job can give you a paycheck.',
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
      '## So WHAT IS A SKILLED TRADE?',
      'A skilled trade is hands-on work that requires training, practice, technical knowledge, problem-solving, safety awareness, judgment, and responsibility.',
      'Read that again.',
      'Because skilled trades are not just about being good with your hands.',
      'Your hands are part of it.',
      'Your brain is part of it too.',
      'A skilled worker has to understand what they are looking at.',
      'What they are hearing.',
      'What they are measuring.',
      'What changed.',
      'What failed.',
      'What could be dangerous.',
      'And what needs to happen next.',
      'Electricians keep power moving.',
    ],
  },
  {
    bookPage: 7,
    lines: [
      'Plumbers keep clean water coming in and waste moving out safely.',
      'HVAC technicians keep homes and buildings heated, cooled, and ventilated.',
      'Welders join materials used in buildings, equipment, vehicles, and infrastructure.',
      'Maintenance technicians keep apartment communities, schools, hospitals, factories, warehouses, hotels, offices, and other facilities operating.',
      'Carpenters build.',
      'Machinists create precision parts.',
      'Pipefitters assemble critical piping systems.',
      'Equipment technicians keep machines running.',
      'Industrial maintenance workers troubleshoot systems companies may depend on every minute of the day.',
      'These workers are not “just working with their hands.”',
      'They are solving problems people depend on being solved correctly.',
      'A skilled trade is a trained ability applied to a real-world problem.',
      'That is why the word skilled matters.',
      '## HARD WORK MATTERS. SKILL CHANGES YOUR VALUE.',
      'I am not going to lie to you about the trades.',
      'There is hard work involved.',
      'You may carry material.',
      'Climb ladders.',
      'Work in heat.',
      'Work in the cold.',
      'Get dirty.',
      'Stand on your feet for hours.',
      'Crawl into places you would rather not crawl into.',
      'Start early.',
      'Stay late.',
      'Clean up after the work is finished.',
      'Some days will test you.',
      'That is real.',
      'I am not going to sell you a fantasy where everybody walks into a trade, puts on a clean uniform, grabs a tool bag, and immediately starts making big money.',
    ],
  },
  {
    bookPage: 8,
    lines: [
      'That is not how this works.',
      'But physical effort is only one level of the game.',
      'Anybody may be able to carry a box.',
      'Fewer people know what is inside the box.',
      'Fewer know where it goes.',
      'Fewer know how it connects to the rest of the system.',
      'Fewer understand what happens if it is installed incorrectly.',
      'Fewer know how to test the finished work.',
      'And fewer still can return six months later when the system stops working and figure out why.',
      'That is skill.',
      'A beginner may know how to remove a part.',
      'A skilled technician starts asking different questions.',
      'Why did that part fail?',
      'Was the part really the problem?',
      'What caused the failure?',
      'Is something else damaged?',
      'What measurements prove the diagnosis?',
      'How do I repair this safely?',
      'What needs to be checked before I leave?',
      'That is a different level of thinking.',
      'A person who only changes parts can stay busy.',
      'A person who understands how to diagnose problems builds value.',
      'Do not confuse motion with skill.',
      'You can work hard all day and still not be getting better.',
      'The goal is to work, learn, understand, and improve.',
      '## THE TOOLS ARE NOT THE TRADE',
      'A lot of people notice the tools first.',
      'The drills.',
      'Meters.',
      'Gauges.',
      'Torches.',
      'Welders.',
      'Tool bags.',
    ],
  },
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
            Your signup is complete. Read the cover, opening pages, table of contents, and the beginning of Chapter 1 below.
          </p>
          <a className={styles.readJump} href="#read">Start reading the 7 pages <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section className={styles.readerIntro} id="read" aria-labelledby="reader-title">
        <p className={styles.eyebrow}>THE SAMPLE</p>
        <h2 id="reader-title">7 PAGES. COVER INCLUDED.</h2>
        <p>The cover, title page, table of contents, and the opening of Chapter 1, taken from the final paperback interior.</p>
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
        </article>

        <article className={styles.bookPage} aria-label="Sample page 4 of 7 — Chapter 1">
          <span className={styles.pageNumber}>04 / 07</span>
          <div className={styles.chapterHeading}>
            <p>CHAPTER 1</p>
            <h3>WHAT A SKILLED TRADE REALLY IS</h3>
          </div>
          <div className={styles.learnBox}>
            <h4>WHAT YOU WILL LEARN</h4>
            <p>By the end of this chapter, you will be able to:</p>
            <ul>
              {learningObjectives.map((objective) => <li key={objective}>{objective}</li>)}
            </ul>
          </div>
          <h4>BEFORE I BECAME MR. HUSTL3</h4>
          <p>On my first day working in HVAC, I fell through an attic.</p>
          <p>Not once.</p>
          <p>Not twice.</p>
          <p><strong>Three times.</strong></p>
          <p>Three times in one day.</p>
          <p>That was my introduction to the skilled trades.</p>
          <p>There was no perfect first day. No walking onto the job already knowing what I was doing. No magic moment where somebody handed me a tool bag and suddenly I became Mr. HUSTL3.</p>
          <p>The field humbled me immediately.</p>
          <p>And looking back, I needed that.</p>
          <p>Because before you become skilled, you have to be willing to be unskilled.</p>
          <p>You have to be willing to say, “I don’t know.”</p>
          <p>You have to listen.</p>
          <p>You have to get corrected.</p>
          <footer>5</footer>
        </article>

        {samplePages.map(({ bookPage, lines }, index) => (
          <article key={bookPage} className={styles.bookPage} aria-label={`Sample page ${index + 5} of 7 — Chapter 1 continued`}>
            <span className={styles.pageNumber}>0{index + 5} / 07</span>
            {lines.map((line, lineIndex) =>
              line.startsWith('## ')
                ? <h4 key={`${bookPage}-${lineIndex}`}>{line.slice(3)}</h4>
                : <p key={`${bookPage}-${lineIndex}`}>{line}</p>,
            )}
            <footer>{bookPage}</footer>
          </article>
        ))}
      </section>

      <section className={styles.finish}>
        <div>
          <p className={styles.eyebrow}>YOU’VE ONLY SEEN THE START</p>
          <h2>KEEP READING. BUILD YOUR NEXT MOVE.</h2>
          <p>The full TRADE HUSTL3 book runs 21 chapters, each opening with learning objectives, plus a directory of 200 skilled trades, earning leverage, ownership, and a 90-Day Action Plan.</p>
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
