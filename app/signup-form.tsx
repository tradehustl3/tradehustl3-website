"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

const interests = [
  "The TRADE HUSTL3 Book",
  "Resume Builder",
  "TRADE HUSTL3 Rule Builder",
  "HUSTL3 BOT",
  "HUSTL3 PRO",
  "Jobsite Gear",
  "School / Workforce Partnership",
  "General TRADE HUSTL3 Updates",
];

const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

type AnalyticsWindow = Window & {
  gtag?: (command: "event", eventName: string, parameters?: Record<string, string>) => void;
};

function trackEvent(eventName: string, parameters: Record<string, string>) {
  (window as AnalyticsWindow).gtag?.("event", eventName, parameters);
}

export function SignupForm({ mode = "general" }: { mode?: "general" | "sample" }) {
  const formRef = useRef<HTMLFormElement>(null);
  const hasTrackedFormStart = useRef(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [sampleUrl, setSampleUrl] = useState("");
  const isSample = mode === "sample";
  const formName = isSample ? "free_2026_2027_trade_guide_preview" : "general_interest";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    for (const key of utmKeys) {
      const current = params.get(key);
      if (current) sessionStorage.setItem(key, current);
      const preserved = current ?? sessionStorage.getItem(key);
      const input = formRef.current?.elements.namedItem(key);
      if (preserved && input instanceof HTMLInputElement) input.value = preserved;
    }
    const requestedInterest = params.get("interest");
    const interestField = formRef.current?.elements.namedItem("interest");
    if (
      requestedInterest
      && interests.includes(requestedInterest)
      && interestField instanceof HTMLSelectElement
    ) {
      interestField.value = requestedInterest;
    }
  }, []);

  function handleFormStart() {
    if (hasTrackedFormStart.current) return;
    hasTrackedFormStart.current = true;
    trackEvent("form_start", { form_name: formName });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setStatus("submitting");
    setMessage("");
    setSampleUrl("");

    const form = new FormData(formElement);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          interest: form.get("interest"),
          utm_source: form.get("utm_source"),
          utm_medium: form.get("utm_medium"),
          utm_campaign: form.get("utm_campaign"),
          utm_content: form.get("utm_content"),
          utm_term: form.get("utm_term"),
        }),
      });
      const result = await response.json() as { message?: string; sampleUrl?: string };

      if (!response.ok) throw new Error(result.message || "Signup failed.");

      setStatus("success");
      setMessage(result.message || "You're on the TRADE HUSTL3 list.");
      setSampleUrl(result.sampleUrl || "");
      trackEvent(isSample ? "generate_lead" : "sign_up", {
        form_name: formName,
        lead_source: String(form.get("utm_source") || "direct"),
        campaign: String(form.get("utm_campaign") || "none"),
      });
      formElement.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "We couldn't save your signup. Please try again.");
    }
  }

  return (
    <>
      <form
        ref={formRef}
        className={isSample ? "signup sample-signup" : "signup"}
        onFocusCapture={handleFormStart}
        onSubmit={handleSubmit}
      >
        {isSample ? (
          <input type="hidden" name="interest" value="The TRADE HUSTL3 Book" />
        ) : (
          <div className="field-group interest-group">
            <label htmlFor="interest">I&apos;M INTERESTED IN</label>
            <select id="interest" name="interest" required defaultValue="" disabled={status === "submitting"}>
              <option value="" disabled>SELECT AN INTEREST</option>
              {interests.map((interest) => <option key={interest} value={interest}>{interest}</option>)}
            </select>
          </div>
        )}
        <div className="field-group email-group">
          <label htmlFor={isSample ? "sample-email" : "email"}>{isSample ? "EMAIL TO RECEIVE THE FREE GUIDE" : "EMAIL ADDRESS"}</label>
          <input id={isSample ? "sample-email" : "email"} name="email" type="email" autoComplete="email" placeholder="YOU@EXAMPLE.COM" required disabled={status === "submitting"} />
        </div>
        {utmKeys.map((key) => <input key={key} type="hidden" name={key} defaultValue="" />)}
        <button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "UNLOCKING..." : isSample ? "UNLOCK THE FREE GUIDE" : "KEEP ME POSTED"} <span>↗</span>
        </button>
      </form>
      <p className={`signup-status ${status}`} role={status === "error" ? "alert" : "status"} aria-live="polite">
        {message}
      </p>
      {isSample && status === "success" && sampleUrl && (
        <a className="sample-unlock-link" href={sampleUrl} target="_blank" rel="noreferrer">
          OPEN YOUR FREE GUIDE <span>↗</span>
        </a>
      )}
    </>
  );
}
