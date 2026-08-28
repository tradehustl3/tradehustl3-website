import type { Metadata } from "next";
import Link from "next/link";
import { OrderConfirmationCopy } from "./order-confirmation-copy";

export const metadata: Metadata = {
  title: "Order Confirmed | TRADE HUSTL3",
  description: "Your TRADE HUSTL3 eBook order has been confirmed.",
  robots: { index: false, follow: false },
};

export default function OrderConfirmedPage() {
  return (
    <main className="order-confirmed-page">
      <section className="order-confirmed-card">
        <OrderConfirmationCopy />
        <Link className="button button-secondary" href="/book">Return to the book page</Link>
      </section>
    </main>
  );
}
