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

type CustomerTestimonial = {
  id: string;
  name: string;
  trade: string;
  rating: number;
  review: string;
  image: string;
};

const consentedTestimonials: CustomerTestimonial[] = [
  {
    id: "jessica-m",
    name: "Jessica M.",
    trade: "Facilities Maintenance Technician",
    rating: 5,
    image: "/testimonials/jessica-m.webp",
    review: "I was struggling to find a trade job until I used TRADE HUSTL3. It helped me present my experience the right way, and I started getting calls for maintenance positions.",
  },
  {
    id: "david-r",
    name: "David R.",
    trade: "HVAC Technician",
    rating: 5,
    image: "/testimonials/david-r.webp",
    review: "This tool made it so easy to highlight my hands-on experience with HVAC systems. I got more interviews in one month than I had in the last six months, and now I’m working for a great company.",
  },
  {
    id: "taylor-s",
    name: "Taylor S.",
    trade: "Construction Laborer",
    rating: 5,
    image: "/testimonials/taylor-s.webp",
    review: "I love how simple and user-friendly this resume builder is. It helped me highlight my hands-on skills and experience, and I got hired at a top construction company within a few weeks!",
  },
  {
    id: "michael-t",
    name: "Michael T.",
    trade: "Skilled Trades Laborer",
    rating: 5,
    image: "/testimonials/michael-t.webp",
    review: "The resume templates are made for the trades. I was able to list my tools, certifications, and hands-on experience in minutes, and it really made a difference. I’m now working at a great company in the construction industry.",
  },
  {
    id: "marcus-k",
    name: "Marcus K.",
    trade: "Electrical Apprentice",
    rating: 5,
    image: "/testimonials/marcus-k.webp",
    review: "This resume builder helped me land my first electrical apprenticeship. I was getting overlooked before, but after using it, I started getting interviews right away and ended up with an offer from a local union contractor. Highly recommend!",
  },
  {
    id: "chris-l",
    name: "Chris L.",
    trade: "Plumbing Apprentice",
    rating: 5,
    image: "/testimonials/chris-l.webp",
    review: "I was struggling to find a plumbing job until I used TRADE HUSTL3. It helped me showcase my hands-on experience and certifications, and I started getting calls right away. I’m now working with a great plumbing company!",
  },
];

export function CustomerReviews() {
  const [verifiedReviews, setVerifiedReviews] = useState<PublicReview[]>([]);

  useEffect(() => {
    let active = true;
    void fetch("/api/resume-builder/reviews/public", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return [];
        const payload = await response.json() as { reviews?: PublicReview[] };
        return payload.reviews ?? [];
      })
      .then((items) => { if (active) setVerifiedReviews(items); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <section className={styles.section} aria-labelledby="customer-reviews-title">
      <div className={styles.heading}>
        <p>REAL CUSTOMER PROOF</p>
        <h2 id="customer-reviews-title">Real people.<br /><span>Real results.</span></h2>
        <div>
          Skilled-trades job seekers share what happened after using TRADE HUSTL3. Testimonials below are published with customer permission.
        </div>
      </div>

      <div className={styles.grid}>
        {consentedTestimonials.map((review) => (
          <article className={styles.card} key={review.id}>
            <div className={styles.cardTop}>
              <Image className={styles.photo} src={review.image} alt={`${review.name}, ${review.trade}`} width={170} height={235} />
              <div className={styles.identity}>
                <strong>{review.name}</strong>
                <span>{review.trade}</span>
                <em>Customer testimonial · used with permission</em>
              </div>
            </div>
            <div className={styles.stars} aria-label={`${review.rating} out of 5 stars`}>
              {"★".repeat(review.rating)}
            </div>
            <blockquote>“{review.review}”</blockquote>
          </article>
        ))}

        {verifiedReviews.map((review) => (
          <article className={styles.card} key={review.id}>
            <div className={styles.cardTop}>
              <div className={styles.avatar} aria-hidden="true">{review.name.charAt(0).toUpperCase()}</div>
              <div className={styles.identity}>
                <strong>{review.name}</strong>
                <span>{review.trade}</span>
                <em>✓ Verified TRADE HUSTL3 customer</em>
              </div>
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

      <p className={styles.disclaimer}>
        Customer experiences and job-search outcomes are self-reported and vary by person, trade, market, qualifications, and employer. TRADE HUSTL3 does not guarantee interviews or employment.
      </p>
    </section>
  );
}
