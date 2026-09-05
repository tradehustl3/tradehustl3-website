"use client";

import { useEffect, useState } from "react";

export function ConfirmMagicLink() {
  const [token] = useState(() => typeof window === "undefined"
    ? ""
    : new URLSearchParams(window.location.search).get("token") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
  }, [token]);

  async function confirm() {
    if (!token) {
      setMessage("This link is missing its secure token. Request a new email to continue.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/resume-builder/auth/confirm", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "This confirmation link could not be used.");
      window.location.assign("/resume-builder/intake");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This confirmation link could not be used.");
      setSubmitting(false);
    }
  }

  return (
    <div className="rb-confirm-card">
      <div className="rb-confirm-mark" aria-hidden="true">✓</div>
      <p className="rb-kicker">/ EMAIL VERIFIED</p>
      <h1>CONFIRM THIS <span>SIGN-IN.</span></h1>
      <p>
        For your security, opening the email did not sign you in. Choose the button below to confirm this browser and continue to your saved intake.
      </p>
      {message ? <div className="rb-inline-error" role="alert">{message}</div> : null}
      <button className="rb-button rb-button-primary rb-button-full" type="button" onClick={confirm} disabled={submitting}>
        {submitting ? "Confirming…" : "Confirm & continue"} <span>→</span>
      </button>
      <a className="rb-text-link" href="/resume-builder">Request a new confirmation link</a>
      <small>Email safety scanners cannot activate this link because confirmation only happens when you choose the button.</small>
    </div>
  );
}
