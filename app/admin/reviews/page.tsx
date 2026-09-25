import type { Metadata } from "next";
import Link from "next/link";
import { ReviewAdmin } from "./review-admin";
import styles from "./review-admin.module.css";

export const metadata: Metadata = {
  title: "Review Moderation | TRADE HUSTL3",
  robots: { index: false, follow: false, noarchive: true },
};

export default function ReviewAdminPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>TRADE HUSTL<span>3</span></Link>
        <span>Review moderation</span>
      </header>
      <section className={styles.intro}>
        <p>INTERNAL · CUSTOMER PROOF</p>
        <h1>Verified review moderation</h1>
        <span>Approve only reviews with explicit publishing permission. Customer wording is displayed as submitted.</span>
      </section>
      <ReviewAdmin />
    </main>
  );
}
