"use client";
import { useEffect, useRef, useState } from 'react';
import { FONTS, TEXT_SIZES, SPACINGS, ACCENTS, type ResumeStyle } from '../../../worker/resume-templates';
type Props = { resumeId: string; style: ResumeStyle; disabled: boolean; onSaved: () => Promise<void>; onBusy: (busy: boolean) => void };
export function StyleControls({ resumeId, style, disabled, onSaved, onBusy }: Props) {
  const [draft, setDraft] = useState(style);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function change(key: keyof ResumeStyle, value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next); setMessage(''); onBusy(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void save(next); }, 450);
  }
  async function save(next: ResumeStyle) {
    setSaving(true);
    try {
      const response = await fetch(`/api/resume-builder/resumes/${encodeURIComponent(resumeId)}`, { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ font: next.font, textSize: next.textSize, spacing: next.spacing, accent: next.accent }) });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message ?? 'Could not save design settings.');
      await onSaved(); setMessage('Saved — no correction used.');
    } catch (error) { setDraft(style); setMessage(error instanceof Error ? error.message : 'Could not save settings.'); }
    finally { setSaving(false); onBusy(false); }
  }
  return <fieldset className="rb-style-controls" disabled={disabled || saving}>
    <legend>Customize your document</legend>
    <p>Free — no correction used.</p>
    {([['font', 'Font', FONTS], ['textSize', 'Text size', TEXT_SIZES], ['spacing', 'Spacing', SPACINGS], ['accent', 'Accent color', ACCENTS]] as const).map(([key, label, values]) => <label key={key}>{label}<select value={draft[key]} onChange={event => change(key, event.target.value)}>{values.map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}
    <p role="status">{saving ? 'Updating your documents…' : message}</p>
  </fieldset>;
}
