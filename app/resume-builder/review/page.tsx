import type { Metadata } from "next";
import { FlowSteps } from "../flow-steps";
import { ResumeReviewAnalytics } from "../funnel-analytics";
import { ResumeBuilderHeader } from "../resume-builder-header";
import { ResumePreviewFallback } from "./preview-fallback";
import { ResumeReview } from "./resume-review";

export const metadata: Metadata = {
  title: "Build and review",
  robots: { index: false, follow: false },
};

export default function ReviewPage() {
  return (
    <main className="rb-page rb-review-page">
      <ResumeReviewAnalytics />
      <ResumeBuilderHeader />
      <FlowSteps current={3} />
      <ResumePreviewFallback />
      <ResumeReview />
    </main>
  );
}
