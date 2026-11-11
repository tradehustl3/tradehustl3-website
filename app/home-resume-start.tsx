import { AccountStart } from './resume-builder/account-start';
import { rbFont } from './resume-builder/rb-font';
import styles from './home-traffic-director.module.css';

/**
 * The verified-account entry to the Resume Builder (`#resume-start`).
 * Shared by the hub homepage and the resume-first campaign layout. Every
 * "Build my free preview" CTA on the site points here, and
 * ResumeBuilderStartAnalytics observes this section by its id.
 */
export function ResumeStartSection({ compact = false }: { compact?: boolean } = {}) {
  return (
    <section className={compact ? `${styles.startSection} home-unified-resume-entry` : styles.startSection} id="resume-start" aria-labelledby={compact ? "opportunity-title" : "resume-start-title"}>
      {!compact && <div className={styles.startIntro}>
        <p className={styles.eyebrow}>START YOUR RESUME</p>
        <h2 id="resume-start-title">{compact ? "Start with your email." : "ONE PAGE TO LEARN IT. ONE PLACE TO START IT."}</h2>
        {compact ? <p>Verify your account to start your free preview. Your work is saved so you can pick up on another device.</p> : <>
          <p>You already know what the Resume Builder does. Start here with your verified account, then go straight into your trade experience, resume system, preview, and download flow.</p>
          <div className={styles.startPath} aria-label="Resume Builder stages">
            <span>Account</span><i>→</i><span>Experience</span><i>→</i><span>Choose system</span><i>→</i><span>Preview</span><i>→</i><span>Unlock</span>
          </div>
          <div className={styles.startHighlights} aria-label="What happens after you start">
            <div><span aria-hidden="true">01</span><strong>Bring your experience</strong><small>Upload a resume or answer guided trade questions.</small></div>
            <div><span aria-hidden="true">02</span><strong>See your preview</strong><small>Review the finished structure before you pay.</small></div>
            <div><span aria-hidden="true">03</span><strong>Take your files</strong><small>Unlock PDF and editable DOCX when you are ready.</small></div>
          </div>
        </>}
      </div>}
      <aside className={`${styles.startPanel} rb-scope ${rbFont.variable}`}>
        <p className={styles.startIndex}>Account · stage 1 of 5</p>
        {!compact && <h3>Build my resume</h3>}
        {!compact && <p>Create or verify your account. Your work is saved to your account so you can continue across devices.</p>}
        <AccountStart />
      </aside>
    </section>
  );
}
