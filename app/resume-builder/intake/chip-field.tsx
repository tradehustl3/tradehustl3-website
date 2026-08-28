"use client";

import { useId, useState } from "react";

/**
 * Selectable example chips plus free-text entry. Nothing is ever pre-selected —
 * a value is only added to the resume intake if the user picks or types it.
 */
export function ChipField({
  label,
  hint,
  suggestions,
  values,
  onChange,
}: {
  label: string;
  hint?: string;
  suggestions: string[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const selected = new Set(values.map((value) => value.toLowerCase()));

  function toggle(value: string) {
    const key = value.toLowerCase();
    if (selected.has(key)) {
      onChange(values.filter((item) => item.toLowerCase() !== key));
    } else {
      onChange([...values, value]);
    }
  }

  function addDraft() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!selected.has(trimmed.toLowerCase())) onChange([...values, trimmed]);
    setDraft("");
  }

  const custom = values.filter(
    (value) => !suggestions.some((option) => option.toLowerCase() === value.toLowerCase()),
  );

  return (
    <div className="rb-chipfield">
      <label htmlFor={inputId}>{label}</label>
      {hint ? <p className="rb-chipfield-hint">{hint}</p> : null}
      <div className="rb-chips" role="group" aria-label={label}>
        {suggestions.map((option) => {
          const isOn = selected.has(option.toLowerCase());
          return (
            <button
              type="button"
              key={option}
              className={`rb-chip${isOn ? " rb-chip-selected" : ""}`}
              aria-pressed={isOn}
              onClick={() => toggle(option)}
            >
              {option}
            </button>
          );
        })}
        {custom.map((value) => (
          <button
            type="button"
            key={`custom-${value}`}
            className="rb-chip rb-chip-selected rb-chip-custom"
            aria-pressed={true}
            onClick={() => toggle(value)}
          >
            {value}<span aria-hidden="true"> ✕</span>
          </button>
        ))}
      </div>
      <div className="rb-chip-add">
        <input
          id={inputId}
          className="rb-chip-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addDraft();
            }
          }}
          placeholder="Add your own…"
          maxLength={80}
        />
        <button type="button" className="rb-chip-add-btn" onClick={addDraft}>Add</button>
      </div>
    </div>
  );
}
