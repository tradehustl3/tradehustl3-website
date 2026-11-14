import Image from 'next/image';
import Link from 'next/link';
import { VerifiedCustomerReviews } from './customer-reviews';
import { ResumePreviewCta } from './home-resume-preview-cta';
import styles from './home-storefront.module.css';

export function TurnSkillsIntoOpportunity() {
  return (
    <section className={`${styles.resume} ${styles.resumeProduct} ${styles.goldDivider}`} id="opportunity" aria-label="TRADE HUSTL3 Resume Builder">
      <div className={styles.resumeProductInner}>
        <h2 className={styles.resumeProductHeadline}>Your Experience Matters. <span>Make Sure It Shows.</span></h2>
        <Image id="opportunity-title" className={styles.resumeProductLogo}
          src="/optimized/resume-builder-logo-header.webp" alt="TRADE HUSTL3 Resume Builder"
          width={500} height={410} sizes="(max-width: 430px) 112px, (max-width: 669px) 26vw, 174px" />
        <p className={styles.resumeProductBenefit}>Your First Job. Your Next Opportunity. Your Move Into Leadership.</p>
        <p className={styles.resumeProductStory}>Whatever stage you’re in, your skills deserve to be represented. From school to a new trade or years in the field, organize your real training, certifications, skills, and work experience into a professional resume and cover letter.</p>
        <figure className={styles.resumeExample}>
          <figcaption className={styles.resumeExampleCaption}>
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
        <div className={styles.resumeProductAction} id="resume-start">
          <ResumePreviewCta />
          <p className={styles.resumeProductPrice}>See your preview before you pay · $9.99 one-time to unlock</p>
        </div>
        <p className={styles.resumeProductDetails}>Free watermarked preview. PDF and editable DOCX downloads after unlock.<br />Matching cover letter. Up to three AI-assisted corrections within seven days.</p>
        <VerifiedCustomerReviews className={styles.resumeProductReviews} />
        <div className={styles.resumeProductLinks}>
          <Link className={styles.textLink} href="/resume-examples/skilled-trades" data-analytics-event="cta_click" data-location="homepage_resume_builder" data-item="resume_examples">See more resume examples</Link>
          <Link className={styles.textLink} href="/resume-builder/refund-policy">Delivered or refunded · purchase protection</Link>
        </div>
      </div>
    </section>
  );
}
