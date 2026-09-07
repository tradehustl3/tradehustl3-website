"use client";

import { FormEvent, useState } from "react";

type CoverLetterState = {
  included: boolean;
  available: boolean;
  generated: boolean;
  correctionsRemaining: number;
  previewUrl: string | null;
  downloads: { pdf: string; docx: string } | null;
  companyName: string;
  hiringManager: string;
  targetJobTitle: string;
};

export function CoverLetterPanel({
  resumeId,
  coverLetter,
  onRefresh,
  onMessage,
}: {
  resumeId: string;
  coverLetter: CoverLetterState;
  onRefresh: () => Promise<void>;
  onMessage: (message: string) => void;
}) {
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>, correction = false) {
    event.preventDefault();
    if (working) return;
    const form = new FormData(event.currentTarget);
    const correctionRequest = String(form.get("coverCorrection") ?? "").trim();
    if (correction && !correctionRequest) return;
    const payload: Record<string, string> = correction
      ? { correctionRequest }
      : {
          companyName: String(form.get("companyName") ?? "").trim(),
          hiringManager: String(form.get("hiringManager") ?? "").trim(),
          targetJobTitle: String(form.get("targetJobTitle") ?? "").trim(),
          jobPosting: String(form.get("jobPosting") ?? "").trim(),
        };
    setWorking(true);
    onMessage("");
    try {
      const response = await fetch(`/api/resume-builder/resumes/${encodeURIComponent(resumeId)}/cover-letter/generate`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "We could not generate the matching cover letter.");
      await onRefresh();
      onMessage(result.message || "Matching cover letter updated.");
      event.currentTarget.reset();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "We could not generate the matching cover letter.");
    } finally {
      setWorking(false);
    }
  }

  if (!coverLetter.available) return null;

  if (!coverLetter.generated) {
    return (
      <section className="rb-correction-form" aria-labelledby="cover-letter-title">
        <p className="rb-kicker">/ INCLUDED WITH YOUR $9.99 PACKAGE</p>
        <h2 id="cover-letter-title">MATCHING COVER LETTER</h2>
        <p>Generate one professional cover letter from the same verified facts used in your resume. The first cover-letter build is included and does not use one of your three corrections.</p>
        <form onSubmit={(event) => void submit(event)}>
          <label htmlFor="cover-target-title">Target job title</label>
          <input id="cover-target-title" name="targetJobTitle" maxLength={160} defaultValue={coverLetter.targetJobTitle} placeholder="Example: HVAC Service Technician" />
          <label htmlFor="cover-company">Company name <small>(optional)</small></label>
          <input id="cover-company" name="companyName" maxLength={160} defaultValue={coverLetter.companyName} placeholder="Example: ABC Mechanical" />
          <label htmlFor="cover-manager">Hiring manager <small>(optional)</small></label>
          <input id="cover-manager" name="hiringManager" maxLength={160} defaultValue={coverLetter.hiringManager} placeholder="Leave blank if unknown" />
          <label htmlFor="cover-posting">Job posting <small>(optional but recommended)</small></label>
          <textarea id="cover-posting" name="jobPosting" rows={7} maxLength={12000} placeholder="Paste the job description here so HUSTL3 BOT can match the letter to the role without inventing company facts." />
          <button className="rb-button rb-button-secondary-dark rb-button-full" type="submit" disabled={working}>{working ? "Building cover letter…" : "Generate included cover letter"} <span>→</span></button>
          <small>Paid-only generation keeps free-preview AI costs under control. HUSTL3 BOT is instructed to use only verified resume facts and the job information you provide.</small>
        </form>
      </section>
    );
  }

  return (
    <section className="rb-correction-form" aria-labelledby="cover-letter-title">
      <p className="rb-kicker">/ MATCHING COVER LETTER</p>
      <h2 id="cover-letter-title">READY TO SEND.</h2>
      <p>Your cover letter uses the same Classic Black or TRADE HUSTL3 Red Accent style as your resume.</p>
      {coverLetter.previewUrl ? (
        <div className="rb-preview-panel">
          <div className="rb-preview-toolbar"><div><span className="rb-status-dot" />Clean paid cover letter</div><small>Included with your resume package</small></div>
          <iframe src={coverLetter.previewUrl} title="Matching cover letter preview" style={{ width: "100%", minHeight: 520, border: 0 }} />
        </div>
      ) : null}
      {coverLetter.downloads ? (
        <div className="rb-downloads">
          <p>COVER LETTER FILES</p>
          <a className="rb-download" href={coverLetter.downloads.pdf}><span><strong>PDF</strong><small>Clean, ready to send</small></span><b>↓</b></a>
          <a className="rb-download" href={coverLetter.downloads.docx}><span><strong>DOCX</strong><small>Clean, editable copy</small></span><b>↓</b></a>
        </div>
      ) : null}
      <form onSubmit={(event) => void submit(event, true)}>
        <div className="rb-correction-count"><strong>{coverLetter.correctionsRemaining}</strong><span>package corrections remaining</span></div>
        <label htmlFor="coverCorrection">Refine the cover letter</label>
        <textarea id="coverCorrection" name="coverCorrection" rows={5} maxLength={2000} required disabled={working || coverLetter.correctionsRemaining < 1} placeholder="Example: Make the opening more direct and emphasize my commercial HVAC troubleshooting experience." />
        <button className="rb-button rb-button-secondary-dark rb-button-full" type="submit" disabled={working || coverLetter.correctionsRemaining < 1}>{working ? "Applying cover-letter correction…" : coverLetter.correctionsRemaining > 0 ? "Apply one package correction" : "All corrections used"} <span>↻</span></button>
        <small>The same three corrections are shared across your resume and cover letter. A failed generation automatically restores the correction.</small>
      </form>
    </section>
  );
}
