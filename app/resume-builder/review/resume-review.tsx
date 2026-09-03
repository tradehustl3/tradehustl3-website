"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { scoreAtsReadiness, scoreCompletedResume, type AtsScore } from "../ats-score";

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
  intake: unknown;
  targetJobPosting: string | null;
};

const THEME_OPTIONS: { value: ResumeTheme; label: string; note: string }[] = [
  { value: "plain", label: "Plain — ATS Safe", note: "No background. Plain text throughout so applicant tracking systems parse it cleanly." },
  { value: "navy", label: "Navy — Styled", note: "A navy header band and gold accent line for a more designed look. Still real, selectable text." },
];

type GenerationFailure = {
  code?: string;
  retryable?: boolean;
  action?: "return_to_intake" | "retry_generation";
  paymentSafe?: boolean;
  runConsumed?: boolean;
  missing?: string[];
  intakeUrl?: string | null;
  message?: string;
};

function AtsScoreCard({ score, completed = false, compact = false }: { score: AtsScore; completed?: boolean; compact?: boolean }) {
  return (
    <section className={`rb-ats-card${compact ? " rb-ats-card-compact" : ""}`} aria-label={`${completed ? "Resume ATS" : "ATS readiness"} grade ${score.grade}`}>
      <div className="rb-ats-head">
        <div>
          <p>/ {completed ? "HUSTL3 RESUME ATS GRADE" : "HUSTL3 ATS READINESS GRADE"}</p>
          <h2>{completed ? "HOW THE FINISHED RESUME STACKS UP." : "HOW STRONG IS YOUR SOURCE INFO?"}</h2>
        </div>
        <div className="rb-ats-grade"><strong>{score.grade}</strong><span>{score.score} / 100</span></div>
      </div>
      <div className="rb-ats-meter" aria-hidden="true" style={{ "--ats-score": `${score.score}%` } as React.CSSProperties}><span /></div>
      <p className="rb-ats-label">{score.label}</p>
      <div className="rb-ats-columns">
        <div>
          <h4>What is working</h4>
          <ul>{score.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h4>What can raise the grade</h4>
          <ul>{score.improvements.length ? score.improvements.map((item) => <li key={item}>{item}</li>) : <li>No major readiness gaps detected from the information supplied.</li>}</ul>
        </div>
      </div>
      <small className="rb-ats-disclaimer">TRADE HUSTL3 ATS scores are guidance based on resume completeness, structure, trade relevance, and job-posting alignment. They do not guarantee acceptance by any employer or applicant tracking system.</small>
    </section>
  );
}

export function ResumeReview() {
  const [resumeId] = useState(() => typeof window === "undefined"
    ? ""
    : new URLSearchParams(window.location.search).get("resume_id") ?? "");
  const [autoBuild] = useState(() => typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("build") === "1");
  const autoBuildFired = useRef(false);
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [message, setMessage] = useState("");
  const [intakeNotice, setIntakeNotice] = useState<GenerationFailure | null>(null);
  const [themeSaving, setThemeSaving] = useState(false);

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

  // The guided wizard sends the user here with ?build=1 to start the first
  // protected preview automatically. This still routes through the same
  // /generate endpoint, entitlement checks, and intake-correction handling.
  useEffect(() => {
    if (!autoBuild || autoBuildFired.current) return;
    if (loading || working || !resume) return;
    if (resume.previewUrl || resume.paid) return;
    autoBuildFired.current = true;
    void runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBuild, loading, working, resume]);

  async function runGeneration(correctionRequest?: string) {
    if (!resumeId) return;
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
        if (result.action === "return_to_intake" && result.intakeUrl) {
          setIntakeNotice(result);
          return;
        }
        throw new Error(result.message || "We could not complete this HUSTL3 BOT run.");
      }
      await load(resumeId);
      setMessage(correctionRequest ? "Correction applied. Review the updated watermarked copy." : "Your first resume is ready for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not complete this HUSTL3 BOT run.");
    } finally {
      setWorking(false);
    }
  }

  async function submitCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const correction = String(form.get("correctionRequest") ?? "").trim();
    if (!correction) return;
    await runGeneration(correction);
    event.currentTarget.reset();
  }

  async function updateTheme(theme: ResumeTheme) {
    if (!resumeId || !resume || resume.theme === theme || themeSaving) return;
    const previous = resume.theme;
    setThemeSaving(true);
    setResume({ ...resume, theme });
    try {
      const response = await fetch(`/api/resume-builder/resumes/${encodeURIComponent(resumeId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (!response.ok) throw new Error("We could not save your template choice.");
    } catch (error) {
      setResume((current) => current ? { ...current, theme: previous } : current);
      setMessage(error instanceof Error ? error.message : "We could not save your template choice.");
    } finally {
      setThemeSaving(false);
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
  const scoreInput = {
    intake: resume.intake,
    trade: resume.trade,
    title: resume.title,
    targetJobPosting: resume.targetJobPosting,
  };
  const atsScore = hasDraft
    ? scoreCompletedResume({ ...scoreInput, theme: resume.theme, hasPreview: true })
    : scoreAtsReadiness(scoreInput);

  return (
    <div className="rb-review-workspace">
      <section className="rb-review-topbar">
        <div><p className="rb-kicker">/ YOUR RESUME WORKSPACE</p><h1>{resume.title}</h1><span>{resume.trade}</span></div>
        <div className="rb-run-meter" aria-label={`${resume.runsUsed} of ${resume.runsTotal} HUSTL3 BOT runs used`}>
          <div><span>HUSTL3 BOT runs</span><strong>{resume.runsUsed} / {resume.runsTotal}</strong></div>
          <ol>{Array.from({ length: resume.runsTotal }, (_, index) => <li className={index < resume.runsUsed ? "used" : ""} key={index} />)}</ol>
          <small>Initial build + 3 corrections</small>
        </div>
      </section>

      <AtsScoreCard score={atsScore} completed={hasDraft} />

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
          <p className="rb-intake-reassurance">This failed attempt used no HUSTL3 BOT run, and any previous resume files are unchanged.</p>
          <a className="rb-button rb-button-primary" href={intakeNotice.intakeUrl ?? "/resume-builder/intake"}>Return to intake <span>→</span></a>
        </section>
      ) : null}

      {!hasDraft ? (
        <section className="rb-first-build">
          <div className="rb-blueprint" aria-hidden="true"><span>ATS</span><i /><i /><i /><i /></div>
          <div><p className="rb-kicker">/ PREVIEW BEFORE YOU PAY</p><h2>READY FOR THE FIRST BUILD.</h2><p>HUSTL3 BOT will organize only the experience and facts you provided—no invented licenses, employers, or results. You will review a protected, logo-watermarked copy before checkout.</p>
          <span className="rb-theme-label">Choose your template</span>
          {renderThemePicker()}
          <button className="rb-button rb-button-primary" type="button" disabled={working} onClick={() => void runGeneration()}>{working ? "Building your resume…" : "Build my watermarked preview"} <span>→</span></button></div>
        </section>
      ) : (
        <section className="rb-review-grid">
          <div className="rb-preview-panel">
            <div className="rb-preview-toolbar"><div><span className="rb-status-dot" />{resume.paid ? "Clean paid resume" : "Protected watermarked preview"}</div><small>{resume.paid ? "Watermark removed · clean files below" : "Preview only · pay to remove watermark"}</small></div>
            <iframe key={`${resume.previewUrl}-${resume.runsUsed}-${resume.paid}`} src={resume.paid && resume.downloads ? `${resume.downloads.pdf}?view=1&run=${resume.runsUsed}` : `${resume.previewUrl}?run=${resume.runsUsed}`} title={resume.paid ? "Clean paid resume" : "Watermarked resume preview"} />
          </div>

          <aside className="rb-review-sidebar">
            <AtsScoreCard score={atsScore} completed compact />
            <div className="rb-review-status"><p className="rb-kicker">/ {resume.paid ? "REVIEW + REFINE" : "PREVIEW BEFORE YOU PAY"}</p><h2>{resume.paid ? "MAKE IT SOUND LIKE YOU." : "LIKE WHAT YOU SEE?"}</h2><p className="rb-review-desc">{resume.paid ? "Check names, dates, certifications, job duties, and contact information before downloading." : "Your first resume is ready. Pay once to remove the watermark, unlock the clean PDF and DOCX, and receive up to three corrections."}</p>
              <span className="rb-theme-label">Template</span>
              {renderThemePicker()}
              <small className="rb-theme-note">Switching styles applies the next time you {resume.paid ? "submit a correction" : "build a preview"}.</small>
            </div>

            {resume.paid ? <form className="rb-correction-form" onSubmit={submitCorrection}>
              <div className="rb-correction-count"><strong>{resume.correctionsRemaining}</strong><span>HUSTL3 BOT corrections remaining</span></div>
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
