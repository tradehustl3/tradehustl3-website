"use client";

import Link from "next/link";
import { useState } from "react";
import { HUB_STAGES } from "./home-hub-stages-data";
import styles from "./home-hub.module.css";

export function HubStages() {
  const [stageId, setStageId] = useState(HUB_STAGES[0].id);
  const stage = HUB_STAGES.find((candidate) => candidate.id === stageId) ?? HUB_STAGES[0];

  return (
    <section className={styles.section} id="start-here" aria-labelledby="stage-title">
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>START WHERE YOU ARE</p>
        <h2 id="stage-title" className={styles.h2}>Where are you in your trade?</h2>
      </div>
      <div className={styles.stagePicker} role="group" aria-label="Choose your stage">
        {HUB_STAGES.map((option) => (
          <button
            key={option.id}
            type="button"
            className={styles.stageChip}
            aria-pressed={option.id === stage.id}
            onClick={() => setStageId(option.id)}
            data-analytics-event="select_content"
            data-location="hub_stage_picker"
            data-item={option.id}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className={styles.stagePanel} aria-live="polite">
        <div className={styles.stageCopy}>
          <h3>{stage.headline}</h3>
          <p>{stage.copy}</p>
        </div>
        <ol className={styles.stageSteps}>
          {stage.steps.map((step, index) => (
            <li key={step.title}>
              <Link
                href={step.href}
                data-analytics-event="select_content"
                data-location={`hub_stage_${stage.id}`}
                data-destination={step.href}
                data-item={step.title}
              >
                <span aria-hidden="true">0{index + 1}</span>
                <strong>{step.title}</strong>
                <small>{step.sub}</small>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
