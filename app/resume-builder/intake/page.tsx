import type { Metadata } from "next";
import { FlowSteps } from "../flow-steps";
import { ResumeBuilderHeader } from "../resume-builder-header";
import { ResumeWizard } from "./wizard";

export const metadata: Metadata = {
  title: "Guided intake",
  robots: { index: false, follow: false },
};

export default function IntakePage() {
  return (
    <main className="rb-page rb-intake-page rb-wiz-page">
      <ResumeBuilderHeader />
      <FlowSteps current={2} />
      <section className="rb-flow-intro rb-wiz-intro">
        <div>
          <p className="rb-kicker">/ BUILD</p>
          <h1>SEVEN QUICK STEPS.<br /><span>ONE TRADE-READY RESUME.</span></h1>
        </div>
        <p>
          One question at a time. Give real tools, systems, responsibilities, and results — HUSTL3 BOT guides each step
          for your trade. Your answers autosave to your verified account, so you can leave and pick up where you stopped.
        </p>
      </section>
      <ResumeWizard />
    </main>
  );
}
