"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../resume-builder.module.css";

type AccessState = {
  loading: boolean;
  paid: boolean;
  plan?: "single" | "bundle";
};

export default function ResumeAccessGate() {
  const [access, setAccess] = useState<AccessState>({ loading: true, paid: false });

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        const response = await fetch("/api/resume/access", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = await response.json() as { paid?: boolean; plan?: "single" | "bundle" };
        if (!cancelled) setAccess({ loading: false, paid: data.paid === true, plan: data.plan });
      } catch {
        if (!cancelled) setAccess({ loading: false, paid: false });
      }
    }

    void verify();
    return () => { cancelled = true; };
  }, []);

  if (access.loading) {
    return <p className={styles.pending}>Checking paid access…</p>;
  }

  if (!access.paid) {
    return (
      <>
        <p className={styles.pending}>Paid Resume Builder access was not found on this device.</p>
        <p>Complete checkout first. Access is granted only after Stripe verifies the payment through the server webhook.</p>
        <Link className={styles.primaryButton} href="/resume-builder">Go to Resume Builder checkout</Link>
      </>
    );
  }

  return (
    <>
      <p className={styles.success}>Paid access confirmed.</p>
      <p>Your plan: <strong>{access.plan === "bundle" ? "Resume Bundle" : "Single Resume"}</strong>.</p>
      <h2>Resume workspace unlocked</h2>
      <p>
        The checkout, webhook verification, D1 paid-order record, and protected access gate are active in this build. The next module connects your trade-specific intake, AI resume generation, preview watermarking, and final PDF/DOCX export to this paid gate.
      </p>
    </>
  );
}
