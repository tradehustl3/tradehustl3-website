import type { Metadata } from "next";
import Link from "next/link";
import { AdminReviewList } from "./review-list";

export const metadata: Metadata = {
  title: "Review Moderation | TRADE HUSTL3",
  robots: { index: false, follow: false },
};

export default function ReviewAdminPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f5f8fb", color: "#071a2b", padding: "32px 20px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Link href="/" style={{ fontWeight: 800, color: "#071a2b" }}>← TRADE HUSTL3</Link>
        <h1 style={{ fontSize: "clamp(2rem,5vw,4rem)", marginBottom: 8 }}>Customer Review Moderation</h1>
        <p style={{ color: "#526579", maxWidth: 760 }}>Approve only genuine customer feedback with explicit publishing permission. Never rewrite a customer quote to create a stronger outcome claim.</p>
        <AdminReviewList />
      </div>
    </main>
  );
}
