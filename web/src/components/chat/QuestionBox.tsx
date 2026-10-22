/**
 * The question box at the bottom of the chat.
 *  - Enter sends, Shift+Enter adds a new line (phones use the send button).
 *  - Grows with the text up to 40% of the screen.
 *  - Shows a character counter near the 1000 limit.
 *  - Always shows the disclaimer and scope lines underneath.
 */
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { COPY } from '../../config/examples';
import { SendIcon } from '../ui/Icons';

const MIN = 3;
const MAX = 1000;

interface Props {
  busy: boolean;
  /** Text to put in the box from outside (an example question was tapped). */
  prefill?: { text: string; n: number };
  onSend(question: string): void;
}

export function QuestionBox({ busy, prefill, onSend }: Props) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  // When an example question is tapped, fill the box and focus it.
  useEffect(() => {
    if (prefill) {
      setValue(prefill.text);
      ref.current?.focus();
    }
  }, [prefill]);

  // Auto-grow the textarea to fit its content.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const trimmed = value.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN;
  const tooLong = value.length > MAX;
  const canSend = !busy && trimmed.length >= MIN && !tooLong;

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!canSend) return;
    onSend(trimmed);
    setValue('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="composer-wrap">
      <form className="composer" onSubmit={submit}>
        <div className="composer-box">
          <label htmlFor="question" className="sr-only">
            Your legal question
          </label>
          <textarea
            id="question"
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about the Pakistan Penal Code…"
            disabled={busy}
            aria-describedby="composer-hint"
            autoComplete="off"
          />
          <button type="submit" className="send-btn" disabled={!canSend} aria-label="Send question">
            <SendIcon />
          </button>
        </div>
        <div className="composer-meta">
          <span id="composer-hint">
            {tooShort ? `At least ${MIN} characters.` : 'Enter to send, Shift+Enter for a new line.'}
          </span>
          {(value.length > MAX - 100 || tooLong) && (
            <span className={tooLong ? 'over' : undefined} aria-live="polite">
              {value.length}/{MAX}
            </span>
          )}
        </div>
      </form>
      <p className="legal-footer">
        {COPY.disclaimer} {COPY.scope}
      </p>
    </div>
  );
}
