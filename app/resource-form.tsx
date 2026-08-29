'use client';

import { FormEvent, useId, useRef, useState } from 'react';
import { createMetaLeadTracker, type MetaLeadContentName } from './meta-pixel';
import { submitSignup } from './signup-request';

type ResourceFormProps = {
  resourceName: string;
  buttonLabel: string;
  includeInterest?: boolean;
  includeFirstName?: boolean;
  ctaId?: string;
  ctaLocation?: string;
  metaLeadContentName?: MetaLeadContentName;
  signupInterest?: string;
  successLinkLabel?: string;
};

const TOP_TRADES_INTEREST = 'Top 10 Trades';
const BOOK_SAMPLE_INTEREST = 'Book 7-Page Sample';
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

export function ResourceForm({
  resourceName,
  buttonLabel,
  includeInterest = false,
  includeFirstName = true,
  ctaId,
  ctaLocation,
  metaLeadContentName,
  signupInterest,
  successLinkLabel = 'Open your free guide',
}: ResourceFormProps) {
  const id = useId();
  const isSubmitting = useRef(false);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('No spam. Practical skilled-trades guidance only.');
  const [guideUrl, setGuideUrl] = useState('');
  const [trackMetaLead] = useState(() => (
    metaLeadContentName ? createMetaLeadTracker(metaLeadContentName) : undefined
  ));
  const resolvedSignupInterest = signupInterest
    || (metaLeadContentName === 'book_sample' ? BOOK_SAMPLE_INTEREST : TOP_TRADES_INTEREST);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();

    setStatus('submitting');
    setMessage(`Sending your ${resourceName}…`);
    setGuideUrl('');

    try {
      const result = await submitSignup(
        { email, interest: resolvedSignupInterest, ...collectUtm() },
        {
          trackMetaLead,
          fallbackErrorMessage: 'We could not send the guide. Please try again.',
        },
      );
      setStatus('success');
      setMessage(result.message || "You're on the list. Check your inbox for the free resource.");
      setGuideUrl(result.sampleUrl || '');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'We could not send the guide. Please try again.');
    } finally {
      isSubmitting.current = false;
    }
  }

  return (
    <form className="resource-form" onSubmit={handleSubmit} aria-describedby={`${id}-status`}>
      {includeFirstName ? (
        <div className="field-row">
          <label htmlFor={`${id}-name`}>First name</label>
          <input id={`${id}-name`} name="firstName" autoComplete="given-name" />
        </div>
      ) : null}
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
      <button
        className="button form-button"
        type="submit"
        disabled={status === 'submitting'}
        data-cta={ctaId}
        data-cta-location={ctaLocation}
      >
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
          {successLinkLabel} <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </form>
  );
}
