"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type ResumeTheme = "plain" | "navy";

type Resume = {
  resumeId: string;
  trade: string;
  title: string;
  status: string;
  theme: ResumeTheme;
  paid: boolean;
  runsUsed: number;
  runsTotal: number;
  correctionsRemaining: number;
  previewUrl: string | null;
  downloads: { pdf: string; docx: string } | null;
  qualityScore: {
    total: number;
    label: string;
    issues: string[];
    dimensions: Record<string, number>;
  };
  bulletEditor: Array<{
    jobIndex: number;
    employer: string;
    jobTitle: string;
    bullets: Array<{
      bulletIndex: number;
      original: string;
      suggestion: string;
      choice: "suggestion" | "original" | "edited";
    }>;
  }>;
};

// Keep the persisted "navy" key for compatibility with existing drafts while
// presenting the two customer-facing choices that matter: black or red accent.
const THEME_OPTIONS: { value: ResumeTheme; label: string; note: string }[] = [
  { value: "plain", label: "Classic Black — Default", note: "White background, black text and black dividers. Simple, professional, and ATS-safe." },
  { value: "navy", label: "TRADE HUSTL3 Red Accent", note: "The same ATS-safe structure with true TRADE HUSTL3 red used only for clean section accents." },
];

type GenerationFailure = {
  code?: string;
  retryable?: boolean;
  action?: "return_to_intake" | "retry_generation" | "complete_payment";
  paymentSafe?: boolean;
  runConsumed?: boolean;
  missing?: string[];
  intakeUrl?: string | null;
  message?: string;
};

