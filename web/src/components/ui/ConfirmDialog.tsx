/**
 * "Are you sure?" dialog built on the native <dialog> element, which gives
 * us focus trapping, Escape-to-close and a backdrop for free.
 *
 *   <ConfirmDialog open={open} title="Delete chat?" ... onConfirm={...} onCancel={...} />
 */
import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  /** Styles the confirm button red for destructive actions. */
  danger?: boolean;
  busy?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  // Open/close the native dialog when the `open` prop changes.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        // Escape key: tell the parent instead of closing silently.
        e.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(e) => {
        // Click on the backdrop (outside the body) closes.
        if (e.target === ref.current && !busy) onCancel();
      }}
    >
      <div className="dialog-body">
        <h2 id="dialog-title">{title}</h2>
        <div className="muted">{children}</div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={danger ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
