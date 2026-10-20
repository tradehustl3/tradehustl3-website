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

// Each promise must stay true of the shipped product. Change the copy here
// when the product changes, never the other way around.
const PROMISES = [
  { id: "preview", label: "See it first", title: "$0 to preview.", body: "HUSTL3 BOT builds your full resume before you pay. You only spend $9.99 if it is worth sending." },
  { id: "facts", label: "Nothing made up", title: "Your facts only.", body: "Employers, dates, licenses, tools and numbers come from what you give it. HUSTL3 BOT never invents a certification, title or result." },
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

  const hasReviews = loaded && verifiedReviews.length > 0;

  return (
    <section className={styles.section} aria-labelledby="customer-reviews-title">
      <h2 id="customer-reviews-title" className={styles.title}>Reviews from verified buyers</h2>

      <div className={styles.box}>
        {hasReviews ? (
          <div className={styles.verifiedGrid}>
            {verifiedReviews.map((review) => (
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
        ) : (
          // Server-rendered default, and what stays when no review is approved yet.
          <div className={styles.empty} data-reviews-empty>
            <p>
              Only customers with a completed purchase can leave a review here. The first ones will appear as
              soon as they&apos;re approved.
            </p>
            <a
              href="#resume-start"
              className={styles.emptyCta}
              data-analytics-event="cta_click"
              data-location="reviews_empty"
              data-destination="#resume-start"
            >
              Build my free preview
            </a>
          </div>
        )}
      </div>

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

      {hasReviews ? (
        <p className={styles.disclaimer}>
          Reviews and job-search outcomes are self-reported and vary by person, trade, market,
          qualifications, and employer. TRADE HUSTL3 does not guarantee interviews or employment.
        </p>
      ) : null}
    </section>
  );
}
