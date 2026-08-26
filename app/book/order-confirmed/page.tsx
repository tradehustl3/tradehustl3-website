import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Order Confirmed | TRADE HUSTL3",
  description: "Your TRADE HUSTL3 eBook order has been confirmed.",
  robots: { index: false, follow: false },
};

export default function OrderConfirmedPage() {
  return (
    <main className="order-confirmed-page">
      <section className="order-confirmed-card">
        <p className="section-label">/ PAYMENT CONFIRMED</p>
        <h1>YOU’RE IN.<br /><span>LET’S BUILD.</span></h1>
        <p>
          Your TRADE HUSTL3 eBook purchase is complete. Preorders receive their private download link by email on September 15, 2026. Purchases made after launch receive the link after payment.
        </p>
        <div className="order-confirmed-note">
          <strong>Check your inbox and spam folder.</strong>
          <span>Your confirmation and delivery emails come from TRADE HUSTL3. Keep the delivery email for future downloads.</span>
        </div>
        <Link className="button button-secondary" href="/book">Return to the book page</Link>
      </section>
    </main>
  );
}
