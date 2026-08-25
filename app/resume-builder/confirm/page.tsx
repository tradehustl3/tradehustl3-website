import type { Metadata } from "next";
import { FlowSteps } from "../flow-steps";
import { ResumeBuilderHeader } from "../resume-builder-header";
import { ConfirmMagicLink } from "./confirm-magic-link";

export const metadata: Metadata = {
  title: "Confirm your account",
  robots: { index: false, follow: false },
};

export default function ConfirmPage() {
  return (
    <main className="rb-page rb-flow-page">
      <ResumeBuilderHeader />
      <FlowSteps current={1} />
      <section className="rb-centered-stage">
        <ConfirmMagicLink />
      </section>
    </main>
  );
}
