import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ResumeCheckoutForm from "./checkout-form";
import styles from "./resume-builder.module.css";

export const metadata: Metadata = {
  title: "Trade Resume Builder | TRADE HUSTL3",
  description: "Build a skilled-trades resume with TRADE HUSTL3. Secure one-time Stripe checkout with paid access verified on the server.",
  alternates: { canonical: "/resume-builder" },
};

export default function ResumeBuilderPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="TRADE HUSTL3 home">
          <Image src="/trade-hustl3-logo.png" alt="TRADE HUSTL3 logo" width={58} height={58} priority />
          <span>TRADE HUSTL3</span>
        </Link>
        <nav className={styles.nav} aria-label="Resume Builder navigation">
          <Link href="/">Home</Link>
          <Link href="/book">Book</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>GET HIRED / TRADE RESUME BUILDER</p>
        <h1>TURN YOUR EXPERIENCE INTO A RESUME THAT SPEAKS THE LANGUAGE OF THE TRADES.</h1>
        <p className={styles.lead}>
          Choose your checkout option, pay once through Stripe, and unlock the paid Resume Builder flow only after the payment is confirmed by the TRADE HUSTL3 backend.
        </p>
        <div className={styles.trustRow}>
          <span>ONE-TIME PAYMENT</span>
          <span>SERVER-VERIFIED ACCESS</span>
          <span>BUILT FOR SKILLED TRADES</span>
        </div>
      </section>

      <section className={styles.checkoutSection}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>CHOOSE YOUR OPTION</p>
          <h2>PAY ONCE. BUILD WITH PURPOSE.</h2>
          <p>No subscription is created by these checkout options.</p>
        </div>
        <ResumeCheckoutForm />
      </section>

      <section className={styles.howItWorks}>
        <p className={styles.eyebrow}>HOW PAYMENT ACCESS WORKS</p>
        <div className={styles.steps}>
          <article><strong>01</strong><h3>Choose</h3><p>Select the single resume or bundle option and enter your email.</p></article>
          <article><strong>02</strong><h3>Pay</h3><p>Complete payment on Stripe&apos;s hosted checkout page.</p></article>
          <article><strong>03</strong><h3>Verify</h3><p>Stripe sends a signed webhook to TRADE HUSTL3. The redirect alone cannot unlock access.</p></article>
          <article><strong>04</strong><h3>Unlock</h3><p>Once D1 records the order as paid, the system issues private Resume Builder access.</p></article>
        </div>
      </section>

      <footer className={styles.footer}>
        <strong>TRADE HUSTL3</strong>
        <span>Built by Hustle, Backed by Trades.</span>
      </footer>
    </main>
  );
}
