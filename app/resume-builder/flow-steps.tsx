const steps = ["Account", "Experience", "Preview", "Unlock", "Download"];

export function FlowSteps({ current }: { current: number }) {
  return (
    <nav className="rb-steps-bar" aria-label="Resume Builder progress">
      <ol className="rb-steps">
        {steps.map((step, index) => {
          const number = index + 1;
          const state = number < current ? "complete" : number === current ? "current" : "upcoming";
          return (
            <li className={`rb-step rb-step-${state}`} key={step} aria-current={state === "current" ? "step" : undefined}>
              <span aria-hidden="true">{state === "complete" ? "✓" : number}</span>
              <strong>{step}</strong>
              {state === "complete" ? <em className="rb-sr-only"> (completed)</em> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
