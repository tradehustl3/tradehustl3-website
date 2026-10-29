"use client";

import { FormEvent, useEffect, useState } from "react";
import { trackResumeFunnelEvent } from "./funnel-analytics";
import {
  recallIntakeTrade,
  rememberIntakeTrade,
  resolveTradeParam,
  slugForTradeTrack,
} from "./trade-preselect";

type User = { email: string; fullName: string | null };

/**
 * Where the verified-account CTA points. A trade landing page (e.g.
 * /resume-builder/hvac) sends visitors here with ?trade=<slug>; carry that
 * straight into the intake, falling back to the magic-link bridge value. This
 * link only ever renders after the account check resolves on the client, so
 * reading `window` here is safe.
 */
function intakeHref(): string {
  if (typeof window === "undefined") return "/resume-builder/intake";
  const track =
    resolveTradeParam(new URLSearchParams(window.location.search).get("trade")) ?? recallIntakeTrade();
  return track ? `/resume-builder/intake?trade=${slugForTradeTrack(track)}` : "/resume-builder/intake";
}

export function AccountStart() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [resent, setResent] = useState(false);

  // Persist a landing-page trade choice so it survives the magic-link email round trip.
  useEffect(() => {
    const fromParam = resolveTradeParam(new URLSearchParams(window.location.search).get("trade"));
    if (fromParam) rememberIntakeTrade(fromParam);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/resume-builder/me", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const result = await response.json() as { user?: User };
        return result.user ?? null;
      })
      .then((nextUser) => {
        if (active) setUser(nextUser);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => { active = false; };
  }, []);

  async function requestCode(email: string): Promise<boolean> {
    const response = await fetch("/api/resume-builder/auth/request", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      // Email is the only fact required to create/verify the account.
      // Name comes from an uploaded resume or the scratch intake later.
      body: JSON.stringify({ email }),
    });
    const result = await response.json() as { message?: string };
    if (!response.ok) throw new Error(result.message || "We could not send your sign-in code.");
    trackResumeFunnelEvent("resume_auth_requested");
    return true;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();

    try {
      await requestCode(email);
      setSentTo(email);
      setCode("");
      setCodeError("");
      setResent(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not send your sign-in code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) {
      setCodeError("Enter the 6-digit code from the email.");
      return;
    }
    setVerifying(true);
    setCodeError("");
    try {
      const response = await fetch("/api/resume-builder/auth/verify-code", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sentTo, code: digits }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "That code could not be used.");
      trackResumeFunnelEvent("sign_up", { auth_method: "code" });
      window.location.assign(intakeHref());
    } catch (error) {
      setCodeError(error instanceof Error ? error.message : "That code could not be used.");
      setVerifying(false);
    }
  }

  async function resend() {
    setCodeError("");
    try {
      await requestCode(sentTo);
      setResent(true);
      setCode("");
    } catch (error) {
      setCodeError(error instanceof Error ? error.message : "We could not send a new code.");
    }
  }

  if (!checking && user) {
    return (
      <div className="rb-account-ready">
        <span className="rb-status-dot" aria-hidden="true" />
        <div>
          <p>Verified account</p>
          <strong>{user.fullName || user.email}</strong>
          <small>{user.email}</small>
        </div>
        <a className="rb-button rb-button-primary" href={intakeHref()}>Upload resume or start fresh <span>→</span></a>
      </div>
    );
  }

  if (sentTo) {
    return (
      <form className="rb-account-form" onSubmit={verify} noValidate>
        <p className="rb-kicker" role="status">{resent ? "New code sent" : "Code sent"}</p>
        <p className="rb-form-note">
          We emailed a 6-digit code to <strong>{sentTo}</strong>. Keep this page open and enter it here.
        </p>
        <div className="rb-field">
          <label htmlFor="login-code">6-digit code</label>
          <input
            id="login-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            required
            autoFocus
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/[^\d ]/g, ""))}
            aria-invalid={codeError ? true : undefined}
            aria-describedby={codeError ? "login-code-error" : "login-code-help"}
          />
        </div>
        <button className="rb-button rb-button-primary rb-button-full" type="submit" disabled={verifying}>
          {verifying ? "Checking…" : "Verify & continue"} <span>→</span>
        </button>
        {codeError ? <p id="login-code-error" className="rb-inline-error" role="alert">{codeError}</p> : null}
        <p id="login-code-help" className="rb-form-note">
          The code expires in 10 minutes. On another device? Use the link in the same email instead.
        </p>
        <button className="rb-text-button" type="button" onClick={resend}>Send a new code</button>
        <button className="rb-text-button" type="button" onClick={() => { setSentTo(""); setMessage(""); setCode(""); setCodeError(""); }}>Use a different email</button>
      </form>
    );
  }

  return (
    <form className="rb-account-form" onSubmit={submit}>
      <div className="rb-field">
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" />
      </div>
      <button className="rb-button rb-button-primary rb-button-full" type="submit" disabled={submitting || checking}>
        {submitting ? "Sending secure link…" : "Continue with email"} <span>→</span>
      </button>
      <p className="rb-form-note">No password. We only use your email to verify your account. If you upload a resume, your name and resume facts come from that file.</p>
      {message ? <p className="rb-inline-error" role="alert">{message}</p> : null}
    </form>
  );
}
