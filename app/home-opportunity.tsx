import Image from 'next/image';
import Link from 'next/link';
import { VerifiedCustomerReviews } from './customer-reviews';
import { ResumePreviewCta } from './home-resume-preview-cta';
import styles from './home-storefront.module.css';
import design from './home-resume-redesign.module.css';

const resumeQuestions = [
  'Who are you?',
  'What can you do?',
  'What have you done?',
  'What qualifies you?',
  'Why should they consider you?',
];

export function TurnSkillsIntoOpportunity() {
  return (
    <section className={`${styles.resume} ${styles.resumeProduct} ${styles.goldDivider} ${design.resumeLight}`} id="opportunity" aria-label="TRADE HUSTL3 Resume Builder">
      <div className={design.handoff} aria-label="From the book to your next move">
        <p>The Next Chapter of Your Journey</p>
        <strong>Discover Your Trade. <span>Show What You Bring.</span></strong>
      </div>
      <Image className={`${design.atmosphere} ${design.resumeGraphic}`} src="/resume-success/trade-resume-check.webp" alt="" aria-hidden="true" width={500} height={650} />
      <Image className={`${design.atmosphere} ${design.handshake}`} src="/resume-success/hiring-handshake.webp" alt="" aria-hidden="true" width={960} height={640} />
      <div className={`${styles.resumeProductInner} ${design.content}`}>
        <h2 className={`${styles.resumeProductHeadline} ${design.originalHeadline}`}>Your Experience Matters. <span>Make Sure It Shows.</span></h2>
        <Image id="opportunity-title" className={`${styles.resumeProductLogo} ${design.logo}`}
          src="/optimized/resume-builder-logo-header.webp" alt="TRADE HUSTL3 Resume Builder"
          width={500} height={410} sizes="(max-width: 430px) 112px, (max-width: 669px) 26vw, 174px" />
        <p className={`${styles.resumeProductBenefit} ${design.benefitLine}`}>Your First Job. Your Next Opportunity. Your Move Into Leadership.</p>
        <p className={`${styles.resumeProductStory} ${design.story}`}>Whatever stage you’re in, your skills deserve to be represented. From school to a new trade or years in the field, organize your real training, certifications, skills, and work experience into a professional resume and cover letter.</p>
        <div className={design.intro}>
          <p className={design.kicker}>Your next move starts here</p>
          <h3><span>You&apos;ve got the skills.</span><br /><em>Does your resume prove it?</em></h3>
          <p>You know how to build it, fix it, maintain it, or operate it. Make your real skills, training, and experience easier for employers to recognize.</p>
        </div>
        <div className={design.productGrid}>
        <figure className={`${styles.resumeExample} ${design.sampleStage}`}>
          <figcaption className={`${styles.resumeExampleCaption} ${design.stageCaption}`}>
            <strong>Example output</strong><span>HVAC application · Illustrative candidate</span>
          </figcaption>
          <div className={styles.resumeExampleGrid}>
            <div>
              <p>Resume</p>
              <div className={styles.resumeExamplePaper}>
                <Image src="/sample-hvac-resume.webp" alt="Jordan Taylor’s sample HVAC resume with a professional summary, credentials and technical skills" width={816} height={1056} sizes="(max-width: 720px) 42vw, 315px" />
              </div>
            </div>
            <div>
              <p>Cover Letter</p>
              <div className={styles.resumeExamplePaper}>
                <Image src="/sample-hvac-cover-letter.webp" alt="Jordan Taylor’s matching sample cover letter for an HVAC maintenance technician opening" width={816} height={1056} sizes="(max-width: 720px) 42vw, 315px" />
              </div>
            </div>
          </div>
        </figure>
          <aside className={design.questionPanel} aria-label="Five questions for a stronger trade resume">
            <p className={design.kicker}>More than a blank template</p>
            <h3>A resume that <span>speaks your trade.</span></h3>
            <p>We help you organize your real experience around five questions:</p>
            <p className={design.panelLabel}>Five questions. One stronger story.</p>
            <ol className={design.questions}>
              {resumeQuestions.map((question, index) => <li key={question}><b>{String(index + 1).padStart(2, '0')}</b><span>{question}</span></li>)}
            </ol>
            <p className={design.newStarter}><strong>Just starting out?</strong> School projects, hands-on training, apprenticeships, and actual work experience can all help tell your story—without making anything up.</p>
          </aside>
        </div>
        <div className={design.graduateStage} aria-label="New opportunities for trade school graduates">
          <Image src="/resume-success/trades-graduate.webp" width={600} height={900} alt="Anonymous male trade school graduate silhouette" />
          <strong>Your Skills. Your Future.</strong>
          <Image src="/resume-success/female-trades-graduate.webp" width={600} height={900} alt="Anonymous female trade school graduate silhouette" />
        </div>
        <div className={`${styles.resumeProductAction} ${design.action}`} id="resume-start">
          <ResumePreviewCta />
          <p className={`${styles.resumeProductPrice} ${design.price}`}>See your preview before you pay · $9.99 one-time to unlock</p>
        </div>
        <p className={`${styles.resumeProductDetails} ${design.details}`}>Free watermarked preview. PDF and editable DOCX downloads after unlock.<br />Matching cover letter. Up to three AI-assisted corrections within seven days.</p>
        <VerifiedCustomerReviews className={styles.resumeProductReviews} />
        <div className={styles.resumeProductLinks}>
          <Link className={styles.textLink} href="/resume-examples/skilled-trades" data-analytics-event="cta_click" data-location="homepage_resume_builder" data-item="resume_examples">See more resume examples</Link>
          <Link className={styles.textLink} href="/resume-builder/refund-policy">Delivered or refunded · purchase protection</Link>
        </div>
      </div>
    </section>
  );
}
