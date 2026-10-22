/**
 * Labelled text input with optional hint and error. Keeps every form in the
 * app accessible the same way: label linked by id, error announced via
 * aria-describedby.
 */
import { useId, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Field({ label, hint, error, id, ...inputProps }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} aria-describedby={describedBy} aria-invalid={error ? true : undefined} {...inputProps} />
      {hint && (
        <span id={hintId} className="hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
