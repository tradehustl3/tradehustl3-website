import type { Metadata } from 'next';
import { AccountStart } from '../account-start';
import { FlowSteps } from '../flow-steps';
import { ResumeBuilderHeader } from '../resume-builder-header';
import { ResumeBuilderStartAnalytics, ResumeEmailPageAnalytics } from '../funnel-analytics';

export const metadata: Metadata = {
  title: 'Start your free resume preview',
  robots: { index: false, follow: false },
};

/** Dedicated account entry; the same verified-account process used by campaigns. */
export default function ResumeStartPage() {
  return (
    <main className="rb-page rb-flow-page">
      <ResumeBuilderStartAnalytics />
      <ResumeEmailPageAnalytics />
      <ResumeBuilderHeader />
      <FlowSteps current={1} />
      <section className="rb-centered-stage" aria-labelledby="account-entry-title">
        <div className="rb-confirm-card">
          <h1 id="account-entry-title">Start your free resume preview</h1>
          <p>Verify your email to save your work and continue to your trade experience. No payment is required to start.</p>
          <AccountStart />
        </div>
      </section>
    </main>
  );
}
