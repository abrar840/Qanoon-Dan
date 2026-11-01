import type { AskResponse } from '../api';

/** Plain-text version of an answer for Copy / Share. */
export function answerToText(question: string, res: AskResponse): string {
  const lines = [`Q: ${question}`, '', res.answer];
  if (res.sources.length) {
    lines.push('', 'Sources:');
    for (const s of res.sources) lines.push(`- Section ${s.section}, ${s.law}`);
  }
  lines.push('', res.disclaimer, 'Asked on QanoonDaan.');
  return lines.join('\n');
}
