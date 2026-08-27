import type { Metadata } from "next";
import { FlowSteps } from "../flow-steps";
import { ResumeBuilderHeader } from "../resume-builder-header";
import { IntakeForm } from "./intake-form";

export const metadata: Metadata = {
  title: "Experience intake",
  robots: { index: false, follow: false },
};

export default function IntakePage() {
  return (
    <main className="rb-page rb-intake-page">
      <ResumeBuilderHeader />
      <FlowSteps current={2} />
      <section className="rb-flow-intro">
        <div><p className="rb-kicker">/ STEP 02</p><h1>GIVE US THE FACTS.<br /><span>WE’LL SHAPE THE STORY.</span></h1></div>
        <p>Use plain language. Be specific, stay honest, and include real tools, systems, responsibilities, and results. Your intake is saved before your free watermarked preview is built.</p>
      </section>
      <IntakeForm />
    </main>
  );
}
