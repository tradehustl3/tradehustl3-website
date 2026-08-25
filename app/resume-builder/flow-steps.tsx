const steps = ["Account", "Experience", "Payment", "Build + review"];

export function FlowSteps({ current }: { current: number }) {
  return (
    <ol className="rb-steps" aria-label="Resume Builder progress">
      {steps.map((step, index) => {
        const number = index + 1;
        const state = number < current ? "complete" : number === current ? "current" : "upcoming";
        return (
          <li className={`rb-step rb-step-${state}`} key={step} aria-current={state === "current" ? "step" : undefined}>
            <span>{state === "complete" ? "✓" : String(number).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </li>
        );
      })}
    </ol>
  );
}
