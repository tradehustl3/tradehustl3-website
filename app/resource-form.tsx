'use client';

import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { createFormStartTracker, createMetaLeadTracker, type MetaLeadContentName } from './meta-pixel';
import { submitSignup } from './signup-request';
import { ConversionCta } from './conversion-cta';
import { BOOK_SAMPLE_OPEN_LABEL } from './book/sample-links';

type ResourceFormProps = {
  resourceName: string;
  buttonLabel: string;
  ctaId?: string;
  ctaLocation?: string;
  metaLeadContentName?: MetaLeadContentName;
  signupInterest?: string;
  successLinkLabel?: string;
  conversion?: boolean;
  marketingConsent?: boolean;
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
  ctaId,
  ctaLocation,
  metaLeadContentName,
  signupInterest,
  successLinkLabel,
  conversion = false,
  marketingConsent,
}: ResourceFormProps) {
  const id = useId();
  const isSubmitting = useRef(false);
  const successStatus = useRef<HTMLParagraphElement>(null);
  const restoreFocus = useRef(false);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [trackMetaLead] = useState(() => (
    metaLeadContentName ? createMetaLeadTracker(metaLeadContentName, ctaLocation) : undefined
  ));
  const [trackFormStart] = useState(() => (
    metaLeadContentName ? createFormStartTracker(metaLeadContentName, ctaLocation) : undefined
  ));
  const isBookSample = metaLeadContentName === 'book_sample';
  const resolvedSignupInterest = isBookSample
    ? BOOK_SAMPLE_INTEREST
    : (signupInterest || TOP_TRADES_INTEREST);
  const openLabel = successLinkLabel ?? (isBookSample ? BOOK_SAMPLE_OPEN_LABEL : 'Open your free guide');
  const resourceLink = {
    href: resourceUrl,
    target: isBookSample ? undefined : '_blank',
    rel: isBookSample ? undefined : 'noreferrer',
    'data-analytics-event': 'resource_open',
    'data-location': ctaLocation,
    'data-item': metaLeadContentName,
    'data-destination': isBookSample ? 'resource_reader' : 'resource_pdf',
  };

  useEffect(() => {
    if (status === 'success' && restoreFocus.current) successStatus.current?.focus();
  }, [status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting.current || status === 'success') return;
    isSubmitting.current = true;

    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') ?? '').trim();

    setStatus('submitting');
    setMessage(`Submitting your request for ${resourceName}…`);
    setResourceUrl('');

    try {
      const result = await submitSignup(
        { email, interest: resolvedSignupInterest, ...(marketingConsent !== undefined ? { marketingConsent } : {}), ...collectUtm() },
        {
          trackMetaLead,
          fallbackErrorMessage: 'We could not save your request. Please try again.',
        },
      );
      restoreFocus.current = form.contains(document.activeElement);
      setStatus('success');
      setMessage(result.message || "Your request was received.");
      setResourceUrl(result.sampleUrl || '');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'We could not save your request. Please try again.');
    } finally {
      isSubmitting.current = false;
    }
  }

  return (
    <form className="resource-form" method="post" action="/api/subscribe" onSubmit={handleSubmit} onFocusCapture={() => trackFormStart?.()} aria-describedby={`${id}-status`}>
      {status !== "success" && (
        <>
          <div className="field-row">
            <label htmlFor={`${id}-email`}>Email address</label>
            <input id={`${id}-email`} name="email" type="email" autoComplete="email" required />
          </div>
          {conversion ? (
            <ConversionCta variant="resource" type="submit" loading={status === 'submitting'}
              data-primary-cta="true" data-cta={ctaId} data-item={metaLeadContentName}
              data-cta-location={ctaLocation} data-destination="/api/subscribe">
              {status === 'submitting' ? 'Sending your request…' : buttonLabel}
            </ConversionCta>
          ) : (
          <button
            className="button form-button"
            type="submit"
            disabled={status === 'submitting'}
            data-cta={ctaId}
            data-item={metaLeadContentName}
            data-cta-location={ctaLocation}
            data-destination="/api/subscribe"
          >
            {status === 'submitting' ? 'Sending…' : buttonLabel} <span aria-hidden="true">↗</span>
          </button>
          )}
        </>
      )}
      <p
        className={`form-status${status === 'error' ? ' is-error' : ''}${status === 'success' ? ' is-success' : ''}`}
        id={`${id}-status`}
        ref={successStatus}
        tabIndex={status === 'success' ? -1 : undefined}
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
      {status === 'success' && resourceUrl ? (
        <div className="resource-access">
          {conversion ? (
            <ConversionCta {...resourceLink}>{openLabel}</ConversionCta>
          ) : (
            <a className="resource-guide-link" {...resourceLink}>
              {openLabel} <span aria-hidden="true">{isBookSample ? '→' : '↗'}</span>
            </a>
          )}
        </div>
      ) : null}
    </form>
  );
}
