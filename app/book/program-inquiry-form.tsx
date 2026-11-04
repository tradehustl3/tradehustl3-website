"use client";

import { FormEvent, useId, useRef, useState } from "react";
import {
  PROGRAM_FORMATS,
  PROGRAM_INQUIRY_HONEYPOT,
  PROGRAM_INQUIRY_LIMITS,
  PROGRAM_INQUIRY_ROUTE,
  PROGRAM_TYPES,
} from "./program-inquiry-options";

type Status = "idle" | "submitting" | "success" | "error";

const IDLE_MESSAGE = "We reply by email with the options available for your program.";

export function ProgramInquiryForm({ fallbackEmail }: { fallbackEmail: string }) {
  const id = useId();
  const isSubmitting = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState(IDLE_MESSAGE);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    const form = event.currentTarget;
    const data = new FormData(form);
    const field = (name: string) => String(data.get(name) ?? "").trim();

    setStatus("submitting");
    setMessage("Sending your request…");

    try {
      const response = await fetch(PROGRAM_INQUIRY_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          organization: field("organization"),
          contactName: field("contactName"),
          email: field("email"),
          role: field("role"),
          programType: field("programType"),
          format: field("format"),
          copies: Number(field("copies")),
          neededBy: field("neededBy"),
          message: field("message"),
          [PROGRAM_INQUIRY_HONEYPOT]: field(PROGRAM_INQUIRY_HONEYPOT),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || `We could not send your request. Please email ${fallbackEmail}.`);
      }
      setStatus("success");
      setMessage(payload.message || "Thanks. Your request is in.");
      form.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : `We could not send your request. Please email ${fallbackEmail}.`);
    } finally {
      isSubmitting.current = false;
    }
  }

  return (
    <form className="program-inquiry-form" onSubmit={handleSubmit} aria-describedby={`${id}-status`}>
      <div className="program-inquiry-grid">
        <div className="field-row field-row-wide">
          <label htmlFor={`${id}-organization`}>School, program, or organization</label>
          <input id={`${id}-organization`} name="organization" autoComplete="organization" required minLength={2} maxLength={PROGRAM_INQUIRY_LIMITS.organization} />
        </div>
        <div className="field-row">
          <label htmlFor={`${id}-name`}>Your name</label>
          <input id={`${id}-name`} name="contactName" autoComplete="name" required minLength={2} maxLength={PROGRAM_INQUIRY_LIMITS.contactName} />
        </div>
        <div className="field-row">
          <label htmlFor={`${id}-role`}>Role <span>(optional)</span></label>
          <input id={`${id}-role`} name="role" autoComplete="organization-title" maxLength={PROGRAM_INQUIRY_LIMITS.role} placeholder="Instructor, counselor, director…" />
        </div>
        <div className="field-row field-row-wide">
          <label htmlFor={`${id}-email`}>Work email</label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" required maxLength={254} />
        </div>
        <div className="field-row">
          <label htmlFor={`${id}-type`}>Program type</label>
          <select id={`${id}-type`} name="programType" required defaultValue="">
            <option value="" disabled>Choose one</option>
            {PROGRAM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div className="field-row">
          <label htmlFor={`${id}-format`}>Format</label>
          <select id={`${id}-format`} name="format" required defaultValue="">
            <option value="" disabled>Choose one</option>
            {PROGRAM_FORMATS.map((format) => <option key={format} value={format}>{format}</option>)}
          </select>
        </div>
        <div className="field-row">
          <label htmlFor={`${id}-copies`}>Estimated copies</label>
          <input id={`${id}-copies`} name="copies" type="number" inputMode="numeric" required min={PROGRAM_INQUIRY_LIMITS.minCopies} max={PROGRAM_INQUIRY_LIMITS.maxCopies} step={1} />
        </div>
        <div className="field-row">
          <label htmlFor={`${id}-needed`}>Needed by <span>(optional)</span></label>
          <input id={`${id}-needed`} name="neededBy" type="date" />
        </div>
        <div className="field-row field-row-wide">
          <label htmlFor={`${id}-message`}>Anything else? <span>(optional)</span></label>
          <textarea id={`${id}-message`} name="message" rows={3} maxLength={PROGRAM_INQUIRY_LIMITS.message} placeholder="Course or cohort, start date, questions about using the book with your program." />
        </div>
        {/* Honeypot: hidden from people and assistive tech; bots that fill it are dropped. */}
        <div className="program-inquiry-trap" aria-hidden="true">
          <label htmlFor={`${id}-trap`}>Leave this field empty</label>
          <input id={`${id}-trap`} name={PROGRAM_INQUIRY_HONEYPOT} tabIndex={-1} autoComplete="off" />
        </div>
      </div>
      <button
        className="button button-primary form-button"
        type="submit"
        disabled={status === "submitting"}
        data-cta="schools-inquiry-form"
        data-cta-location="book-schools"
      >
        {status === "submitting" ? "Sending…" : "Send program request"} <span aria-hidden="true">↗</span>
      </button>
      <p
        className={`form-status${status === "error" ? " is-error" : ""}${status === "success" ? " is-success" : ""}`}
        id={`${id}-status`}
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
      <small className="program-inquiry-consent">
        By sending, you agree to receive TRADE HUSTL3 book and program updates. Unsubscribe anytime.
      </small>
    </form>
  );
}
