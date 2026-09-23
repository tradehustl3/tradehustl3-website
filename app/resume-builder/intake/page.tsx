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
        <div>
          <p className="rb-kicker">/ BUILD</p>
          <h1>UPLOAD IT OR START FRESH.<br /><span>WE HANDLE THE REST.</span></h1>
        </div>
        <p>
          Already have a resume? Upload it once and HUSTL3 BOT pulls the facts from it, flags only what needs your
          attention, then sends you to your resume-system choices. Starting from scratch still uses the guided trade intake.
          Your work autosaves to your verified account.
        </p>
      </section>
      <ResumeWizard />
    </main>
  );
}
