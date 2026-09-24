import type { Metadata } from "next";
import { FlowSteps } from "../flow-steps";
import { ResumeIntakeAnalytics } from "../funnel-analytics";
import { ResumeBuilderHeader } from "../resume-builder-header";
import { ResumeWizard } from "./wizard";

export const metadata: Metadata = {
  title: "Guided intake",
  robots: { index: false, follow: false },
};

export default function IntakePage() {
  return (
    <main className="rb-page rb-intake-page rb-wiz-page">
      <ResumeIntakeAnalytics />
      <ResumeBuilderHeader />
      <FlowSteps current={2} />
      <section className="rb-flow-intro rb-wiz-intro">
        <h1>Upload your resume once. <span>We handle the rest.</span></h1>
        <p>
          HUSTL3 BOT reads your resume, flags only what needs your attention, and builds a professional,
          ATS-focused version for the trade you want to target. Starting from scratch uses the same guided trade intake.
          Your work autosaves to your verified account.
        </p>
      </section>
      <ResumeWizard />
    </main>
  );
}
