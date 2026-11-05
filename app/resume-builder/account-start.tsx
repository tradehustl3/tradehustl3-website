"use client";

import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { trackResumeFunnelEvent } from "./funnel-analytics";
import type { TradeTrack } from "./trade-content";
import {
  clearIntakeTrade,
  recallIntakeTrade,
  rememberIntakeTrade,
  resolveTradeParam,
  slugForTradeTrack,
  withTradeParam,
} from "./trade-preselect";

type User = { email: string; fullName: string | null };

/** One quick-pick trade on the email step. The page passes the homepage hero's trades. */
export type StartTradeOption = { label: string; track: TradeTrack };

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

/**
 * Optional trade picker shown above the email box. Most homepage CTAs land on
 * the plain #resume-start, so without this the visitor reaches the email step
 * with no trade chosen. A pick is stored exactly like a landing-page
 * `?trade=`: in the URL (so `intakeHref()` and a refresh agree) and in the
 * magic-link bridge (so it survives the inbox round trip). Choosing is never
 * required; the intake still asks when nothing was picked.
 */
function TradePicker({
  options,
  selected,
  onSelect,
}: {
  options: readonly StartTradeOption[];
  selected: TradeTrack | null;
  onSelect: (track: TradeTrack | null) => void;
}) {
  // A ?trade= for a track without a quick-pick chip (e.g. roofing) still shows as chosen.
  const shown = selected && !options.some((option) => option.track === selected)
    ? [{ label: selected, track: selected }, ...options]
    : options;
  return (
    <div className="rb-start-trades" role="group" aria-labelledby="start-trade-label">
      <p id="start-trade-label" className="rb-start-trades-label">
        Your trade <span>(optional)</span>
      </p>
      <div className="rb-start-trades-chips">
        {shown.map((option) => {
          const pressed = option.track === selected;
          return (
            <button
              key={option.track}
              type="button"
              className="rb-start-trade"
              aria-pressed={pressed}
              onClick={() => onSelect(pressed ? null : option.track)}
              data-analytics-event="select_content"
              data-location="start_panel_trade_picker"
              data-item={slugForTradeTrack(option.track)}
              data-destination="#resume-start"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const subscribeToNothing = () => () => undefined;
const recallNothing = () => null;

export function AccountStart({
  tradeOptions = [],
  initialTrack = null,
}: {
  /** Quick-pick trades for the email step. Empty hides the picker. */
  tradeOptions?: readonly StartTradeOption[];
  /** The server-resolved `?trade=`, so the first render already shows it chosen. */
  initialTrack?: TradeTrack | null;
} = {}) {
  // undefined = the visitor has not touched the picker; null = they cleared it.
  const [picked, setPicked] = useState<TradeTrack | null | undefined>(undefined);
  // A trade remembered earlier in this visit (bridge value). Read on the client
  // only, so the server render and hydration both start from `initialTrack`.
  const recalled = useSyncExternalStore(subscribeToNothing, recallIntakeTrade, recallNothing);
  const trade = picked !== undefined ? picked : initialTrack ?? recalled;
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [resent, setResent] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null);

  // After the visitor submits their email, move focus to the code box they now
  // need (a response to their action, not focus stolen on page load).
  useEffect(() => {
    if (sentTo) codeInput.current?.focus();
  }, [sentTo]);

  // Persist a landing-page trade choice so it survives the magic-link email round trip.
  useEffect(() => {
    const fromParam = resolveTradeParam(new URLSearchParams(window.location.search).get("trade"));
    if (fromParam) rememberIntakeTrade(fromParam);
  }, []);

  function selectTrade(next: TradeTrack | null) {
    setPicked(next);
    if (next) rememberIntakeTrade(next);
    else clearIntakeTrade();
    try {
      window.history.replaceState(window.history.state, "", withTradeParam(window.location.href, next));
    } catch {
      // History API unavailable: the bridge value above still carries the pick.
    }
  }

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
            ref={codeInput}
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
      {tradeOptions.length > 0 ? <TradePicker options={tradeOptions} selected={trade} onSelect={selectTrade} /> : null}
      <div className="rb-field">
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" />
      </div>
      <button className="rb-button rb-button-primary rb-button-full" type="submit" disabled={submitting || checking}>
        {submitting ? "Sending your code…" : "Continue with email"} <span>→</span>
      </button>
      <p className="rb-form-note">
        Next: upload your resume or answer a few questions about your work. You read the whole resume before you pay anything.
      </p>
      <p className="rb-form-note">No password. We only use your email to verify your account. If you upload a resume, your name and resume facts come from that file.</p>
      {message ? <p className="rb-inline-error" role="alert">{message}</p> : null}
    </form>
  );
}
