"use client";

import { useEffect, useState } from "react";
import styles from "./customer-reviews.module.css";

export type PublicReview = {
  id: string;
  name: string;
  trade: string;
  rating: number;
  review: string;
  result: string | null;
  verifiedCustomer: boolean;
};

// Each promise must stay true of the shipped product. Change the copy here
// when the product changes, never the other way around. "See it first" and
// "Your facts only" live in the homepage promise band, so they are not repeated.
const PROMISES = [
  { id: "price", label: "One price", title: "$9.99 once.", body: "Resume plus matching cover letter, clean PDF and Word files, and up to 3 corrections. No subscription." },
  { id: "delivery", label: "Delivered or refunded", title: "Files or a full refund.", body: "If we permanently cannot generate or deliver your paid resume, you get a full refund under the refund policy.", href: "/resume-builder/refund-policy" },
] as const;

export function CustomerReviews() {
  const [verifiedReviews, setVerifiedReviews] = useState<PublicReview[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    void fetch("/api/resume-builder/reviews/public", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) return [];
        const payload = await response.json() as { reviews?: PublicReview[] };
        return payload.reviews ?? [];
      })
      .then((items) => {
        if (active) setVerifiedReviews(items);
      })
      .catch(() => {
        if (active) setVerifiedReviews([]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={styles.wrap}>
      <VerifiedReviews reviews={loaded ? verifiedReviews : []} />

      <ul className={styles.promiseGrid} aria-label="What the Resume Builder promises">
        {PROMISES.map((promise) => (
          <li className={styles.promiseCard} key={promise.id}>
            <span>{promise.label}</span>
            <strong>{promise.title}</strong>
            <p>{promise.body}</p>
            {"href" in promise ? <a href={promise.href}>Read the refund policy</a> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Approved reviews from paid customers. Renders nothing at all until at least
 * one approved review exists, so the homepage never shows an empty reviews box.
 */
export function VerifiedReviews({ reviews }: { reviews: PublicReview[] }) {
  if (reviews.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="customer-reviews-title">
      <h2 id="customer-reviews-title" className={styles.title}>Reviews from verified buyers</h2>

      <div className={styles.box}>
        <div className={styles.verifiedGrid}>
          {reviews.map((review) => (
            <article className={styles.verifiedCard} key={review.id}>
              <div className={styles.verifiedTop}>
                <div className={styles.avatar} aria-hidden="true">
                  {review.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.identity}>
                  <strong>{review.name}</strong>
                  <span>{review.trade}</span>
                  <em>✓ VERIFIED PAID CUSTOMER</em>
                </div>
              </div>
              <div className={styles.stars} aria-label={`${review.rating} out of 5 stars`}>
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
      </div>

      <p className={styles.disclaimer}>
        Reviews and job-search outcomes are self-reported and vary by person, trade, market,
        qualifications, and employer. TRADE HUSTL3 does not guarantee interviews or employment.
      </p>
    </section>
  );
}
