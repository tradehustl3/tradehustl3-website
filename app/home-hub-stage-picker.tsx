"use client";

import Link from "next/link";
import { useState } from "react";
import type { HubStage, HubStageIcon } from "./home-hub-stages-data";
import styles from "./home-hub-stages.module.css";

type Organization = { lead: string; title: string; href: string };

/** Line icons drawn in CSS currentColor (gold). Generic shapes, no brand marks. */
function StageIcon({ name }: { name: HubStageIcon }) {
  const common = {
    width: 34,
    height: 34,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };
  switch (name) {
    case "student":
      return (
        <svg {...common}>
          <path d="M2 9l10-5 10 5-10 5z" />
          <path d="M6 11v5c0 1.6 2.7 3 6 3s6-1.4 6-3v-5" />
          <path d="M22 9v6" />
        </svg>
      );
    case "new":
      return (
        <svg {...common}>
          <path d="M3 18h18" />
          <path d="M5 18v-3a7 7 0 0 1 14 0v3" />
          <path d="M10 9V5.5h4V9" />
        </svg>
      );
    case "working":
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />
        </svg>
      );
    case "leading":
      return (
        <svg {...common}>
          <circle cx="12" cy="7.5" r="3" />
          <path d="M6.5 20v-1a5.5 5.5 0 0 1 11 0v1" />
          <circle cx="4.8" cy="10" r="2" />
          <circle cx="19.2" cy="10" r="2" />
          <path d="M1.8 19a3.8 3.8 0 0 1 3-3.6M22.2 19a3.8 3.8 0 0 0-3-3.6" />
        </svg>
      );
    case "changer":
      return (
        <svg {...common}>
          <path d="M3 19h5a4 4 0 0 0 4-4V9a4 4 0 0 1 4-4h4" />
          <path d="M17 2l3 3-3 3" />
          <circle cx="3.5" cy="19" r="1.2" />
        </svg>
      );
  }
}

export function HubStagePicker({ stages, organization }: { stages: readonly HubStage[]; organization: Organization }) {
  const [stageId, setStageId] = useState(stages[0].id);
  const stage = stages.find((candidate) => candidate.id === stageId) ?? stages[0];

  return (
    <section className={styles.band} id="start-here" aria-labelledby="stage-title">
      <div className={styles.inner}>
        <div className={styles.bar}>
          <div className={styles.prompt}>
            <h2 id="stage-title" className={styles.label}>Where are you in your trade journey?</h2>
            <p>Pick where you are today to see your next step.</p>
          </div>
          <div className={styles.tiles} role="group" aria-label="Choose where you are">
            {stages.map((option) => (
              <button
                key={option.id}
                type="button"
                className={styles.tile}
                aria-pressed={option.id === stage.id}
                aria-controls="stage-panel"
                onClick={() => setStageId(option.id)}
                data-analytics-event="select_content"
                data-location="hub_stage_picker"
                data-item={option.id}
              >
                <span className={styles.icon}><StageIcon name={option.icon} /></span>
                <strong>{option.label}</strong>
                <span className={styles.sublabel}>{option.sublabel}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.panel} id="stage-panel" aria-live="polite">
          <div className={styles.panelCopy}>
            <h3>{stage.headline}</h3>
            <p>{stage.copy}</p>
          </div>
          <ol className={styles.steps}>
            {stage.steps.map((step) => (
              <li key={step.title}>
                <Link
                  href={step.href}
                  onClick={step.href === "#trade-training" ? () => {
                    const training = document.getElementById("trade-training");
                    if (training instanceof HTMLDetailsElement) training.open = true;
                  } : undefined}
                  data-analytics-event="select_content"
                  data-location={`hub_stage_${stage.id}`}
                  data-destination={step.href}
                  data-item={step.title}
                >
                  <strong>{step.title}</strong>
                  <small>{step.sub}</small>
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <p className={styles.organization}>
          {organization.lead}{" "}
          <Link
            href={organization.href}
            data-analytics-event="cta_click"
            data-location="hub_stage_organizations"
            data-destination={organization.href}
            data-item="group_access"
          >
            {organization.title} <span aria-hidden="true">→</span>
          </Link>
        </p>
      </div>
    </section>
  );
}
