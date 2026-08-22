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

export function SignupForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setStatus("submitting");
    setMessage("");

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
        }),
      });
      const result = await response.json() as { message?: string };

      if (!response.ok) throw new Error(result.message || "Signup failed.");

      setStatus("success");
      setMessage(result.message || "You're on the TRADE HUSTL3 list.");
      formElement.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "We couldn't save your signup. Please try again.");
    }
  }

  return (
    <>
      <form ref={formRef} className="signup" onSubmit={handleSubmit}>
        <div className="field-group interest-group">
          <label htmlFor="interest">I&apos;M INTERESTED IN</label>
          <select id="interest" name="interest" required defaultValue="" disabled={status === "submitting"}>
            <option value="" disabled>SELECT AN INTEREST</option>
            {interests.map((interest) => <option key={interest} value={interest}>{interest}</option>)}
          </select>
        </div>
        <div className="field-group email-group">
          <label htmlFor="email">EMAIL ADDRESS</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="YOU@EXAMPLE.COM" required disabled={status === "submitting"} />
        </div>
        {utmKeys.map((key) => <input key={key} type="hidden" name={key} defaultValue="" />)}
        <button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "SAVING..." : "KEEP ME POSTED"} <span>↗</span>
        </button>
      </form>
      <p className={`signup-status ${status}`} role={status === "error" ? "alert" : "status"} aria-live="polite">
        {message}
      </p>
    </>
  );
}
