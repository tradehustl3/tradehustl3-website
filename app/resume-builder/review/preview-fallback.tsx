"use client";

import { useState } from "react";

export function ResumePreviewFallback() {
  const [resumeId] = useState(() => typeof window === "undefined"
    ? ""
    : new URLSearchParams(window.location.search).get("resume_id") ?? "");

  if (!resumeId) return null;

  const previewHref = `/api/resume-builder/resumes/${encodeURIComponent(resumeId)}/files/preview?view=1`;

  return (
    <section className="rb-preview-fallback" aria-label="Resume preview fallback">
      <p>
        If the embedded resume preview does not display on this device, open the same protected,
        watermarked preview full screen. This does not use another AI run.
      </p>
      <a
        className="rb-button rb-button-ghost"
        href={previewHref}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open protected preview full screen <span aria-hidden="true">↗</span>
      </a>
    </section>
  );
}
