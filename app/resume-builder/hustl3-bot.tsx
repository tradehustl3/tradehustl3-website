"use client";

import Image from "next/image";
import { useId, useState } from "react";
import type { TradeTrack, WizardStepKey } from "./trade-content";
import { TRADE_GUIDANCE } from "./trade-content";

const BASE_TIPS: Partial<Record<WizardStepKey, string[]>> = {
  trade: [
    "Pick the lane that best matches the work you want employers to notice first. We can still include crossover experience.",
  ],
  experience: [
    "Don't inflate anything. Give me the real experience and I'll help position it correctly.",
    "No paid hours yet? Trade school, apprenticeships, certs, side work, military, volunteer work, and tool time all count.",
  ],
  "work-history": [
    "Tell me what you actually touched, fixed, installed, maintained, or led.",
    "Numbers help. If you know how many units, work orders, technicians, properties, PMs, or projects you handled, add them.",
  ],
  "field-value": [
    "Only select or type what you can back up. Nothing is added to your resume unless you put it here.",
    "Not sure what counts? Tools, equipment, systems, certifications, safety training, side work, and apprenticeships all matter.",
  ],
  "target-job": [
    "Paste the posting and TRADE HUSTL3 can prioritize relevant language from your real experience without inventing qualifications.",
    "We match language. We do not manufacture experience.",
  ],
  review: [
    "Check names, dates, certifications, and job titles now. Fixing facts here is free — corrections after payment are limited.",
  ],
  generate: [
    "Your first protected preview is built before checkout. Review it, then decide on the $9.99 unlock.",
  ],
};

function tipsFor(step: WizardStepKey, trade: TradeTrack | ""): string[] {
  const base = BASE_TIPS[step] ?? [];
  if (!trade) return base;
  if (step === "work-history") return [TRADE_GUIDANCE[trade].workHistory, ...base];
  if (step === "field-value") return [TRADE_GUIDANCE[trade].fieldValue, ...base];
  return base;
}

export function Hustl3Bot({
  step,
  trade,
  className = "",
}: {
  step: WizardStepKey;
  trade: TradeTrack | "";
  className?: string;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const tips = tipsFor(step, trade);

  return (
    <aside className={`rb-bot ${className}`.trim()} aria-label="HUSTL3 BOT guidance">
      <button
        type="button"
        className="rb-bot-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="rb-bot-avatar" aria-hidden="true">
          <Image src="/hustl3-bot-branded.png" alt="" width={72} height={72} />
        </span>
        <span className="rb-bot-toggle-text">
          <strong>HUSTL3 BOT</strong>
          <small>{open ? "Hide jobsite tips" : "Jobsite tips for this step"}</small>
        </span>
        <span className="rb-bot-chevron" aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>

      <div id={panelId} className="rb-bot-body" data-open={open}>
        <div className="rb-bot-avatar rb-bot-avatar-lg" aria-hidden="true">
          <Image src="/hustl3-bot-branded.png" alt="" width={128} height={128} priority />
        </div>
        <p className="rb-bot-name">HUSTL3 BOT<span>ON THE JOB</span></p>
        <ul className="rb-bot-tips">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        {trade && (step === "work-history" || step === "field-value") ? (
          <p className="rb-bot-trade">Guidance tuned for <strong>{trade}</strong>.</p>
        ) : null}
      </div>
    </aside>
  );
}
