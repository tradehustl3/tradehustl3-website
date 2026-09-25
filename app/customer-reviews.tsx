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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    void fetch("/api/resume-builder/reviews/public", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) return [];
        const payload = await response.json() as {
          reviews?: PublicReview[];
        };
        return payload.reviews ?? [];
      })
      .then((items) => {
        if (!active) return;
        setReviews(items);
      })
      .catch(() => {
        if (active) setReviews([]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  // Do not show a testimonial section until genuine approved reviews exist.
  if (!loaded || reviews.length === 0) return null;

  return (
    <section
      className={styles.section}
      aria-labelledby="customer-reviews-title"
    >
      <div className={styles.heading}>
        <p>VERIFIED CUSTOMER FEEDBACK</p>

        <h2 id="customer-reviews-title">
          Real people.<br />
          <span>Real feedback.</span>
        </h2>

        <div>
          Feedback from verified paid TRADE HUSTL3 Resume Builder customers
          who gave permission for their review to be published.
        </div>
      </div>

      <div className={styles.grid}>
        {reviews.map((review) => (
          <article className={styles.card} key={review.id}>
            <div className={styles.cardTop}>
              <div className={styles.avatar} aria-hidden="true">
                {review.name.charAt(0).toUpperCase()}
              </div>

              <div className={styles.identity}>
                <strong>{review.name}</strong>
                <span>{review.trade}</span>
                <em>✓ Verified TRADE HUSTL3 customer</em>
              </div>
            </div>

            <div
              className={styles.stars}
              aria-label={`${review.rating} out of 5 stars`}
            >
              {"★".repeat(review.rating)}
              <i>{"★".repeat(Math.max(0, 5 - review.rating))}</i>
            </div>

            <blockquote>“{review.review}”</blockquote>

            {review.result ? (
              <p className={styles.result}>
                <strong>Customer-reported result</strong>
                {review.result}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      <p className={styles.disclaimer}>
        Customer experiences and job-search outcomes are self-reported and vary
        by person, trade, market, qualifications, and employer. TRADE HUSTL3
        does not guarantee interviews or employment.
      </p>
    </section>
  );
}
