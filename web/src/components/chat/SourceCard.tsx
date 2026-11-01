/**
 * One PPC section as a collapsible row: "Section 302 · Punishment of qatl-i-amd".
 * Tap the row to read the snippet. Uses the native <details> element, so it needs no state
 * and works with the keyboard and screen readers.
 */
import type { Source } from '../../api';
import { sectionKey } from './AnswerText';

/** Removes PDF marks from the extracted text: "[53. Punishments.__" -> "53. Punishments." */
function cleanText(text: string): string {
  return text
    .replace(/[[\]]/g, '') // amendment brackets
    .replace(/\s*_{2,}\s*/g, ' ') // "Punishments.__ The" -> "Punishments. The"
    .replace(/\s+/g, ' ')
    .trim();
}

/** "302. Punishment of qatl-i-amd. Whoever ..." -> "Punishment of qatl-i-amd" */
function sectionTitle(snippet: string): string {
  const text = cleanText(snippet).replace(/^\d{1,3}(?:-?[A-Z]{1,2})?\.\s*/, '');
  const end = text.indexOf('.');
  const title = end > 0 ? text.slice(0, end) : text;
  return title.length > 80 ? `${title.slice(0, 80)}…` : title;
}

export function SourceCard({ source, itemId }: { source: Source; itemId: string }) {
  return (
    <li className="source" id={`${itemId}-src-${sectionKey(source.section)}`}>
      <details>
        <summary className="source-head">
          <span className="source-section">Section {source.section}</span>
          <span className="source-title">{sectionTitle(source.snippet)}</span>
        </summary>
        <p className="source-snippet">{cleanText(source.snippet)}…</p>
        <span className="source-law">{source.law}</span>
      </details>
    </li>
  );
}
