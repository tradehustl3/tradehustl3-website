"use client";

import { useEffect, useState } from "react";

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

export function AdminReviewList() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [message, setMessage] = useState("Loading reviews…");

  async function load() {
    const response = await fetch("/api/resume-builder/reviews/admin", { credentials: "same-origin", cache: "no-store" });
    const result = await response.json() as { reviews?: Review[]; message?: string };
    if (!response.ok) {
      setMessage(result.message || "Could not load reviews.");
      return;
    }
    setReviews(result.reviews ?? []);
    setMessage(result.reviews?.length ? "" : "No reviews submitted yet.");
  }

  useEffect(() => { void load(); }, []);

  async function moderate(id: string, status: "approved" | "rejected") {
    const response = await fetch("/api/resume-builder/reviews/admin", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId: id, status }),
    });
    const result = await response.json() as { message?: string };
    if (!response.ok) {
      setMessage(result.message || "Could not update the review.");
      return;
    }
    await load();
  }

  if (message && !reviews.length) return <p style={{ marginTop: 28, fontWeight: 700 }}>{message}</p>;

  return (
    <div style={{ display: "grid", gap: 18, marginTop: 28 }}>
      {message ? <p>{message}</p> : null}
      {reviews.map((review) => (
        <article key={review.id} style={{ background: "#fff", border: "1px solid #dbe4ec", borderRadius: 18, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div><strong>{review.name}</strong> · {review.trade}</div>
            <div>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)} · {review.status}</div>
          </div>
          <p style={{ lineHeight: 1.6 }}>{review.review}</p>
          {review.result ? <p style={{ lineHeight: 1.6 }}><strong>Reported result:</strong> {review.result}</p> : null}
          <p style={{ fontSize: ".9rem", color: "#526579" }}>Publish consent: {review.consentPublish ? "Yes" : "No"} · Resume-example contact consent: {review.consentResumeExample ? "Yes" : "No"} · Recommend: {review.recommend ? "Yes" : "No"}</p>
          {review.status === "pending" ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => void moderate(review.id, "approved")} disabled={!review.consentPublish} style={{ padding: "10px 16px", fontWeight: 800 }}>Approve</button>
              <button onClick={() => void moderate(review.id, "rejected")} style={{ padding: "10px 16px", fontWeight: 800 }}>Reject</button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
