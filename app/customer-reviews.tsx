"use client";

import { useEffect, useState } from "react";
import styles from "./customer-reviews.module.css";

type PublicReview = {
  id: string;
  name: string;
  trade: string;
  rating: number;
  review: string;
  result: string | null;
  verifiedCustomer: boolean;
};

export function CustomerReviews() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);

  useEffect(() => {
    let active = true;
    void fetch("/api/resume-builder/reviews/public", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return [];
        const payload = await response.json() as { reviews?: PublicReview[] };
        return payload.reviews ?? [];
      })
      .then((items) => { if (active) setReviews(items); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!reviews.length) return null;

  return (
    <section className={styles.section} aria-labelledby="customer-reviews-title">
      <div className={styles.heading}>
        <p>VERIFIED CUSTOMER FEEDBACK</p>
        <h2 id="customer-reviews-title">Real customers.<br /><span>Real words.</span></h2>
        <div>
          These reviews come from verified TRADE HUSTL3 Resume Builder customers who chose to let us publish their feedback.
        </div>
      </div>

      <div className={styles.grid}>
        {reviews.map((review) => (
          <article className={styles.card} key={review.id}>
            <div className={styles.cardTop}>
              <div className={styles.avatar} aria-hidden="true">{review.name.charAt(0).toUpperCase()}</div>
              <div className={styles.identity}>
                <strong>{review.name}</strong>
                <span>{review.trade}</span>
              </div>
              <span className={styles.verified}>✓ Verified customer</span>
            </div>
            <div className={styles.stars} aria-label={`${review.rating} out of 5 stars`}>
              {"★".repeat(review.rating)}<i>{"★".repeat(5 - review.rating)}</i>
            </div>
            <blockquote>“{review.review}”</blockquote>
            {review.result ? (
              <p className={styles.result}><strong>Customer-reported result</strong>{review.result}</p>
            ) : null}
          </article>
        ))}
      </div>

      <p className={styles.disclaimer}>Individual job-search outcomes vary. Result statements are customers&apos; own reports and are not employment guarantees.</p>
    </section>
  );
}
