"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./reviews.module.css";

type RequestInfo = {
  trade: string;
  defaultName: string;
  verifiedPurchase: boolean;
};

type LoadState = "loading" | "ready" | "invalid" | "submitted";

export function ReviewForm() {
  const [state, setState] = useState<LoadState>("loading");
  const [requestInfo, setRequestInfo] = useState<RequestInfo | null>(null);
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [resultText, setResultText] = useState("");
  const [recommend, setRecommend] = useState(false);
  const [consentPublish, setConsentPublish] = useState(false);
  const [consentResumeExample, setConsentResumeExample] = useState(false);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const currentToken = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(currentToken);
    if (!currentToken) {
      setState("invalid");
      setMessage("This review link is missing its verification token.");
      return;
    }

    void fetch(`/api/resume-builder/reviews/request?token=${encodeURIComponent(currentToken)}`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json() as { ok?: boolean; reviewRequest?: RequestInfo; message?: string };
        if (!response.ok || !payload.reviewRequest) throw new Error(payload.message || "This review link is not available.");
        setRequestInfo(payload.reviewRequest);
        setName(payload.reviewRequest.defaultName || "");
        setState("ready");
      })
      .catch((error) => {
        setState("invalid");
        setMessage(error instanceof Error ? error.message : "This review link is not available.");
      });
  }, []);

  const stars = useMemo(() => Array.from({ length: 5 }, (_, index) => index + 1), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch("/api/resume-builder/reviews/submit", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name,
          rating,
          reviewText,
          resultText,
          recommend,
          consentPublish,
          consentResumeExample,
        }),
      });
      const payload = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.message || "We could not save your review.");
      setMessage(payload.message || "Thank you for your feedback.");
      setState("submitted");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not save your review.");
    } finally {
      setWorking(false);
    }
  }

  if (state === "loading") {
    return <section className={styles.card}><p className={styles.status}>Verifying your customer review link…</p></section>;
  }

  if (state === "invalid") {
    return (
      <section className={styles.card}>
        <p className={styles.kicker}>LINK NOT AVAILABLE</p>
        <h2>We could not verify this review request.</h2>
        <p className={styles.status}>{message}</p>
        <a className={styles.button} href="mailto:support@tradehustl3.com">Contact support</a>
      </section>
    );
  }

  if (state === "submitted") {
    return (
      <section className={styles.card}>
        <div className={styles.successMark}>✓</div>
        <p className={styles.kicker}>FEEDBACK RECEIVED</p>
        <h2>Thank you for keeping it real.</h2>
        <p className={styles.status}>{message}</p>
        <p className={styles.finePrint}>
          Publishing permission does not guarantee a review will be featured. TRADE HUSTL3 does not rewrite customer reviews into stronger outcome claims.
        </p>
      </section>
    );
  }

  return (
    <form className={styles.card} onSubmit={submit}>
      <div className={styles.verifiedRow}>
        <span className={styles.verifiedBadge}>✓ Verified TRADE HUSTL3 customer</span>
        <span>{requestInfo?.trade}</span>
      </div>

      <label className={styles.field}>
        <span>Name</span>
        <small>If published, we automatically show only your first name and last initial.</small>
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoComplete="name" />
      </label>

      <fieldset className={styles.ratingField}>
        <legend>How would you rate the Resume Builder?</legend>
        <div className={styles.stars}>
          {stars.map((value) => (
            <button
              type="button"
              key={value}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              aria-pressed={rating === value}
              className={value <= rating ? styles.starActive : styles.star}
              onClick={() => setRating(value)}
            >★</button>
          ))}
        </div>
        <span>{rating} / 5</span>
      </fieldset>

      <label className={styles.field}>
        <span>What was your experience with TRADE HUSTL3?</span>
        <small>Use your own words. Positive, negative, and mixed feedback are all welcome.</small>
        <textarea required minLength={20} maxLength={1200} rows={7} value={reviewText} onChange={(event) => setReviewText(event.target.value)} placeholder="What helped? What was confusing? What would you tell another tradesperson?" />
        <b>{reviewText.length}/1200</b>
      </label>

      <label className={styles.field}>
        <span>Did anything change in your job search? <em>Optional</em></span>
        <small>Only state what actually happened. For example: more interviews, a callback, an offer, or no change yet.</small>
        <textarea maxLength={500} rows={4} value={resultText} onChange={(event) => setResultText(event.target.value)} placeholder="Customer-reported result (optional)" />
      </label>

      <label className={styles.checkRow}>
        <input type="checkbox" checked={recommend} onChange={(event) => setRecommend(event.target.checked)} />
        <span>I would recommend TRADE HUSTL3 to another skilled-trades job seeker.</span>
      </label>

      <div className={styles.consentBox}>
        <strong>Publishing permission</strong>
        <label className={styles.checkRow}>
          <input type="checkbox" checked={consentPublish} onChange={(event) => setConsentPublish(event.target.checked)} />
          <span>TRADE HUSTL3 may publish my first name + last initial, trade, star rating, review, and any result I wrote above.</span>
        </label>
        <label className={styles.checkRow}>
          <input type="checkbox" checked={consentResumeExample} onChange={(event) => setConsentResumeExample(event.target.checked)} />
          <span>TRADE HUSTL3 may contact me separately about showing a before/after resume example. This does not automatically publish my resume.</span>
        </label>
      </div>

      <p className={styles.finePrint}>
        No discount, payment, reward, or other incentive is offered for this review. Reviews are moderated for privacy, abuse, and publishing consent—not for positivity.
      </p>

      {message ? <p className={styles.error} role="alert">{message}</p> : null}
      <button className={styles.button} type="submit" disabled={working}>
        {working ? "Submitting…" : "Submit honest feedback"}
      </button>
    </form>
  );
}
