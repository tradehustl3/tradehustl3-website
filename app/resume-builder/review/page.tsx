import type { Metadata } from "next";
import { FlowSteps } from "../flow-steps";
import { ResumeBuilderHeader } from "../resume-builder-header";
import { ResumeReview } from "./resume-review";

export const metadata: Metadata = {
  title: "Build and review",
  robots: { index: false, follow: false },
};

export default function ReviewPage() {
  return (
    <main className="rb-page rb-review-page">
      <ResumeBuilderHeader />
      <FlowSteps current={3} />
      <ResumeReview />
    </main>
  );
}
