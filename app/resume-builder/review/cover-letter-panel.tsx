"use client";

import { FormEvent, useState } from "react";

type CoverLetterState = {
  included: boolean;
  available: boolean;
  generated: boolean;
  generationTrack?: string;
  correctionsRemaining: number;
  previewUrl: string | null;
  downloads: { pdf: string; docx: string } | null;
  companyName: string;
  hiringManager: string;
  targetJobTitle: string;
  needsTargetDetails?: boolean;
};

export function CoverLetterPanel({
  resumeId,
  coverLetter,
  paid,
  theme,
  onRefresh,
  onMessage,
}: {
  resumeId: string;
  coverLetter: CoverLetterState;
  paid: boolean;
  theme: string;
  onRefresh: () => Promise<void>;
  onMessage: (message: string, tone?: "info" | "success" | "error") => void;
}) {
  const [working, setWorking] = useState(false);
  // The appearance the customer chose to keep their current wording for. The banner
  // stays hidden for that appearance and returns only if they pick another one.
  const [keptWordingFor, setKeptWordingFor] = useState<string | null>(null);
  const showTrackBanner = coverLetter.generated
    && Boolean(coverLetter.generationTrack)
    && coverLetter.generationTrack !== theme
    && keptWordingFor !== theme;

  async function rewritePackageForTrack() {
    if (working) return;
    setWorking(true);
    onMessage("");
    try {
      // Package-level rewrite: the resume and this cover letter move to the selected
      // career track together for one shared correction.
      const response = await fetch(`/api/resume-builder/resumes/${encodeURIComponent(resumeId)}/generate`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationTrack: theme }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "We could not rewrite your package for this style.");
      await onRefresh();
      onMessage(result.message || "Your resume and cover letter were rewritten for this style.", "success");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "We could not rewrite your package for this style.", "error");
    } finally {
      setWorking(false);
    }
  }

  function keepCurrentWording() {
    setKeptWordingFor(theme);
    onMessage("Keeping your current cover-letter wording. Appearance changes are free and no correction was used.");
  }

  async function submit(event: FormEvent<HTMLFormElement>, correction = false) {
    event.preventDefault();
    if (working) return;
    // React clears event.currentTarget once this handler awaits, so keep the form.
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
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
      formElement.reset();
      onMessage(result.message || "Matching cover letter updated.", "success");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "We could not generate the matching cover letter.", "error");
    } finally {
      setWorking(false);
    }
  }

  if (!coverLetter.available) return null;

  if (!coverLetter.generated) {
    return (
      <section id="included-cover-letter" className="rb-correction-form" aria-labelledby="cover-letter-title">
        <p className="rb-kicker">INCLUDED COVER LETTER PREVIEW</p>
        <h2 id="cover-letter-title">Build the matching cover letter.</h2>
        <p>Generate the matching cover letter before checkout so you can review the whole package first. The protected preview uses the same verified facts and the same resume style.</p>
        {coverLetter.needsTargetDetails ? <p className="rb-quality-pass">Add target job details to generate your matching cover letter.</p> : null}
        <form onSubmit={(event) => void submit(event)}>
          <label htmlFor="cover-target-title">Target job title</label>
          <input id="cover-target-title" name="targetJobTitle" maxLength={160} defaultValue={coverLetter.targetJobTitle} required placeholder="Example: HVAC Service Technician" />
          <label htmlFor="cover-company">Company name <small>(optional)</small></label>
          <input id="cover-company" name="companyName" maxLength={160} defaultValue={coverLetter.companyName} placeholder="Example: ABC Mechanical" />
          <label htmlFor="cover-manager">Hiring manager <small>(optional)</small></label>
          <input id="cover-manager" name="hiringManager" maxLength={160} defaultValue={coverLetter.hiringManager} placeholder="Leave blank if unknown" />
          <label htmlFor="cover-posting">Job posting <small>(optional but recommended)</small></label>
          <textarea id="cover-posting" name="jobPosting" rows={7} maxLength={12000} placeholder="Paste the job description here so HUSTL3 BOT can match the letter to the role without inventing company facts." />
          <button className="rb-button rb-button-secondary-dark rb-button-full" type="submit" disabled={working}>{working ? "Building cover letter…" : "Generate protected cover-letter preview"} <span>→</span></button>
          <small>The first cover-letter build does not use one of your three shared package corrections.</small>
        </form>
      </section>
    );
  }

  return (
    <section id="included-cover-letter" className="rb-correction-form" aria-labelledby="cover-letter-title">
      <p className="rb-kicker">MATCHING COVER LETTER</p>
      <h2 id="cover-letter-title">{paid ? "Ready to send." : "Preview ready."}</h2>
      <p>{paid
        ? "Your cover letter is unlocked and uses the same Classic Black or TRADE HUSTL3 Red Accent style as your resume."
        : "Review the watermarked cover-letter tab above. Your clean PDF and editable DOCX unlock with the same $9.99 one-time purchase."}</p>

      {paid && coverLetter.downloads ? (
        <div className="rb-downloads">
          <p>Cover letter files</p>
          <a className="rb-download" href={coverLetter.downloads.pdf}><span><strong>PDF</strong><small>Clean, ready to send</small></span><b>↓</b></a>
          <a className="rb-download" href={coverLetter.downloads.docx}><span><strong>DOCX</strong><small>Clean, editable copy</small></span><b>↓</b></a>
        </div>
      ) : null}

      {showTrackBanner ? (
        <div role="group" aria-label="Cover letter career track">
          <p>The selected style differs from how this letter was written.</p>
          <button type="button" disabled={working || !paid || coverLetter.correctionsRemaining < 1} onClick={() => void rewritePackageForTrack()}>Rewrite for this style</button>
          <button type="button" disabled={working} onClick={keepCurrentWording}>Keep my current wording</button>
          <small>{!paid
            ? "Unlock the package to rewrite."
            : coverLetter.correctionsRemaining < 1
              ? "All three corrections have been used."
              : "Rewriting updates your resume and this cover letter together and uses one shared correction."}</small>
        </div>
      ) : null}
      {paid ? (
        <form onSubmit={(event) => void submit(event, true)}>
          <div className="rb-correction-count"><strong>{coverLetter.correctionsRemaining}</strong><span>package corrections remaining</span></div>
          <label htmlFor="coverCorrection">Refine the cover letter</label>
          <textarea id="coverCorrection" name="coverCorrection" rows={5} maxLength={2000} required disabled={working || coverLetter.correctionsRemaining < 1} placeholder="Example: Make the opening more direct and emphasize my commercial HVAC troubleshooting experience." />
          <button className="rb-button rb-button-secondary-dark rb-button-full" type="submit" disabled={working || coverLetter.correctionsRemaining < 1}>{working ? "Applying cover-letter correction…" : coverLetter.correctionsRemaining > 0 ? "Apply one package correction" : "All corrections used"} <span>↻</span></button>
          <small>The same three corrections are shared across your resume and cover letter. A failed generation automatically restores the correction.</small>
        </form>
      ) : (
        <small>Unlock the package to use your three shared corrections and download clean files.</small>
      )}
    </section>
  );
}
