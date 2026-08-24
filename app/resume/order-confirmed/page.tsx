import type { Metadata } from "next";
import Link from "next/link";
import ResumeOrderStatusPanel from "./status-panel";
import styles from "../../resume-builder/resume-builder.module.css";

export const metadata: Metadata = {
  title: "Resume Builder Order | TRADE HUSTL3",
  robots: { index: false, follow: false },
};

export default async function ResumeOrderConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : "";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>TRADE HUSTL3</Link>
        <Link href="/resume-builder" className={styles.nav}>Resume Builder</Link>
      </header>
      <section className={styles.confirmationCard}>
        <p className={styles.eyebrow}>SECURE ORDER STATUS</p>
        <h1>PAYMENT CONFIRMATION</h1>
        <ResumeOrderStatusPanel sessionId={sessionId} />
      </section>
    </main>
  );
}
