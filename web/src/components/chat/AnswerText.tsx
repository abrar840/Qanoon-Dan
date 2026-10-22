/**
 * Renders the answer string. Two small touches:
 *  1. Blank lines become paragraphs.
 *  2. "[Section 302]" becomes a clickable chip that scrolls to that source card.
 * No markdown library: the backend returns plain text with bracket citations.
 */
import { Fragment } from 'react';

const CITE_RE = /(\[Section\s+[^\]]+\])/g;

/** "489-F" / " 489 f " -> "489F", used to build matching element ids. */
export function sectionKey(section: string): string {
  return section.replace(/[^0-9a-z]/gi, '').toUpperCase();
}

export function AnswerText({ text, itemId }: { text: string; itemId: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());

  function jumpTo(section: string) {
    const el = document.getElementById(`${itemId}-src-${sectionKey(section)}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('highlight');
    window.setTimeout(() => el.classList.remove('highlight'), 1600);
  }

  return (
    <div className="answer-text">
      {paragraphs.map((para, pi) => (
        <p key={pi}>
          {para.split(CITE_RE).map((part, i) => {
            const m = /^\[Section\s+([^\]]+)\]$/.exec(part);
            if (!m) return <Fragment key={i}>{part}</Fragment>;
            const section = m[1].trim();
            return (
              <button
                key={i}
                type="button"
                className="cite"
                onClick={() => jumpTo(section)}
                aria-label={`Go to Section ${section} source`}
              >
                Section {section}
              </button>
            );
          })}
        </p>
      ))}
    </div>
  );
}
