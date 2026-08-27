'use client';

import { FormEvent, useId, useState } from 'react';

type ResourceFormProps = {
  resourceName: string;
  buttonLabel: string;
  includeInterest?: boolean;
};

export function ResourceForm({ resourceName, buttonLabel, includeInterest = false }: ResourceFormProps) {
  const id = useId();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    window.setTimeout(() => setStatus('error'), 450);
  }

  return (
    <form className="resource-form" onSubmit={handleSubmit} aria-describedby={`${id}-status`}>
      <div className="field-row">
        <label htmlFor={`${id}-name`}>First name</label>
        <input id={`${id}-name`} name="firstName" autoComplete="given-name" required />
      </div>
      <div className="field-row">
        <label htmlFor={`${id}-email`}>Email address</label>
        <input id={`${id}-email`} name="email" type="email" autoComplete="email" required />
      </div>
      {includeInterest ? (
        <div className="field-row">
          <label htmlFor={`${id}-interest`}>Career interest <span>(optional)</span></label>
          <select id={`${id}-interest`} name="careerInterest" defaultValue="">
            <option value="">Choose a path</option>
            <option>HVAC</option><option>Electrical</option><option>Plumbing</option>
            <option>Welding</option><option>Facilities maintenance</option><option>Still exploring</option>
          </select>
        </div>
      ) : null}
      <button className="button form-button" type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Checking connection…' : buttonLabel} <span aria-hidden="true">↗</span>
      </button>
      <p className={`form-status ${status === 'error' ? 'is-error' : ''}`} id={`${id}-status`} role="status" aria-live="polite">
        {status === 'error' ? `${resourceName} signup is ready for UI review, but its production subscriber endpoint and download link were not supplied.` : 'No spam. Practical skilled-trades guidance only.'}
      </p>
    </form>
  );
}

