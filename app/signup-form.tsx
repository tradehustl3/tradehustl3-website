"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

const interests = [
  "The TRADE HUSTL3 Book",
  "Resume Builder",
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

type SignupMode = "general" | "bookSample" | "topTrades";

const resourceModes = {
  bookSample: {
    interest: "TRADE HUSTL3 Seven-Page Book Sample",
    formName: "seven_page_book_sample",
    label: "EMAIL TO RECEIVE THE SEVEN-PAGE SAMPLE",
    submit: "UNLOCK THE BOOK SAMPLE",
    submitting: "UNLOCKING SAMPLE...",
    open: "OPEN YOUR BOOK SAMPLE",
  },
  topTrades: {
    interest: "Top Ten Trades 2026-2027 Guide",
    formName: "top_ten_trades_2026_2027_guide",
    label: "EMAIL TO RECEIVE THE TOP TEN TRADES GUIDE",
    submit: "UNLOCK THE FREE GUIDE",
    submitting: "UNLOCKING GUIDE...",
    open: "OPEN YOUR TOP TEN TRADES GUIDE",
  },
} as const;

export function SignupForm({ mode = "general" }: { mode?: SignupMode }) {
  const formRef = useRef<HTMLFormElement>(null);
  const hasTrackedFormStart = useRef(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const resource = mode === "general" ? null : resourceModes[mode];
  const formName = resource?.formName ?? "general_interest";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    for (const key of utmKeys) {
      const current = params.get(key);
      if (current) sessionStorage.setItem(key, current);
      const preserved = current ?? sessionStorage.getItem(key);
      const input = formRef.current?.elements.namedItem(key);
      if (preserved && input instanceof HTMLInputElement) input.value = preserved;
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
    setResourceUrl("");

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
      const result = await response.json() as { message?: string; resourceUrl?: string; sampleUrl?: string };

      if (!response.ok) throw new Error(result.message || "Signup failed.");

      setStatus("success");
      setMessage(result.message || "You're on the TRADE HUSTL3 list.");
      setResourceUrl(result.resourceUrl || result.sampleUrl || "");
      const conversionEvent = mode === "bookSample"
        ? "book_sample_download"
        : mode === "topTrades"
          ? "top_trades_guide_download"
          : "sign_up";
      trackEvent(conversionEvent, {
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
        className={resource ? "signup sample-signup" : "signup"}
        onFocusCapture={handleFormStart}
        onSubmit={handleSubmit}
      >
        {resource ? (
          <input type="hidden" name="interest" value={resource.interest} />
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
          <label htmlFor={resource ? `${mode}-email` : "email"}>{resource?.label ?? "EMAIL ADDRESS"}</label>
          <input id={resource ? `${mode}-email` : "email"} name="email" type="email" autoComplete="email" placeholder="YOU@EXAMPLE.COM" required disabled={status === "submitting"} />
        </div>
        {utmKeys.map((key) => <input key={key} type="hidden" name={key} defaultValue="" />)}
        <button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? resource?.submitting ?? "SAVING..." : resource?.submit ?? "KEEP ME POSTED"} <span>↗</span>
        </button>
      </form>
      <p className={`signup-status ${status}`} role={status === "error" ? "alert" : "status"} aria-live="polite">
        {message}
      </p>
      {resource && status === "success" && resourceUrl && (
        <a className="sample-unlock-link" href={resourceUrl} target="_blank" rel="noreferrer">
          {resource.open} <span>↗</span>
        </a>
      )}
    </>
  );
}
