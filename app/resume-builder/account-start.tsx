"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type User = { email: string; fullName: string | null };

export function AccountStart() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [message, setMessage] = useState("");

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();

    try {
      const response = await fetch("/api/resume-builder/auth/request", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: String(form.get("fullName") ?? "").trim(),
          email,
        }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "We could not send the confirmation link.");
      setSentTo(email);
      setMessage(result.message || "Check your inbox for the confirmation link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not send the confirmation link.");
    } finally {
      setSubmitting(false);
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
        <Link className="rb-button rb-button-primary" href="/resume-builder/intake">Continue to experience <span>→</span></Link>
      </div>
    );
  }

  if (sentTo) {
    return (
      <div className="rb-message-panel rb-message-success" role="status">
        <span className="rb-message-icon">✓</span>
        <p className="rb-kicker">/ LINK SENT</p>
        <h2>CHECK YOUR INBOX.</h2>
        <p>{message}</p>
        <strong>{sentTo}</strong>
        <small>The link expires in 20 minutes. Open it, then choose the confirmation button to finish signing in.</small>
        <button className="rb-text-button" type="button" onClick={() => { setSentTo(""); setMessage(""); }}>Use a different email</button>
      </div>
    );
  }

  return (
    <form className="rb-account-form" onSubmit={submit}>
      <div className="rb-field">
        <label htmlFor="fullName">Full name</label>
        <input id="fullName" name="fullName" autoComplete="name" maxLength={120} required placeholder="Your first and last name" />
      </div>
      <div className="rb-field">
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" />
      </div>
      <button className="rb-button rb-button-primary rb-button-full" type="submit" disabled={submitting || checking}>
        {submitting ? "Sending secure link…" : "Create account & continue"} <span>→</span>
      </button>
      <p className="rb-form-note"><span aria-hidden="true">◆</span> No password. We’ll email a secure confirmation link.</p>
      {message ? <p className="rb-inline-error" role="alert">{message}</p> : null}
    </form>
  );
}
