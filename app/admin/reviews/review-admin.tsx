"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./review-admin.module.css";

type Review = {
  id: string;
  name: string;
  trade: string;
  rating: number;
  review: string;
  result: string | null;
  recommend: boolean;
  consentPublish: boolean;
  consentResumeExample: boolean;
  status: string;
  createdAt: string;
};

export function ReviewAdmin() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [message, setMessage] = useState("Loading reviews…");
  const [working, setWorking] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/resume-builder/reviews/admin", { credentials: "same-origin", cache: "no-store" });
      const payload = await response.json() as { ok?: boolean; reviews?: Review[]; message?: string };
      if (!response.ok) throw new Error(payload.message || "Could not load reviews.");
      setReviews(payload.reviews ?? []);
      setMessage((payload.reviews?.length ?? 0) ? "" : "No customer reviews have been submitted yet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load reviews.");
    }
  }, []);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  async function moderate(reviewId: string, status: "approved" | "rejected") {
    setWorking(reviewId);
    setMessage("");
    try {
      const response = await fetch("/api/resume-builder/reviews/admin", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, status }),
      });
      const payload = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.message || "Could not update this review.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update this review.");
    } finally {
      setWorking("");
    }
  }

  return (
    <section className={styles.wrap}>
      {message ? (
        <div className={styles.notice}>
          <p>{message}</p>
          {message.toLowerCase().includes("sign in") ? <Link href="/#resume-start">Sign in through the Resume Builder</Link> : null}
        </div>
      ) : null}

      <div className={styles.grid}>
        {reviews.map((review) => (
          <article className={styles.card} key={review.id}>
            <div className={styles.top}>
              <div><strong>{review.name}</strong><span>{review.trade}</span></div>
              <b className={styles[review.status]}>{review.status}</b>
            </div>
            <div className={styles.stars} aria-label={`${review.rating} out of 5 stars`}>
              {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
            </div>
            <blockquote>“{review.review}”</blockquote>
            {review.result ? <p className={styles.result}><strong>Customer-reported result:</strong> {review.result}</p> : null}
            <ul>
              <li>Recommend: <strong>{review.recommend ? "Yes" : "No"}</strong></li>
              <li>Publish consent: <strong>{review.consentPublish ? "Yes" : "No"}</strong></li>
              <li>Resume-example contact consent: <strong>{review.consentResumeExample ? "Yes" : "No"}</strong></li>
            </ul>
            <div className={styles.actions}>
              <button disabled={working === review.id || !review.consentPublish} onClick={() => void moderate(review.id, "approved")}>Approve</button>
              <button disabled={working === review.id} onClick={() => void moderate(review.id, "rejected")}>Reject</button>
            </div>
            {!review.consentPublish ? <small>Cannot be published: customer kept this feedback private.</small> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
