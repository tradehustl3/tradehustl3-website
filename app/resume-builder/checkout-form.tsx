"use client";

import { FormEvent, useState } from "react";
import styles from "./resume-builder.module.css";

type Plan = "single" | "bundle";

export default function ResumeCheckoutForm() {
  const [email, setEmail] = useState("");
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const [message, setMessage] = useState("");

  async function startCheckout(event: FormEvent<HTMLFormElement>, plan: Plan) {
    event.preventDefault();
    setMessage("");
    setLoadingPlan(plan);

    try {
      const response = await fetch("/api/resume/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan }),
      });
      const data = await response.json() as { ok?: boolean; checkoutUrl?: string; message?: string };
      if (!response.ok || !data.ok || !data.checkoutUrl) {
        throw new Error(data.message || "Checkout could not be started.");
      }
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout could not be started.");
      setLoadingPlan(null);
    }
  }

  return (
    <div className={styles.checkoutWrap}>
      <label className={styles.emailLabel} htmlFor="resume-email">Email for your order</label>
      <input
        className={styles.emailInput}
        id="resume-email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <p className={styles.emailHelp}>Stripe uses this email for checkout, and TRADE HUSTL3 uses it to match the paid order.</p>

      <div className={styles.planGrid}>
        <form onSubmit={(event) => startCheckout(event, "single")} className={styles.planCard}>
          <div>
            <span className={styles.planTag}>SINGLE</span>
            <h2>One Resume</h2>
            <p className={styles.price}><strong>$9</strong><span>one-time</span></p>
          </div>
          <p>One secure Resume Builder purchase. Payment is verified on the server before access is unlocked.</p>
          <button className={styles.primaryButton} type="submit" disabled={loadingPlan !== null || !email}>
            {loadingPlan === "single" ? "Opening Stripe…" : "Build My Resume — $9"}
          </button>
        </form>

        <form onSubmit={(event) => startCheckout(event, "bundle")} className={`${styles.planCard} ${styles.featuredCard}`}>
          <div>
            <span className={styles.planTag}>BUNDLE</span>
            <h2>Resume Bundle</h2>
            <p className={styles.price}><strong>$15</strong><span>one-time</span></p>
          </div>
          <p>Bundle checkout with the same secure paid-order verification. Bundle entitlements can be expanded without changing checkout.</p>
          <button className={styles.primaryButton} type="submit" disabled={loadingPlan !== null || !email}>
            {loadingPlan === "bundle" ? "Opening Stripe…" : "Choose Bundle — $15"}
          </button>
        </form>
      </div>

      {message ? <p className={styles.errorMessage} role="alert">{message}</p> : null}
      <p className={styles.securityNote}>Secure Stripe Checkout · No card data is stored on TRADE HUSTL3 servers.</p>
    </div>
  );
}
