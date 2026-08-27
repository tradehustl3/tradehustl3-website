import type { Metadata } from "next";
import { AccountStart } from "./account-start";
import { FlowSteps } from "./flow-steps";
import { ResumeBuilderHeader } from "./resume-builder-header";

export const metadata: Metadata = {
  title: "Skilled Trades Resume Builder",
  alternates: { canonical: "/resume-builder" },
};

const tradeTracks = [
  "HVAC & Refrigeration",
  "Electrical",
  "Plumbing",
  "Construction & Carpentry",
  "Facilities Maintenance",
  "Welding & Fabrication",
  "General Labor / Trade Helper",
];

export default function ResumeBuilderPage() {
  return (
    <main className="rb-page">
      <ResumeBuilderHeader />
      <FlowSteps current={1} />

      <section className="rb-entry">
        <div className="rb-entry-copy">
          <p className="rb-kicker">/ BUILT FOR SKILLED WORK</p>
          <h1>TURN YOUR FIELD EXPERIENCE INTO A <span>JOB-READY RESUME.</span></h1>
          <p className="rb-lead">
            Give us the facts. TRADE HUSTL3 turns your tools, tickets, field hours, and real responsibilities into one clear, ATS-friendly resume.
          </p>
          <div className="rb-proof-row" aria-label="Resume Builder package details">
            <div><strong>$9.99</strong><span>One completed resume</span></div>
            <div><strong>4</strong><span>Total AI runs</span></div>
            <div><strong>2</strong><span>Clean file formats</span></div>
          </div>
        </div>

        <aside className="rb-entry-panel" aria-labelledby="account-title">
          <p className="rb-panel-index">STEP 01 / 04</p>
          <h2 id="account-title">START YOUR RESUME</h2>
          <p>Create your verified account first. Your intake is saved to your account—not just this device.</p>
          <AccountStart />
        </aside>
      </section>

      <section className="rb-package" aria-labelledby="package-title">
        <div>
          <p className="rb-kicker">/ ONE STRAIGHTFORWARD PACKAGE</p>
          <h2 id="package-title">PREVIEW FIRST. PAY ONCE.</h2>
        </div>
        <div className="rb-package-card">
          <div className="rb-package-price"><span>$</span><strong>9</strong><sup>99</sup></div>
          <p>Your first resume is built before checkout. Review the protected logo-watermarked preview, then pay once to remove the watermark.</p>
          <ul>
            <li><span>✓</span> Initial tailored preview before payment</li>
            <li><span>✓</span> TRADE HUSTL3 LLC logo watermark</li>
            <li><span>✓</span> Up to 3 AI corrections within 7 days</li>
            <li><span>✓</span> Clean PDF + editable DOCX downloads</li>
          </ul>
        </div>
      </section>

      <section className="rb-tracks" aria-labelledby="tracks-title">
        <div>
          <p className="rb-kicker">/ SEVEN TRADE TRACKS</p>
          <h2 id="tracks-title">YOUR WORK HAS A LANGUAGE. WE KNOW IT.</h2>
        </div>
        <ol>
          {tradeTracks.map((track, index) => <li key={track}><span>{String(index + 1).padStart(2, "0")}</span>{track}</li>)}
        </ol>
      </section>

      <footer className="rb-footer">
        <strong>TRADE HUSTL<span>3</span></strong>
        <p>Built by Hustle, Backed by Trades.</p>
        <div className="rb-footer-links"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/resume-builder/refund-policy">Refunds</a><a href="/resume-builder/ai-disclosure">AI disclosure</a><a href="/data-deletion">Data requests</a><a href="/contact">Support</a></div>
        <small>© 2026 TRADE HUSTL3. All grit reserved.</small>
      </footer>
    </main>
  );
}
