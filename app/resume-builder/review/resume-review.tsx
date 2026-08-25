"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Resume = {
  resumeId: string;
  trade: string;
  title: string;
  status: string;
  paid: boolean;
  runsUsed: number;
  runsTotal: number;
  correctionsRemaining: number;
  previewUrl: string | null;
  downloads: { pdf: string; docx: string } | null;
};

export function ResumeReview() {
  const [resumeId] = useState(() => typeof window === "undefined"
    ? ""
    : new URLSearchParams(window.location.search).get("resume_id") ?? "");
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

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

  async function runGeneration(correctionRequest?: string) {
    if (!resumeId) return;
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch(`/api/resume-builder/resumes/${encodeURIComponent(resumeId)}/generate`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(correctionRequest ? { correctionRequest } : {}),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "We could not complete this AI run.");
      await load(resumeId);
      setMessage(correctionRequest ? "Correction applied. Review the updated watermarked copy." : "Your first resume is ready for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not complete this AI run.");
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

  if (loading) {
    return <div className="rb-review-loading" role="status"><span /><p>Loading your secure workspace…</p></div>;
  }

  if (!resume) {
    return (
      <div className="rb-review-empty">
        <p className="rb-kicker">/ WORKSPACE UNAVAILABLE</p>
        <h1>LET’S GET YOU <span>BACK ON TRACK.</span></h1>
        <p>{message}</p>
        <Link className="rb-button rb-button-primary" href="/resume-builder/intake">Return to your intake <span>→</span></Link>
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

      {!resume.paid ? (
        <section className="rb-unpaid-card">
          <p className="rb-kicker">/ PAYMENT REQUIRED</p><h2>GENERATION IS STILL LOCKED.</h2>
          <p>Your intake is saved. Complete the one-time $9.99 payment before the first AI run.</p>
          <Link className="rb-button rb-button-primary" href={`/resume-builder/intake?resume_id=${encodeURIComponent(resume.resumeId)}`}>Continue to payment <span>→</span></Link>
        </section>
      ) : !hasDraft ? (
        <section className="rb-first-build">
          <div className="rb-blueprint" aria-hidden="true"><span>ATS</span><i /><i /><i /><i /></div>
          <div><p className="rb-kicker">/ PAYMENT CONFIRMED</p><h2>READY FOR THE FIRST BUILD.</h2><p>This uses run 1 of 4. Claude Sonnet will organize only the experience and facts you provided—no invented licenses, employers, or results.</p>
          <button className="rb-button rb-button-primary" type="button" disabled={working} onClick={() => void runGeneration()}>{working ? "Building your resume…" : "Generate my paid resume"} <span>→</span></button></div>
        </section>
      ) : (
        <section className="rb-review-grid">
          <div className="rb-preview-panel">
            <div className="rb-preview-toolbar"><div><span className="rb-status-dot" />Watermarked review copy</div><small>Review only · clean files below</small></div>
            <iframe key={`${resume.previewUrl}-${resume.runsUsed}`} src={`${resume.previewUrl}?run=${resume.runsUsed}`} title="Watermarked resume review" />
          </div>

          <aside className="rb-review-sidebar">
            <div className="rb-review-status"><p className="rb-kicker">/ REVIEW + REFINE</p><h2>MAKE IT SOUND LIKE YOU.</h2><p>Check names, dates, certifications, job duties, and contact information before downloading.</p></div>

            <form className="rb-correction-form" onSubmit={submitCorrection}>
              <div className="rb-correction-count"><strong>{resume.correctionsRemaining}</strong><span>AI corrections remaining</span></div>
              <label htmlFor="correctionRequest">What needs to change?</label>
              <textarea id="correctionRequest" name="correctionRequest" rows={6} maxLength={2000} required disabled={working || resume.correctionsRemaining < 1} placeholder="Example: Change the end date at Apex Mechanical to June 2025 and emphasize my rooftop-unit diagnostics." />
              <button className="rb-button rb-button-secondary-dark rb-button-full" type="submit" disabled={working || resume.correctionsRemaining < 1}>{working ? "Applying correction…" : resume.correctionsRemaining > 0 ? "Apply one correction" : "All corrections used"} <span>↻</span></button>
              <small>One submitted correction uses one run. Failed generations are restored automatically.</small>
            </form>

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
      {working ? <div className="rb-working-overlay" role="status"><span /><strong>CLAUDE SONNET IS BUILDING</strong><small>This can take a minute. Keep this page open.</small></div> : null}
    </div>
  );
}
