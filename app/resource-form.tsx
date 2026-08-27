'use client';

import { FormEvent, useId, useState } from 'react';

type ResourceFormProps = {
  resourceName: string;
  buttonLabel: string;
  includeInterest?: boolean;
};

// The free "Top 10 Trades for 2026-2027" guide IS the repo's only free PDF:
// worker/assets/trade-hustl3-free-sample.pdf, served at /api/free-sample as
// "TRADE HUSTL3: 10 High-Opportunity Trades — 2026-2027 Edition" (see README
// and worker/index.ts sendSampleDeliveryEmail). The interest value below is
// legacy-named but it is the ONLY /api/subscribe branch that delivers that
// PDF: it stores the D1 subscriber, syncs the Brevo contact, emails the gated
// link, and returns { sampleUrl: "/api/free-sample" }.
const GUIDE_INTEREST = 'The TRADE HUSTL3 Book';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

function collectUtm(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    let value = params.get(key) ?? '';
    try {
      if (value) window.sessionStorage.setItem(key, value);
      else value = window.sessionStorage.getItem(key) ?? '';
    } catch {
      /* sessionStorage unavailable */
    }
    if (value) out[key] = value;
  }
  return out;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function ResourceForm({ resourceName, buttonLabel, includeInterest = false }: ResourceFormProps) {
  const id = useId();
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('No spam. Practical skilled-trades guidance only.');
  const [guideUrl, setGuideUrl] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();

    setStatus('submitting');
    setMessage(`Sending your ${resourceName}…`);
    setGuideUrl('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, interest: GUIDE_INTEREST, ...collectUtm() }),
      });
      const result = (await response.json()) as { message?: string; sampleUrl?: string };
      if (!response.ok) {
        throw new Error(result.message || 'We could not send the guide. Please try again.');
      }
      setStatus('success');
      setMessage(result.message || "You're on the list. Check your inbox for the free guide.");
      setGuideUrl(result.sampleUrl || '');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'We could not send the guide. Please try again.');
    }
  }

  return (
    <form className="resource-form" onSubmit={handleSubmit} aria-describedby={`${id}-status`}>
      <div className="field-row">
        <label htmlFor={`${id}-name`}>First name</label>
        <input id={`${id}-name`} name="firstName" autoComplete="given-name" />
      </div>
      <div className="field-row">
        <label htmlFor={`${id}-email`}>Email address</label>
        <input id={`${id}-email`} name="email" type="email" autoComplete="email" required />
      </div>
      {includeInterest ? (
        <div className="field-row">
          <label htmlFor={`${id}-interest`}>Career interest <span>(optional)</span></label>
          {/* Collected for future segmentation; /api/subscribe does not persist this field yet. */}
          <select id={`${id}-interest`} name="careerInterest" defaultValue="">
            <option value="">Choose a path</option>
            <option>HVAC</option><option>Electrical</option><option>Plumbing</option>
            <option>Welding</option><option>Facilities maintenance</option><option>Still exploring</option>
          </select>
        </div>
      ) : null}
      <button className="button form-button" type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending…' : buttonLabel} <span aria-hidden="true">↗</span>
      </button>
      <p
        className={`form-status${status === 'error' ? ' is-error' : ''}${status === 'success' ? ' is-success' : ''}`}
        id={`${id}-status`}
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
      {status === 'success' && guideUrl ? (
        <a className="resource-guide-link" href={guideUrl} target="_blank" rel="noreferrer">
          Open your free guide <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </form>
  );
}
