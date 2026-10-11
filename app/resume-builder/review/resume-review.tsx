"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { CoverLetterPanel } from "./cover-letter-panel";
import { StyleControls } from "./style-controls";
import { defaultStyle, type ResumeStyle } from "../../../worker/resume-templates";
import { ProtectedPdfPreview } from "./protected-pdf-preview";
import { generationFailureIntakeUrl, intakeReturnUrl } from "../return-urls";

type ResumeTheme = "plain" | "navy" | "lead";
type PreviewTab = "resume" | "cover-letter";
type MessageTone = "info" | "success" | "error";

type Resume = {
  resumeId: string;
  trade: string;
  title: string;
  status: string;
  theme: ResumeTheme;
  style?: ResumeStyle;
  generationTrack: ResumeTheme;
  paid: boolean;
  runsUsed: number;
  runsTotal: number;
  correctionsRemaining: number;
  previewUrl: string | null;
  downloads: { pdf: string; docx: string } | null;
  coverLetter: {
    included: boolean;
    available: boolean;
    generated: boolean;
    correctionsRemaining: number;
    previewUrl: string | null;
    downloads: { pdf: string; docx: string } | null;
    companyName: string;
    hiringManager: string;
    targetJobTitle: string;
    needsTargetDetails?: boolean;
  } | null;
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
      /** Unpaid only: wording stays on the server until the package is unlocked. */
      locked?: boolean;
      original: string;
      suggestion: string;
      choice: "suggestion" | "original" | "edited";
    }>;
  }>;
  /** Unpaid only: bullets drawn as locked bars in the protected preview. */
  previewLockedBullets?: number;
};

const PACKAGE_INCLUDES = [
  "Every line of your resume — no watermark, nothing locked",
  "Clean PDF + editable Word (DOCX) resume",
  "Matching cover letter in PDF + Word",
  "Up to 3 AI corrections shared across both",
];

function LockIcon() {
  return (
    <svg className="rb-lock-icon" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M6 9V6.5a4 4 0 1 1 8 0V9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="3.5" y="9" width="13" height="8.5" rx="2" fill="currentColor" />
    </svg>
  );
}

// Persisted keys stay backward compatible while customers see the three
// production TRADE HUSTL3 resume systems.
const THEME_OPTIONS: { value: ResumeTheme; label: string; tagline: string; note: string }[] = [
  {
    value: "plain",
    label: "Field Pro",
    tagline: "Built for the work.",
    note: "Hands-on, direct, and ATS-safe. Technical skills, credentials, equipment, and field experience stay easy to scan.",
  },
  {
    value: "navy",
    label: "Modern Trade",
    tagline: "Technical. Clean. Professional.",
    note: "A sharper commercial look with stronger hierarchy, more white space, and polished technical positioning.",
  },
  {
    value: "lead",
    label: "Lead / Supervisor",
    tagline: "Built to lead the work.",
    note: "Leadership-first structure for foremen, leads, supervisors, facilities leaders, and senior tradespeople moving up.",
  },
];

