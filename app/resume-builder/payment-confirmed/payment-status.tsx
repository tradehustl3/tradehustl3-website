"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trackResumePurchase } from "../funnel-analytics";
import { intakeReturnUrl } from "../return-urls";

type Stage = "checking" | "waiting" | "ready" | "error";

/** Shown when payment confirmation fails; it must return to the same draft. */
export function PaymentErrorReturnLink({ resumeId }: { resumeId: string }) {
  return <a className="rb-text-link" href={intakeReturnUrl(resumeId)}>Return to your intake</a>;
}

export function PaymentStatus() {
  const [stage, setStage] = useState<Stage>("checking");
  const [message, setMessage] = useState("Confirming your payment with the secure checkout provider…");
  const resumeId = useRef("");
  const [returnId, setReturnId] = useState("");
  const attempts = useRef(0);

  const check = useCallback(async () => {
    if (!resumeId.current) return;
    setStage("checking");
    try {
      const response = await fetch(`/api/resume-builder/resumes/${encodeURIComponent(resumeId.current)}`, { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/resume-builder");
        return;
      }
      const result = await response.json() as { resume?: { paid: boolean }; message?: string };
      if (!response.ok) throw new Error(result.message || "We could not check the payment yet.");
      if (result.resume?.paid) {
        trackResumePurchase(resumeId.current);
        setStage("ready");
        setMessage("Payment confirmed. Your resume is unlocked. Next, generate your included matching cover letter.");
        window.setTimeout(() => window.location.assign(`/resume-builder/review?resume_id=${encodeURIComponent(resumeId.current)}&from=payment#included-cover-letter`), 900);
        return;
      }
      setStage("waiting");
      setMessage("Payment received. We’re waiting for the final confirmation—this usually takes only a few seconds.");
    } catch (error) {
      setStage("error");
      setMessage(error instanceof Error ? error.message : "We could not check the payment yet.");
    }
  }, []);

  useEffect(() => {
    resumeId.current = new URLSearchParams(window.location.search).get("resume_id") ?? "";
    setReturnId(resumeId.current);
    if (!resumeId.current) {
      setStage("error");
      setMessage("This payment return is missing the resume reference.");
      return;
    }
    void check();
    const timer = window.setInterval(() => {
      attempts.current += 1;
      if (attempts.current >= 12 || !resumeId.current) {
        window.clearInterval(timer);
        return;
      }
      void check();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [check]);

  return (
    <div className="rb-payment-card">
      <div className={`rb-payment-pulse rb-payment-pulse-${stage}`} aria-hidden="true"><span>{stage === "ready" ? "✓" : "$"}</span></div>
      <p className="rb-kicker">Secure payment return</p>
      <h1>{stage === "ready" ? <>Payment <span>confirmed.</span></> : <>Locking in your <span>build.</span></>}</h1>
      <p role="status">{message}</p>
      <div className="rb-order-summary"><span>Resume Builder</span><strong>$9.99 paid once</strong><small>Resume + matching cover letter · PDF + DOCX · 3 shared corrections</small></div>
      {stage === "waiting" || stage === "error" ? <button className="rb-button rb-button-primary" type="button" onClick={() => { attempts.current = 0; void check(); }}>Check payment status <span aria-hidden="true">↻</span></button> : null}
      {stage === "error" ? <PaymentErrorReturnLink resumeId={returnId} /> : null}
      <small>Do not close this page while confirmation is in progress.</small>
    </div>
  );
}
