"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../../resume-builder/resume-builder.module.css";

type OrderStatus = {
  ok?: boolean;
  paid?: boolean;
  status?: string;
  plan?: "single" | "bundle";
  accessToken?: string;
};

export default function ResumeOrderStatusPanel({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<OrderStatus>({ status: "pending" });
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      try {
        const response = await fetch(`/api/resume/order-status?session_id=${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });
        const data = await response.json() as OrderStatus;
        if (cancelled) return;
        setStatus(data);
        setAttempts((value) => value + 1);
        if (!data.paid && attempts < 9) timer = setTimeout(check, 1500);
      } catch {
        if (!cancelled && attempts < 9) timer = setTimeout(check, 1500);
      }
    }

    void check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, attempts]);

  if (!sessionId) {
    return <p className={styles.pending}>Missing Stripe session. Return to the Resume Builder and try again.</p>;
  }

  if (status.paid && status.accessToken) {
    return (
      <>
        <p className={styles.success}>Payment verified. Your Resume Builder order is unlocked.</p>
        <p>Your paid plan: <strong>{status.plan === "bundle" ? "Resume Bundle" : "Single Resume"}</strong>.</p>
        <p>The next build phase will use the private access token issued by the backend to authorize resume generation and protected exports.</p>
        <Link className={styles.primaryButton} href={`/resume-builder?access=${encodeURIComponent(status.accessToken)}`}>
          Continue to Resume Builder
        </Link>
      </>
    );
  }

  return (
    <>
      <p className={styles.pending}>Payment received. Waiting for Stripe verification…</p>
      <p>The page is checking the server for the signed Stripe webhook. Access will not unlock from the redirect alone.</p>
    </>
  );
}
