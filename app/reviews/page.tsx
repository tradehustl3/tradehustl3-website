import type { Metadata } from "next";
import Link from "next/link";
import { ReviewForm } from "./review-form";
import styles from "./reviews.module.css";

export const metadata: Metadata = {
  title: "Customer Review | TRADE HUSTL3",
  description: "Share honest feedback about the TRADE HUSTL3 Resume Builder.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function ReviewsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>TRADE HUSTL<span>3</span></Link>
        <Link href="/contact" className={styles.support}>Support</Link>
      </header>

      <section className={styles.hero}>
        <p className={styles.kicker}>VERIFIED CUSTOMER FEEDBACK</p>
        <h1>Your experience.<br /><span>Your words.</span></h1>
        <p>
          Tell us what the Resume Builder did well, what it could do better, and what happened in your job search.
          We want the truth—not a scripted testimonial.
        </p>
      </section>

      <ReviewForm />

      <footer className={styles.footer}>
        <p>TRADE HUSTL3 LLC · Atlanta, Georgia</p>
        <div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Support</Link></div>
      </footer>
    </main>
  );
}
