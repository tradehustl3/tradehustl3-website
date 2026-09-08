"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const MOBILE_PREVIEW_BREAKPOINT = 820;

export function ResumePreviewFallback() {
  const [resumeId] = useState(() => typeof window === "undefined"
    ? ""
    : new URLSearchParams(window.location.search).get("resume_id") ?? "");
  const [previewPanel, setPreviewPanel] = useState<HTMLElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const sync = () => {
      const panel = document.querySelector<HTMLElement>(".rb-preview-panel");
      setPreviewPanel(panel);
      setIsMobile(window.matchMedia(`(max-width: ${MOBILE_PREVIEW_BREAKPOINT}px)`).matches);

      const iframe = panel?.querySelector<HTMLIFrameElement>("iframe");
      if (iframe) {
        iframe.style.display = window.matchMedia(`(max-width: ${MOBILE_PREVIEW_BREAKPOINT}px)`).matches
          ? "none"
          : "block";
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      const iframe = document.querySelector<HTMLIFrameElement>(".rb-preview-panel iframe");
      if (iframe) iframe.style.display = "";
    };
  }, []);

  if (!resumeId || !previewPanel) return null;

  const previewHref = `/api/resume-builder/resumes/${encodeURIComponent(resumeId)}/files/preview?view=1`;

  const fallback = (
    <section
      aria-label="Protected resume preview viewer"
      data-testid="mobile-resume-preview-fallback"
      style={{
        margin: isMobile ? "0" : "14px 18px 18px",
        padding: isMobile ? "24px 18px" : "18px",
        borderTop: isMobile ? "1px solid #d8d1c3" : "1px solid #d8d1c3",
        background: "#f7f3e9",
        color: "#0b273b",
        textAlign: "center",
      }}
    >
      <p style={{ margin: "0 0 8px", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>
        {isMobile ? "Your protected resume is ready" : "Need a full-screen view?"}
      </p>
      <p style={{ margin: "0 auto 16px", maxWidth: 520, lineHeight: 1.5 }}>
        {isMobile
          ? "Mobile browsers do not always display secured PDFs inside a page. Open the same watermarked resume directly to review it before you pay."
          : "Open the same protected, watermarked resume directly in your browser. This does not use another AI run."}
      </p>
      <a
        className="rb-button rb-button-primary"
        href={previewHref}
        data-testid="open-protected-preview"
        style={{ width: isMobile ? "100%" : undefined, justifyContent: "center" }}
      >
        View my watermarked resume <span aria-hidden="true">→</span>
      </a>
      <small style={{ display: "block", marginTop: 12, opacity: .75 }}>
        Protected preview only · no additional AI run · use Back to return here
      </small>
    </section>
  );

  return createPortal(fallback, previewPanel);
}
