/** One cited PPC section: number, law name, snippet (expandable). */
import { useState } from 'react';
import type { Source } from '../../api';
import { sectionKey } from './AnswerText';

export function SourceCard({ source, itemId }: { source: Source; itemId: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = source.snippet.length > 180;

  return (
    <li className="source" id={`${itemId}-src-${sectionKey(source.section)}`}>
      <div className="source-head">
        <span className="source-section">Section {source.section}</span>
        <span className="source-law">{source.law}</span>
      </div>
      <p className={long && !expanded ? 'source-snippet clamp' : 'source-snippet'}>{source.snippet}</p>
      {long && (
        <button type="button" className="source-more" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </li>
  );
}
