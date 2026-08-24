import type { Metadata } from "next";
import Link from "next/link";
import ResumeAccessGate from "./access-gate";
import styles from "../resume-builder.module.css";

export const metadata: Metadata = {
  title: "Resume Builder Workspace | TRADE HUSTL3",
  robots: { index: false, follow: false },
};

export default function ResumeBuilderCreatePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>TRADE HUSTL3</Link>
        <Link href="/resume-builder" className={styles.nav}>Resume Builder</Link>
      </header>
      <section className={styles.confirmationCard}>
        <p className={styles.eyebrow}>PAID WORKSPACE</p>
        <h1>BUILD YOUR RESUME</h1>
        <ResumeAccessGate />
      </section>
    </main>
  );
}
