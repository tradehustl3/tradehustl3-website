import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CtaAnalytics } from '../../../cta-analytics';
import styles from '../page.module.css';

export const metadata: Metadata = {
  title: 'Your 7-Page TRADE HUSTL3 Book Sample',
  description: 'Read the free 7-page TRADE HUSTL3 book sample.',
  robots: { index: false, follow: false },
};

const tableOfContents = [
  ['PART I — BUILD THE FOUNDATION', ''],
  ['1. What a Skilled Trade Really Is', '3'],
  ['2. Why Skilled Trades Are in High Demand', '37'],
  ['3. College vs. Trades: The Real Math', '57'],
  ['4. The No-Experience Path', '77'],
  ['5. Learning on the Job', '105'],
  ['6. Trade Myths That Keep People Broke', '131'],
  ['PART II — KNOW THE LANDSCAPE', ''],
  ['7. The Different Types of Skilled Trades', '160'],
  ['8. Construction Trades', '190'],
  ['9. Mechanical Trades: HVAC, Plumbing, Pipefitting, and Refrigeration', '221'],
  ['10. Electrical and Power Trades', '254'],
  ['11. Industrial, Energy, and Infrastructure Trades', '284'],
  ['12. Fabrication and Precision Trades', '318'],
  ['13. Service, Maintenance, and Facilities Trades', '339'],
  ['14. Personal Skilled Trades and Solo Ownership Paths', '362'],
  ['PART III — TURN SKILL INTO MONEY AND LEVERAGE', ''],
  ['15. Certifications That Actually Matter', '382'],
  ['16. How Pay Really Increases in the Trades', '400'],
  ['17. Side Work, Overtime, and Specialization', '419'],
  ['PART IV — TURN LEVERAGE INTO CONTROL', ''],
  ['18. From Employee to Owner', '440'],
  ['19. Choosing the Right Trade for You', '459'],
  ['20. The Trade Hustle 90-Day Action Plan', '495'],
  ['21. Final Word: Build Something That Belongs to You', '534'],
  ['APPENDIX A — 200 SKILLED TRADES', '566'],
  ['APPENDIX B — TRAINING, CERTIFICATION & SUPPLY-HOUSE RESOURCE DIRECTORY', '574'],
  ['APPENDIX C — OFFICIAL SOURCE NOTES', '584'],
  ['ABOUT THE AUTHOR', '586'],
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
          <Image src="/trade-hustl3-logo.png" alt="TRADE HUSTL3 logo" width={56} height={56} priority />
          <span>TRADE HUSTL<span>3</span></span>
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
            src="/trade-hustl3-book-cover.jpg"
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
        <p>These are the opening seven pages of the current TRADE HUSTL3 eBook interior.</p>
      </section>

      <section className={styles.reader} aria-label="Seven-page TRADE HUSTL3 book sample">
        <article className={`${styles.bookPage} ${styles.coverPage}`} aria-label="Sample page 1 of 7 — cover">
          <span className={styles.pageNumber}>01 / 07</span>
          <Image src="/trade-hustl3-book-cover.jpg" alt="TRADE HUSTL3 book cover" width={1024} height={1536} />
        </article>

        <article className={`${styles.bookPage} ${styles.titlePage}`} aria-label="Sample page 2 of 7 — title page">
          <span className={styles.pageNumber}>02 / 07</span>
          <div>
            <h3>TRADE HUSTL3</h3>
            <p>BUILT BY HUSTLE. BACKED BY TRADES.</p>
            <p>ENTER • EARN • ELEVATE</p>
            <small>By Zachary Ellis</small>
          </div>
        </article>

        <article className={`${styles.bookPage} ${styles.tocPage}`} aria-label="Sample page 3 of 7 — table of contents">
          <span className={styles.pageNumber}>03 / 07</span>
          <h3>TABLE OF CONTENTS</h3>
          <div className={styles.tocList}>
            {tableOfContents.map(([title, page]) => (
              <div key={title} className={page ? '' : styles.tocPart}>
                <span>{title}</span><b>{page}</b>
              </div>
            ))}
          </div>
          <footer>BUILT BY HUSTLE. BACKED BY TRADES. | PAGE 2</footer>
        </article>

        <article className={styles.bookPage} aria-label="Sample page 4 of 7 — Chapter 1">
          <span className={styles.pageNumber}>04 / 07</span>
          <div className={styles.chapterHeading}>
            <p>PART I — BUILD THE FOUNDATION</p>
            <p>CHAPTER 1</p>
            <h3>WHAT A SKILLED TRADE REALLY IS</h3>
            <h4>BEFORE I BECAME THE MAINTENANCE MAN</h4>
          </div>
          <p>On my first day working in HVAC, I fell through an attic.</p>
          <p>Not once. Not twice. Three times in one day.</p>
          <p>That was my introduction to the skilled trades.</p>
          <p>There was no perfect first day. No walking onto the job already knowing what I was doing. No magic moment where somebody handed me a tool bag and suddenly I became the Maintenance Man.</p>
          <p>The field humbled me immediately. And looking back, I needed that.</p>
          <p>Because before you become skilled, you have to be willing to be unskilled.</p>
          <p>You have to be willing to say, “I don’t know.” You have to listen. You have to get corrected.</p>
          <p>You have to learn how to move, how to think, how to work safely, how to use the tools, and how to stop making the same mistake twice.</p>
          <p>That first day taught the Maintenance Man something that has stayed with me ever since:</p>
          <p><strong>There is a difference between having a job and having a skill.</strong></p>
          <p>A job can give you a paycheck.</p>
          <footer>BUILT BY HUSTLE. BACKED BY TRADES. | PAGE 3</footer>
        </article>

        {samplePages.map((paragraphs, index) => (
          <article key={index} className={styles.bookPage} aria-label={`Sample page ${index + 5} of 7 — Chapter 1 continued`}>
            <span className={styles.pageNumber}>0{index + 5} / 07</span>
            {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <footer>BUILT BY HUSTLE. BACKED BY TRADES. | PAGE {index + 4}</footer>
          </article>
        ))}
      </section>

      <section className={styles.finish}>
        <div>
          <p className={styles.eyebrow}>YOU’VE ONLY SEEN THE START</p>
          <h2>KEEP READING. BUILD YOUR NEXT MOVE.</h2>
          <p>The full TRADE HUSTL3 book expands into 21 chapters, more than 200 skilled trades, earning leverage, ownership, and a 90-day action plan.</p>
        </div>
        <Link className={styles.primaryButton} href="/book" data-cta="the-book" data-cta-location="book-sample-reader">
          Explore the full book <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className={styles.footer}>
        <Link href="/">TRADE HUSTL<span>3</span> LLC</Link>
        <p>Built by Hustle, Backed by Trades.</p>
        <nav aria-label="Footer links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Support</Link>
        </nav>
      </footer>
    </main>
  );
}
