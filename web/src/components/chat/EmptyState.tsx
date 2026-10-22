/** Shown when a chat has no messages yet: intro + example questions to tap. */
import { COPY, EXAMPLE_QUESTIONS } from '../../config/examples';

export function EmptyState({ onPick }: { onPick(question: string): void }) {
  return (
    <div className="empty">
      <div className="empty-mark" aria-hidden="true">
        Q
      </div>
      <h1>Ask about the Pakistan Penal Code</h1>
      <p>{COPY.tagline}. Every answer cites the section it comes from.</p>
      <div className="examples" role="list" aria-label="Example questions">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button key={q} type="button" className="example-btn" role="listitem" onClick={() => onPick(q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