export function ResumeReview() {
  const [resumeId] = useState(() => typeof window === "undefined"
    ? ""
    : new URLSearchParams(window.location.search).get("resume_id") ?? "");
  const autoBuildFired = useRef(false);
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [message, setMessage] = useState("");
  const [intakeNotice, setIntakeNotice] = useState<GenerationFailure | null>(null);
  const [themeSaving, setThemeSaving] = useState(false);
  const [bulletSaving, setBulletSaving] = useState("");
  const [bulletDrafts, setBulletDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/resume-builder/resumes/${encodeURIComponent(id)}`, { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/resume-builder");
        return;
      }
      const result = await response.json() as { resume?: Resume; message?: string };
      if (!response.ok || !result.resume) throw new Error(result.message || "We could not load your resume.");
      setResume(result.resume);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not load your resume.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!resumeId) {
      queueMicrotask(() => {
        setMessage("This review link is missing the resume reference.");
        setLoading(false);
      });
      return;
    }
    queueMicrotask(() => void load(resumeId));
  }, [load, resumeId]);

  // Any unpaid draft without a preview starts its first protected build here.
  // This covers direct review links and interrupted navigation without relying
  // on a fragile query flag.
  useEffect(() => {
    if (autoBuildFired.current) return;
    if (loading || working || !resume) return;
    if (resume.previewUrl || resume.paid) return;
    autoBuildFired.current = true;
    void runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, working, resume]);

  async function runGeneration(correctionRequest?: string): Promise<boolean> {
    if (!resumeId) return false;
    setWorking(true);
    setMessage("");
    setIntakeNotice(null);
    try {
      const response = await fetch(`/api/resume-builder/resumes/${encodeURIComponent(resumeId)}/generate`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(correctionRequest ? { correctionRequest } : {}),
      });
      const result = await response.json() as GenerationFailure;
      if (!response.ok) {
        if (response.status === 401) {
          window.location.assign("/resume-builder");
          return false;
        }
        if (response.status === 402 || result.action === "complete_payment") {
          setMessage(result.message || "Complete the $9.99 payment before requesting a correction.");
          await load(resumeId);
          return false;
        }
        if (result.action === "return_to_intake" && result.intakeUrl) {
          setIntakeNotice(result);
          return false;
        }
        throw new Error(result.message || "We could not complete this AI run.");
      }
      await load(resumeId);
      setMessage(correctionRequest ? "Correction applied. Review the updated watermarked copy." : "Your first resume is ready for review.");
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not complete this AI run.");
      return false;
    } finally {
      setWorking(false);
    }
  }

  async function submitCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const correction = String(form.get("correctionRequest") ?? "").trim();
    if (!correction) return;
    const applied = await runGeneration(correction);
    if (applied) event.currentTarget.reset();
  }

  async function updateTheme(theme: ResumeTheme) {
    if (!resumeId || !resume || resume.theme === theme || themeSaving) return;
    const previous = resume.theme;
    setThemeSaving(true);
    setMessage("");
    setResume({ ...resume, theme });
    try {
      const response = await fetch(`/api/resume-builder/resumes/${encodeURIComponent(resumeId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "We could not save your template choice.");
      await load(resumeId);
      setMessage(result.message || "Resume style updated without using an AI run.");
    } catch (error) {
      setResume((current) => current ? { ...current, theme: previous } : current);
      setMessage(error instanceof Error ? error.message : "We could not save your template choice.");
    } finally {
      setThemeSaving(false);
    }
  }

  async function saveBullet(
    jobIndex: number,
    bulletIndex: number,
    choice: "suggestion" | "original" | "edited",
    suggestion: string,
  ) {
    if (!resumeId || bulletSaving) return;
    const key = `${jobIndex}:${bulletIndex}`;
    const editedText = bulletDrafts[key] ?? suggestion;
    setBulletSaving(key);
    setMessage("");
    try {
      const response = await fetch(`/api/resume-builder/resumes/${encodeURIComponent(resumeId)}/bullets`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIndex, bulletIndex, choice, ...(choice === "edited" ? { text: editedText } : {}) }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "We could not save that bullet.");
      await load(resumeId);
      setMessage(result.message || "Bullet saved without using an AI run.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not save that bullet.");
    } finally {
      setBulletSaving("");
    }
  }

  function renderThemePicker() {
    if (!resume) return null;
    return (
      <div className="rb-theme-picker" role="radiogroup" aria-label="Resume template style">
        {THEME_OPTIONS.map((option) => {
          const selected = resume.theme === option.value;
          return (
            <button
              type="button"
              key={option.value}
              role="radio"
              aria-checked={selected}
              className={`rb-trade-card${selected ? " rb-trade-card-on" : ""}`}
              disabled={themeSaving}
              onClick={() => void updateTheme(option.value)}
            >
              <span className="rb-trade-card-name">{option.label}</span>
              <span className="rb-trade-card-note">{option.note}</span>
            </button>
          );
        })}
      </div>
    );
  }

  async function startCheckout() {
    if (!resumeId) return;
    setCheckingOut(true);
    setMessage("");
    try {
      const response = await fetch(`/api/resume-builder/resumes/${encodeURIComponent(resumeId)}/checkout`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const result = await response.json() as { checkoutUrl?: string; message?: string };
      if (!response.ok || !result.checkoutUrl) throw new Error(result.message || "Secure checkout is temporarily unavailable.");
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Secure checkout is temporarily unavailable.");
      setCheckingOut(false);
    }
  }

  if (loading) {
    return <div className="rb-review-loading" role="status"><span /><p>Loading your secure workspace…</p></div>;
  }

  if (!resume) {
    return (
      <div className="rb-review-empty">
        <p className="rb-kicker">/ WORKSPACE UNAVAILABLE</p>
        <h1>LET’S GET YOU <span>BACK ON TRACK.</span></h1>
        <p>{message}</p>
        <a className="rb-button rb-button-primary" href="/resume-builder/intake">Return to your intake <span>→</span></a>
      </div>
    );
  }

  const hasDraft = Boolean(resume.previewUrl);

  return (
    <div className="rb-review-workspace">
      <section className="rb-review-topbar">
        <div><p className="rb-kicker">/ YOUR RESUME WORKSPACE</p><h1>{resume.title}</h1><span>{resume.trade}</span></div>
        <div className="rb-run-meter" aria-label={`${resume.runsUsed} of ${resume.runsTotal} AI runs used`}>
          <div><span>AI runs</span><strong>{resume.runsUsed} / {resume.runsTotal}</strong></div>
          <ol>{Array.from({ length: resume.runsTotal }, (_, index) => <li className={index < resume.runsUsed ? "used" : ""} key={index} />)}</ol>
          <small>Initial build + 3 corrections</small>
        </div>
      </section>

      {intakeNotice ? (
        <section className="rb-intake-notice" role="alert">
          <p className="rb-kicker">/ INTAKE UPDATE NEEDED</p>
          <h2>WE NEED A LITTLE MORE FROM YOU.</h2>
          <p>{intakeNotice.message}</p>
          {intakeNotice.missing?.length ? (
            <div className="rb-intake-missing">
              <strong>Review these intake sections:</strong>
              <ul>{intakeNotice.missing.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ) : null}
          <p className="rb-intake-reassurance">This failed attempt used no AI run, and any previous resume files are unchanged.</p>
          <a className="rb-button rb-button-primary" href={intakeNotice.intakeUrl ?? "/resume-builder/intake"}>Return to intake <span>→</span></a>
        </section>
      ) : null}

      {!hasDraft ? (
        <section className="rb-first-build">
          <div className="rb-blueprint" aria-hidden="true"><span>ATS</span><i /><i /><i /><i /></div>
          <div><p className="rb-kicker">/ PREVIEW BEFORE YOU PAY</p><h2>READY FOR THE FIRST BUILD.</h2><p>Our AI resume engine will organize only the experience and facts you provided—no invented licenses, employers, or results. You will review a protected, logo-watermarked copy before checkout.</p>
          <span className="rb-theme-label">Choose your resume style</span>
          {renderThemePicker()}
          <button className="rb-button rb-button-primary" type="button" disabled={working} onClick={() => void runGeneration()}>{working ? "Building your resume…" : "Build my watermarked preview"} <span>→</span></button></div>
        </section>
      ) : (
        <section className="rb-review-grid">
          <div className="rb-preview-panel">
            <div className="rb-preview-toolbar"><div><span className="rb-status-dot" />{resume.paid ? "Clean paid resume" : "Protected watermarked preview"}</div><small>{resume.paid ? "Watermark removed · clean files below" : "Preview only · pay to remove watermark"}</small></div>
            <iframe key={`${resume.previewUrl}-${resume.runsUsed}-${resume.paid}-${resume.theme}`} src={resume.paid && resume.downloads ? `${resume.downloads.pdf}?view=1&run=${resume.runsUsed}&style=${resume.theme}` : `${resume.previewUrl}?run=${resume.runsUsed}&style=${resume.theme}`} title={resume.paid ? "Clean paid resume" : "Watermarked resume preview"} />
          </div>

          <aside className="rb-review-sidebar">
            <div className="rb-review-status"><p className="rb-kicker">/ {resume.paid ? "REVIEW + REFINE" : "PREVIEW BEFORE YOU PAY"}</p><h2>{resume.paid ? "MAKE IT SOUND LIKE YOU." : "LIKE WHAT YOU SEE?"}</h2><p className="rb-review-desc">{resume.paid ? "Check names, dates, certifications, job duties, and contact information before downloading." : "Your first resume is ready. Pay once to remove the watermark, unlock the clean PDF and DOCX, and receive up to three corrections."}</p>
              <span className="rb-theme-label">Resume style</span>
              {renderThemePicker()}
              <small className="rb-theme-note">Switch between Classic Black and Red Accent without using an AI correction run. Your preview and final files keep the same resume content and structure.</small>
            </div>

            <section className="rb-quality-card" aria-labelledby="resume-quality-title">
              <div className="rb-quality-head">
                <div><p className="rb-kicker">/ RESUME QUALITY SCORE</p><h2 id="resume-quality-title">{resume.qualityScore.total}<span>/100</span></h2></div>
                <strong>{resume.qualityScore.label}</strong>
              </div>
              <p>Deterministic checks for complete work history, dates, credentials, ATS structure, and unsupported claims. Scoring uses no AI run.</p>
              {resume.qualityScore.issues.length ? <ul>{resume.qualityScore.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : <p className="rb-quality-pass">All verified jobs and protected facts passed the quality gate.</p>}
            </section>

            {resume.bulletEditor.length ? (
              <section className="rb-bullet-editor" aria-labelledby="bullet-editor-title">
                <p className="rb-kicker">/ HUSTL3 BOT BULLET WORKSHOP</p>
                <h2 id="bullet-editor-title">IMPROVE ONE BULLET AT A TIME.</h2>
                <p>We strengthen what you actually did. We never make up numbers, licenses, equipment experience, or certifications.</p>
                {resume.bulletEditor.map((job) => (
                  <div className="rb-bullet-job" key={job.jobIndex}>
                    <h3>{job.jobTitle}</h3><small>{job.employer}</small>
                    {job.bullets.map((bullet) => {
                      const key = `${job.jobIndex}:${bullet.bulletIndex}`;
                      const value = bulletDrafts[key] ?? bullet.suggestion;
                      const saving = bulletSaving === key;
                      return (
                        <article className="rb-bullet-card" key={key}>
                          <div className="rb-bullet-version"><strong>Original</strong><p>{bullet.original}</p></div>
                          <label htmlFor={`bullet-${job.jobIndex}-${bullet.bulletIndex}`}>HUSTL3 BOT suggestion</label>
                          <textarea
                            id={`bullet-${job.jobIndex}-${bullet.bulletIndex}`}
                            rows={4}
                            maxLength={500}
                            value={value}
                            disabled={Boolean(bulletSaving)}
                            onChange={(event) => setBulletDrafts((current) => ({ ...current, [key]: event.target.value }))}
                          />
                          <div className="rb-bullet-actions" aria-label={`Choose wording for bullet ${bullet.bulletIndex + 1}`}>
                            <button type="button" className={bullet.choice === "suggestion" ? "selected" : ""} disabled={Boolean(bulletSaving)} onClick={() => void saveBullet(job.jobIndex, bullet.bulletIndex, "suggestion", bullet.suggestion)}>Accept</button>
                            <button type="button" className={bullet.choice === "edited" ? "selected" : ""} disabled={Boolean(bulletSaving) || !value.trim()} onClick={() => void saveBullet(job.jobIndex, bullet.bulletIndex, "edited", bullet.suggestion)}>{saving ? "Saving…" : "Rewrite"}</button>
                            <button type="button" className={bullet.choice === "original" ? "selected" : ""} disabled={Boolean(bulletSaving)} onClick={() => void saveBullet(job.jobIndex, bullet.bulletIndex, "original", bullet.suggestion)}>Keep Original</button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ))}
                <small className="rb-bullet-note">Each choice updates the protected preview and final PDF + DOCX without using a correction run.</small>
              </section>
            ) : null}

            {resume.paid ? <form className="rb-correction-form" onSubmit={submitCorrection}>
              <div className="rb-correction-count"><strong>{resume.correctionsRemaining}</strong><span>AI corrections remaining</span></div>
              <label htmlFor="correctionRequest">What needs to change?</label>
              <textarea id="correctionRequest" name="correctionRequest" rows={6} maxLength={2000} required disabled={working || resume.correctionsRemaining < 1} placeholder="Example: Change the end date at Apex Mechanical to June 2025 and emphasize my rooftop-unit diagnostics." />
              <button className="rb-button rb-button-secondary-dark rb-button-full" type="submit" disabled={working || resume.correctionsRemaining < 1}>{working ? "Applying correction…" : resume.correctionsRemaining > 0 ? "Apply one correction" : "All corrections used"} <span>↻</span></button>
              <small>One submitted correction uses one run. Failed generations are restored automatically.</small>
            </form> : (
              <div className="rb-unpaid-card">
                <p className="rb-kicker">/ ONE-TIME PURCHASE</p>
                <h2>REMOVE THE WATERMARK.</h2>
                <p>Pay $9.99 once. No subscription. Clean PDF and editable DOCX unlock after Stripe confirms payment.</p>
                <button className="rb-button rb-button-primary rb-button-full" type="button" disabled={checkingOut} onClick={() => void startCheckout()}>{checkingOut ? "Opening secure checkout…" : "Unlock clean resume — $9.99"} <span>↗</span></button>
              </div>
            )}

            {resume.downloads ? (
              <div className="rb-downloads">
                <p>FINAL FILES</p>
                <a className="rb-download" href={resume.downloads.pdf}><span><strong>PDF</strong><small>Clean, ready to send</small></span><b>↓</b></a>
                <a className="rb-download" href={resume.downloads.docx}><span><strong>DOCX</strong><small>Clean, editable copy</small></span><b>↓</b></a>
              </div>
            ) : null}
          </aside>
        </section>
      )}

      {message ? <p className="rb-workspace-message" role="status">{message}</p> : null}
      {working ? <div className="rb-working-overlay" role="status"><span /><strong>HUSTL3 BOT IS BUILDING</strong><small>This can take a minute. Keep this page open.</small></div> : null}
    </div>
  );
}