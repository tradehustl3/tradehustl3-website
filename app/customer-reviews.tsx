"use client";

import Image from "next/image";
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
  {
    id: "preview",
    label: "See it first",
    title: "$0 to preview.",
    body: "HUSTL3 BOT builds your full resume before you pay. You only spend $9.99 if it is worth sending.",
  },
  {
    id: "facts",
    label: "Nothing made up",
    title: "Your facts only.",
    body: "Employers, dates, licenses, tools and numbers come from what you give it. HUSTL3 BOT never invents a certification, title or result.",
  },
  {
    id: "price",
    label: "One price",
    title: "$9.99 once.",
    body: "Resume plus matching cover letter, clean PDF and Word files, and up to 3 corrections. No subscription.",
  },
  {
    id: "delivery",
    label: "Delivered or refunded",
    title: "Files or a full refund.",
    body: "If we permanently cannot generate or deliver your paid resume, you get a full refund under the refund policy.",
    href: "/resume-builder/refund-policy",
  },
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
    <section className={styles.section} aria-labelledby="customer-reviews-title">
      <div className={styles.heading}>
        <p>WHY TRUST TRADE HUSTL3</p>
        <h2 id="customer-reviews-title">Built by a tradesman. <span>Checked against your facts.</span></h2>
        <div>
          No borrowed success stories. Here is who built the Resume Builder and exactly what it will
          and will not do with your experience.
        </div>
        <div className={styles.proofBar} aria-label="TRADE HUSTL3 at a glance">
          <span><b>10+</b> years in HVAC and facilities</span>
          <span><b>7</b> skilled-trade paths</span>
          <span><b>$0</b> to preview · <b>$9.99</b> to unlock</span>
        </div>
      </div>

      <div className={styles.trustGrid}>
        <article className={styles.founderCard} aria-labelledby="founder-name">
          <Image
            className={styles.founderPhoto}
            src="/zachary-ellis-author.jpg"
            alt="Da Maintenance Mane, founder of TRADE HUSTL3"
            width={1086}
            height={1449}
            sizes="(max-width: 680px) 112px, 150px"
          />
          <div className={styles.founderCopy}>
            <span className={styles.founderLabel}>FOUNDER</span>
            <strong id="founder-name">Da Maintenance Mane</strong>
            <span className={styles.founderRole}>HVAC and facilities maintenance · 10+ years in the field</span>
            <p>
              An HVAC and facilities maintenance professional with 10+ years of hands-on experience in
              residential and commercial systems, preventive maintenance, facilities operations, team
              leadership and vendor coordination.
            </p>
            <p>
              TRADE HUSTL3 was born from real work, real lessons, and a clear purpose: help the next
              generation enter skilled trades, earn through useful ability, and elevate into leadership,
              ownership, and long-term opportunity.
            </p>
          </div>
        </article>

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

      {loaded && verifiedReviews.length > 0 ? (
        <div className={styles.verifiedWrap}>
          <div className={styles.verifiedHeading}>
            <span>VERIFIED FEEDBACK</span>
            <strong>From paid Resume Builder customers</strong>
          </div>
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
        </div>
      ) : (
        <div className={styles.reviewInvite}>
          <strong>Reviews here come only from paid customers.</strong>
          <p>
            After your purchase you can leave a review. It is published only with your permission and
            only after we confirm the order is real.
          </p>
        </div>
      )}

      <p className={styles.disclaimer}>
        Customer-reported results vary by person, trade, market, qualifications, and employer.
        TRADE HUSTL3 does not guarantee interviews or employment.
      </p>
    </section>
  );
}