type GenerationFailure = {
  code?: string;
  retryable?: boolean;
  action?: "review_exceptions" | "return_to_intake" | "retry_generation" | "complete_payment";
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
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  // Checkout can start from the fixed bar, far from the page-level notice, so its
  // failure is also shown right where the customer tapped.
  const [checkoutError, setCheckoutError] = useState("");
  const [message, setMessageText] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [retryGeneration, setRetryGeneration] = useState(false);
  const [intakeNotice, setIntakeNotice] = useState<GenerationFailure | null>(null);
  const [pendingTrack, setPendingTrack] = useState<ResumeTheme | null>(null);
  const trackChoiceRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (pendingTrack) trackChoiceRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [pendingTrack]);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [styleSaving, setStyleSaving] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);
  const [bulletSaving, setBulletSaving] = useState("");
  const [bulletDrafts, setBulletDrafts] = useState<Record<string, string>>({});
  const [activePreview, setActivePreview] = useState<PreviewTab>("resume");
  // The fixed unlock bar steps aside while the full purchase card is on screen,
  // so a customer never sees two checkout buttons stacked on top of each other.
  const unpaidCardRef = useRef<HTMLDivElement | null>(null);
  const [unpaidCardVisible, setUnpaidCardVisible] = useState(false);
  const showUnlockBar = Boolean(resume && resume.previewUrl && !resume.paid);
  useEffect(() => {
    const card = unpaidCardRef.current;
    if (!showUnlockBar || !card || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setUnpaidCardVisible(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(card);
    return () => observer.disconnect();
  }, [showUnlockBar]);

  // Presentation only: the tone picks the alert style; `retry` offers the same
  // first-build request again after a failed generation.
  const notify = useCallback((text: string, tone: MessageTone = "info", retry = false) => {
    setMessageText(text);
    setMessageTone(tone);
    setRetryGeneration(retry);
  }, []);

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
      notify(error instanceof Error ? error.message : "We could not load your resume.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (!resumeId) {
      queueMicrotask(() => {
        notify("This review link is missing the resume reference.", "error");
        setLoading(false);
      });
      return;
    }
    queueMicrotask(() => void load(resumeId));
  }, [load, notify, resumeId]);

  // The first preview is intentionally user-triggered. The customer chooses a
  // resume system first so HUSTL3 BOT can apply that writing profile on the
  // initial AI build instead of generating a generic default automatically.

  async function runGeneration(correctionRequest?: string, generationTrack?: ResumeTheme): Promise<boolean> {
    if (!resumeId) return false;
    setWorking(true);
    notify("");
    setIntakeNotice(null);
    try {
      const response = await fetch(`/api/resume-builder/resumes/${encodeURIComponent(resumeId)}/generate`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generationTrack ? { generationTrack } : correctionRequest ? { correctionRequest } : {}),
      });
      const result = await response.json() as GenerationFailure & { sourceRecovery?: boolean };
      if (!response.ok) {
        if (response.status === 401) {
          window.location.assign("/resume-builder");
          return false;
        }
        if (response.status === 402 || result.action === "complete_payment") {
          notify(result.message || "Complete the $9.99 payment before requesting a correction.", "error");
          await load(resumeId);
          return false;
        }
        const intakeUrl = generationFailureIntakeUrl(result, resumeId);
        if (intakeUrl) {
          setIntakeNotice({ ...result, intakeUrl });
          return false;
        }
        const reference = result.code ? ` (error: ${result.code})` : "";
        throw new Error(`${result.message || "We could not complete this AI run."}${reference}`);
      }
      await load(resumeId);
      notify(result.sourceRecovery
        ? "Your preview was built from the verified details in your upload because the AI rewrite was unavailable. Review it before continuing."
        : correctionRequest || generationTrack ? "Correction applied. Review the updated watermarked copy." : "Your first resume is ready for review.", "success");
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : "We could not complete this AI run.", "error", !correctionRequest && !generationTrack);
      return false;
    } finally {
      setWorking(false);
    }
  }

  async function submitCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // React clears event.currentTarget once this handler awaits, so keep the form.
    const formElement = event.currentTarget;
    const correction = String(new FormData(formElement).get("correctionRequest") ?? "").trim();
    if (!correction) return;
    if (await runGeneration(correction)) formElement.reset();
  }

  async function updateTheme(theme: ResumeTheme): Promise<boolean> {
    if (!resumeId || !resume || resume.theme === theme || themeSaving || styleSaving) return false;
    const previous = resume.theme;
    setThemeSaving(true);
    notify("");
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
      setPreviewRevision(value => value + 1);
      notify(result.message || "Resume style updated without using an AI run.", "success");
      return true;
    } catch (error) {
      setResume((current) => current ? { ...current, theme: previous } : current);
      notify(error instanceof Error ? error.message : "We could not save your template choice.", "error");
      return false;
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
    notify("");
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
      notify(result.message || "Bullet saved without using an AI run.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "We could not save that bullet.", "error");
    } finally {
      setBulletSaving("");
    }
  }

  function themeLabel(value: ResumeTheme): string {
    return THEME_OPTIONS.find((option) => option.value === value)?.label ?? "this style";
  }

  // Picking a style always changes the look right away unless a paid customer can
  // actually choose a rewrite: then a visible choice asks how to handle the wording.
  async function chooseStyle(value: ResumeTheme) {
    if (!resume || value === resume.theme) { setPendingTrack(null); return; }
    const generated = resume.status === "ready";
    const differsFromWriting = generated && value !== resume.generationTrack;
    if (differsFromWriting && resume.paid && resume.correctionsRemaining > 0) {
      setPendingTrack(value);
      return;
    }
    setPendingTrack(null);
    const switched = await updateTheme(value);
    if (switched && differsFromWriting) {
      notify(resume.paid
        ? `Look switched to ${themeLabel(value)} for free. Your wording stays written for ${themeLabel(resume.generationTrack)} because all three corrections have been used.`
        : `Look switched to ${themeLabel(value)} for free. Your wording stays written for ${themeLabel(resume.generationTrack)}. After you unlock the package, you can rewrite it for ${themeLabel(value)} with one correction.`, "success");
    }
  }

  function renderThemePicker() {
    if (!resume) return null;
    return (
      <>
      <div className="rb-theme-picker" role="radiogroup" aria-label="Resume system">
        {THEME_OPTIONS.map((option) => {
          const selected = resume.theme === option.value;
          return (
            <button
              type="button"
              key={option.value}
              role="radio"
              aria-checked={selected}
              className={`rb-trade-card${selected ? " rb-trade-card-on" : ""}${pendingTrack === option.value ? " rb-trade-card-pending" : ""}`}
              disabled={themeSaving || styleSaving || working}
              onClick={() => void chooseStyle(option.value)}
            >
              <span className={`rb-theme-preview rb-theme-preview-${option.value}`} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/resume-templates/${option.value}.png`} alt="" />
              </span>
              <span className="rb-trade-card-name">{option.label}</span>
              <span className="rb-theme-tagline">{option.tagline}</span>
              <span className="rb-trade-card-note">{option.note}</span>
            </button>
          );
        })}
      </div>
      {pendingTrack ? (
        <div className="rb-track-choice" ref={trackChoiceRef} role="group" aria-labelledby="track-choice-title" aria-live="polite">
          <p className="rb-kicker">Switching to {themeLabel(pendingTrack)}</p>
          <h3 id="track-choice-title">How should your wording change?</h3>
          <p>Your resume was written for <strong>{themeLabel(resume.generationTrack)}</strong>. Keep that wording with the new look for free, or have HUSTL3 BOT rewrite your resume and matching cover letter for <strong>{themeLabel(pendingTrack)}</strong> using only your verified facts.</p>
          <div className="rb-track-choice-actions">
            <button className="rb-button rb-button-primary" type="button" disabled={working || themeSaving || styleSaving} onClick={async () => { const track = pendingTrack; if (await runGeneration(undefined, track)) { await updateTheme(track); setPendingTrack(null); } }}>Rewrite for {themeLabel(pendingTrack)} <span aria-hidden="true">· 1 correction</span></button>
            <button className="rb-button rb-button-secondary-dark" type="button" disabled={working || themeSaving || styleSaving} onClick={async () => { const track = pendingTrack; setPendingTrack(null); await updateTheme(track); }}>Keep my wording <span aria-hidden="true">· free</span></button>
          </div>
          <button className="rb-track-choice-cancel" type="button" disabled={working || themeSaving || styleSaving} onClick={() => setPendingTrack(null)}>Cancel</button>
          <small>{resume.correctionsRemaining} of 3 shared corrections remaining. A rewrite uses exactly one and updates your resume and matching cover letter together.</small>
        </div>
      ) : null}
      </>
    );
  }

  async function startCheckout() {
    if (!resumeId) return;
    setCheckingOut(true);
    setCheckoutError("");
    notify("");
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
      const text = error instanceof Error ? error.message : "Secure checkout is temporarily unavailable.";
      notify(text, "error");
      setCheckoutError(text);
      setCheckingOut(false);
    }
  }

  function renderNotice() {
    if (!message) return null;
    if (messageTone === "error") {
      return (
        <div className="rb-alert" role="alert">
          <span className="rb-alert-icon" aria-hidden="true">!</span>
          <p className="rb-alert-title">{retryGeneration ? "We couldn’t build your preview" : "Something went wrong"}</p>
          <p className="rb-alert-body">{message}</p>
          {retryGeneration ? (
            <button className="rb-button rb-button-primary" type="button" disabled={working} onClick={() => void runGeneration()}>Try again</button>
          ) : null}
        </div>
      );
    }
    return <p className={`rb-workspace-message rb-workspace-message-${messageTone}`} role="status">{message}</p>;
  }

  // Shown under an unpaid preview. The locked lines themselves are drawn by the
  // server; this only explains them and puts checkout next to what was locked.
  function renderLockNote(text: string) {
    return (
      <div className="rb-lock-note">
        <p><LockIcon /><span>{text} Unlock the package to see every line and download clean files.</span></p>
        <button className="rb-button rb-button-primary" type="button" disabled={checkingOut} onClick={() => void startCheckout()}>{checkingOut ? "Opening checkout…" : "Unlock — $9.99"}</button>
      </div>
    );
  }

  if (loading) {
    return <div className="rb-review-loading" role="status"><span /><p>Loading your secure workspace…</p></div>;
  }

  if (!resume) {
    return (
      <div className="rb-review-empty">
        <p className="rb-kicker">Workspace unavailable</p>
        <h1>Let’s get you <span>back on track.</span></h1>
        <p>{message}</p>
        <a className="rb-button rb-button-primary" href={intakeReturnUrl(resumeId)}>Return to your intake <span>→</span></a>
      </div>
    );
  }

  const hasDraft = Boolean(resume.previewUrl);
  const lockedBullets = resume.paid ? 0 : resume.previewLockedBullets ?? 0;
  const checkoutLabel = checkingOut ? "Opening secure checkout…" : "Unlock full resume + cover letter — $9.99";
  const coverLetter = resume.coverLetter;
  const coverPreviewReady = Boolean(coverLetter?.generated && coverLetter.previewUrl);
  const resumePreviewSrc = resume.paid && resume.downloads
    ? `${resume.downloads.pdf}?view=1&run=${resume.runsUsed}&style=${resume.theme}&revision=${previewRevision}`
    : `${resume.previewUrl}?run=${resume.runsUsed}&style=${resume.theme}&revision=${previewRevision}`;

  return (
    <div className={`rb-review-workspace${hasDraft && !resume.paid ? " rb-review-workspace-unpaid" : ""}`}>
      <section className="rb-review-topbar">
        <div><p className="rb-kicker">Your resume workspace</p><h1>{resume.title}</h1><span>{resume.trade}</span></div>
        <div className="rb-run-meter" aria-label={`${resume.runsUsed} of ${resume.runsTotal} AI runs used`}>
          <div><span>AI runs</span><strong>{resume.runsUsed} / {resume.runsTotal}</strong></div>
          <ol>{Array.from({ length: resume.runsTotal }, (_, index) => <li className={index < resume.runsUsed ? "used" : ""} key={index} />)}</ol>
          <small>Initial resume build + 3 shared package corrections</small>
        </div>
      </section>

      {intakeNotice ? (
        <section className="rb-intake-notice" role="alert">
          <p className="rb-kicker">Intake update needed</p>
          <h2>We need a little more from you.</h2>
          <p>{intakeNotice.message}</p>
          {intakeNotice.missing?.length ? (
            <div className="rb-intake-missing">
              <strong>Review these intake sections:</strong>
              <ul>{intakeNotice.missing.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ) : null}
          <p className="rb-intake-reassurance">This failed attempt used no AI run, and any previous resume files are unchanged.</p>
          <a className="rb-button rb-button-primary" href={intakeNotice.intakeUrl ?? intakeReturnUrl(resumeId)}>Return to intake <span>→</span></a>
        </section>
      ) : null}

      {!hasDraft ? (
        <section className="rb-first-build">
          <div className="rb-doc-frame">
            <div className={`rb-blueprint rb-blueprint-${resume.theme}`} aria-hidden="true"><i /><i /><b /><i /><i /><i /><i /><b /><i /><i /><i /><i /><i /><b /><i /><i /><i /></div>
            <small>{THEME_OPTIONS.find((option) => option.value === resume.theme)?.label} layout · your watermarked preview is built next</small>
          </div>
          <div><p className="rb-kicker">Preview before you pay</p><h2>Choose your resume system. Then build.</h2><p>Pick how you want employers to read your experience. HUSTL3 BOT uses the selected writing profile on the first build while staying locked to the facts you provided—no invented licenses, employers, duties, or results.</p>
          <span className="rb-theme-label">Choose your resume system</span>
          {renderThemePicker()}
          <button className="rb-button rb-button-primary" type="button" disabled={working} onClick={() => void runGeneration()}>{working ? "Building your resume…" : "Build my watermarked preview"} <span aria-hidden="true">→</span></button>
          {renderNotice()}</div>
        </section>
      ) : (
        <section className="rb-review-grid">
          <div className="rb-preview-panel">
            {coverLetter?.available ? (
              <div className="rb-preview-tabs" role="tablist" aria-label="Package preview">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activePreview === "resume"}
                  onClick={() => setActivePreview("resume")}
                  className={activePreview === "resume" ? "rb-button rb-button-primary" : "rb-button rb-button-secondary-dark"}
                >Resume</button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activePreview === "cover-letter"}
                  onClick={() => setActivePreview("cover-letter")}
                  className={activePreview === "cover-letter" ? "rb-button rb-button-primary" : "rb-button rb-button-secondary-dark"}
                >Cover letter</button>
              </div>
            ) : null}

            {activePreview === "resume" ? (
              <>
                <div className="rb-preview-toolbar"><div><span className="rb-status-dot" />{resume.paid ? "Clean paid resume" : "Protected watermarked preview"}</div><small>{resume.paid ? "Watermark removed · clean files below" : "Gray lines unlock after purchase"}</small></div>
                <ProtectedPdfPreview key={`${resume.previewUrl}-${resume.runsUsed}-${resume.paid}-${resume.theme}-${previewRevision}`} src={resumePreviewSrc} title={resume.paid ? "Clean paid resume" : "Watermarked resume preview with locked lines"} />
                {!resume.paid ? renderLockNote(lockedBullets > 0
                  ? `${lockedBullets} of your experience bullet${lockedBullets === 1 ? " is" : "s are"} locked in this preview.`
                  : "This preview is watermarked.") : null}
              </>
            ) : coverPreviewReady && coverLetter?.previewUrl ? (
              <>
                <div className="rb-preview-toolbar"><div><span className="rb-status-dot" />{resume.paid ? "Clean paid cover letter" : "Protected cover-letter preview"}</div><small>{resume.paid ? "Included with your package" : "Preview only · pay to unlock clean files"}</small></div>
                <ProtectedPdfPreview key={`${coverLetter.previewUrl}-${resume.paid}-${resume.theme}-${previewRevision}`} src={`${coverLetter.previewUrl}&style=${resume.theme}&revision=${previewRevision}`} title={resume.paid ? "Clean matching cover letter" : "Watermarked matching cover letter preview"} />
                {!resume.paid ? renderLockNote("Your opening paragraph is shown. The rest of your letter is locked in this preview.") : null}
              </>
            ) : (
              <div className="rb-preview-empty">
                <div>
                  <p className="rb-kicker">Cover letter preview</p>
                  <h2>Add target job details.</h2>
                  <p>Add target job details to generate your matching cover letter.</p>
                  <a className="rb-button rb-button-primary" href="#included-cover-letter">Build cover-letter preview <span>→</span></a>
                </div>
              </div>
            )}
          </div>

          <aside className="rb-review-sidebar">
            <div className="rb-review-status"><p className="rb-kicker">{resume.paid ? "Review + refine" : "Preview before you pay"}</p><h2>{resume.paid ? "Make it sound like you." : "Review the whole package."}</h2><p className="rb-review-desc">{resume.paid ? "Check names, dates, certifications, job duties, contact information, and your included matching cover letter before downloading." : "Your resume is ready. The preview shows your header, summary, skills, credentials and first highlights; gray bars mark the lines that unlock after purchase. Build the included cover-letter preview, then pay once to unlock every line and the clean PDF + Word files."}</p>
              <span className="rb-theme-label">Resume system</span>
              {renderThemePicker()}
              <StyleControls key={`${resume.theme}-${JSON.stringify(resume.style)}`} resumeId={resumeId} style={resume.style ?? defaultStyle(resume.theme)} disabled={working || themeSaving} onBusy={setStyleSaving} onSaved={async () => { await load(resumeId); setPreviewRevision(value => value + 1); }} />
              <small className="rb-theme-note">Your first build uses the selected system&apos;s writing profile and layout. Switching the look later is always free. After you unlock the package, you can also rewrite the wording for a new system with one correction.</small>
            </div>


            {coverLetter ? (
              <CoverLetterPanel
                resumeId={resumeId}
                coverLetter={coverLetter}
                paid={resume.paid}
                theme={resume.theme}
                onRefresh={async () => { await load(resumeId); setActivePreview("cover-letter"); }}
                onMessage={notify}
              />
            ) : null}

            {resume.paid ? <form className="rb-correction-form" onSubmit={submitCorrection}>
              <div className="rb-correction-count"><strong>{resume.correctionsRemaining}</strong><span>shared package corrections remaining</span></div>
              <label htmlFor="correctionRequest">What needs to change on the resume?</label>
              <textarea id="correctionRequest" name="correctionRequest" rows={6} maxLength={2000} required disabled={working || resume.correctionsRemaining < 1} placeholder="Example: Change the end date at Apex Mechanical to June 2025 and emphasize my rooftop-unit diagnostics." />
              <button className="rb-button rb-button-secondary-dark rb-button-full" type="submit" disabled={working || resume.correctionsRemaining < 1}>{working ? "Applying correction…" : resume.correctionsRemaining > 0 ? "Apply one package correction" : "All corrections used"} <span>↻</span></button>
              <small>The three corrections are shared across the resume and cover letter. One submitted correction uses one run. Failed generations are restored automatically.</small>
            </form> : (
              <div className="rb-unpaid-card" id="unlock-package" ref={unpaidCardRef}>
                <p className="rb-kicker">One-time purchase</p>
                <h2>Unlock the full package.</h2>
                <p>Pay $9.99 once. No subscription. Your resume and matching cover letter are already built; unlocking reveals every line and gives you files ready to send today.</p>
                <ul className="rb-unpaid-includes">
                  {PACKAGE_INCLUDES.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <button className="rb-button rb-button-primary rb-button-full" type="button" disabled={checkingOut} onClick={() => void startCheckout()}>{checkoutLabel} <span aria-hidden="true">↗</span></button>
                {checkoutError ? <p className="rb-unpaid-error" role="alert">{checkoutError} Nothing was charged.</p> : null}
                <small>Secure checkout powered by Stripe · one-time $9.99 · no subscription. TRADE HUSTL3 does not receive or store your full card number. Need help? <a href="mailto:support@tradehustl3.com">support@tradehustl3.com</a></small>
              </div>
            )}

            {resume.downloads ? (
              <div className="rb-downloads">
                <p>Resume files</p>
                <a className="rb-download" href={resume.downloads.pdf}><span><strong>PDF</strong><small>Clean, ready to send</small></span><b>↓</b></a>
                <a className="rb-download" href={resume.downloads.docx}><span><strong>DOCX</strong><small>Clean, editable copy</small></span><b>↓</b></a>
              </div>
            ) : null}
          </aside>
        </section>
      )}

      {hasDraft ? (
        <section className={`rb-review-details${resume.bulletEditor.length ? "" : " rb-review-details-single"}`} aria-label="Resume quality and bullet workshop">
          <section className="rb-quality-card" aria-labelledby="resume-quality-title">
            <div className="rb-quality-head">
              <div><p className="rb-kicker">Resume quality score</p><h2 id="resume-quality-title">{resume.qualityScore.total}<span>/100</span></h2></div>
              <strong>{resume.qualityScore.label}</strong>
            </div>
            <p>Deterministic checks for complete work history, dates, credentials, ATS structure, and unsupported claims. Scoring uses no AI run.</p>
            {resume.qualityScore.issues.length ? <ul>{resume.qualityScore.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : <p className="rb-quality-pass">All verified jobs and protected facts passed the quality gate.</p>}
          </section>

          {resume.bulletEditor.length ? (
            <section className="rb-bullet-editor" aria-labelledby="bullet-editor-title">
              <p className="rb-kicker">HUSTL3 BOT bullet workshop</p>
              <h2 id="bullet-editor-title">Improve one bullet at a time.</h2>
              <p>We strengthen what you actually did. We never make up numbers, licenses, equipment experience, or certifications.</p>
              {resume.bulletEditor.map((job) => (
                <div className="rb-bullet-job" key={job.jobIndex}>
                  <h3>{job.jobTitle}</h3><small>{job.employer}</small>
                  {job.bullets.map((bullet) => {
                    const key = `${job.jobIndex}:${bullet.bulletIndex}`;
                    if (bullet.locked) {
                      return (
                        <article className="rb-bullet-card rb-bullet-card-locked" key={key}>
                          {bullet.original ? <div className="rb-bullet-version"><strong>Your original</strong><p>{bullet.original}</p></div> : null}
                          <p className="rb-bullet-locked"><LockIcon /><span>HUSTL3 BOT&apos;s rewrite of this bullet unlocks with your package.</span></p>
                        </article>
                      );
                    }
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
              <small className="rb-bullet-note">Each choice updates the protected preview and final PDF + DOCX without using a correction run.{resume.paid ? "" : " Locked bullets open for editing after you unlock the package."}</small>
            </section>
          ) : null}
        </section>
      ) : null}

      {hasDraft ? renderNotice() : null}
      {hasDraft && !resume.paid ? (
        <div className="rb-unlock-bar" role="region" aria-label="Unlock your resume package" hidden={unpaidCardVisible || working}>
          {checkoutError ? (
            <p className="rb-unlock-bar-error" role="alert">{checkoutError}</p>
          ) : (
            <div className="rb-unlock-bar-copy">
              <strong>$9.99 <small>one-time</small></strong>
              <span>Full resume + cover letter · clean PDF &amp; Word</span>
            </div>
          )}
          <button className="rb-button rb-button-primary" type="button" disabled={checkingOut} onClick={() => void startCheckout()}>{checkingOut ? "Opening checkout…" : "Unlock & download"} <span aria-hidden="true">→</span></button>
        </div>
      ) : null}
      {working ? <div className="rb-working-overlay" role="status"><span /><strong>HUSTL3 BOT is building</strong><small>This can take a minute. Keep this page open.</small></div> : null}
    </div>
  );
}
