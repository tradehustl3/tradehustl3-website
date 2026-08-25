import type { Metadata } from "next";
import { FlowSteps } from "../flow-steps";
import { ResumeBuilderHeader } from "../resume-builder-header";
import { PaymentStatus } from "./payment-status";

export const metadata: Metadata = {
  title: "Payment confirmation",
  robots: { index: false, follow: false },
};

export default function PaymentConfirmedPage() {
  return (
    <main className="rb-page rb-flow-page">
      <ResumeBuilderHeader />
      <FlowSteps current={3} />
      <section className="rb-centered-stage"><PaymentStatus /></section>
    </main>
  );
}
