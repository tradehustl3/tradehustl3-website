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

type CustomerStory = {
  id: string;
  name: string;
  trade: string;
  rating: number;
  review: string;
  image: string;
};

const customerStories: CustomerStory[] = [
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
        <p>REAL CUSTOMER STORIES</p>
        <h2 id="customer-reviews-title">Real People. <span>Real Results.</span></h2>
        <div>
          Skilled-trades job seekers share how TRADE HUSTL3 helped them present their experience,
          compete for the right roles, and move their job search forward.
        </div>
        <div className={styles.proofBar} aria-label="TRADE HUSTL3 customer proof">
          <span><b>6</b> customer stories</span>
          <span><b>7</b> skilled-trade paths</span>
          <span><b>$0</b> to preview · <b>$9.99</b> to unlock</span>
        </div>
      </div>

      <div className={styles.storyGrid} aria-label="Customer stories">
        {customerStories.map((story) => (
          <article className={styles.storyCard} key={story.id}>
            <div className={styles.storyTop}>
              <Image
                className={styles.photo}
                src={story.image}
                alt={`${story.name}, ${story.trade}`}
                width={110}
                height={150}
                sizes="(max-width: 760px) 84px, 110px"
              />
              <div className={styles.storyIdentity}>
                <strong>{story.name}</strong>
                <span>{story.trade}</span>
                <div className={styles.stars} aria-label={`${story.rating} out of 5 stars`}>
                  {"★".repeat(story.rating)}
                </div>
                <em>CUSTOMER STORY</em>
              </div>
            </div>
            <blockquote>“{story.review}”</blockquote>
          </article>
        ))}
      </div>

      {loaded && verifiedReviews.length > 0 ? (
        <div className={styles.verifiedWrap}>
          <div className={styles.verifiedHeading}>
            <span>NEW VERIFIED FEEDBACK</span>
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
      ) : null}

      <p className={styles.disclaimer}>
        Customer stories and job-search outcomes are self-reported and vary by person, trade, market,
        qualifications, and employer. TRADE HUSTL3 does not guarantee interviews or employment.
      </p>
    </section>
  );
}
