import type { AskResponse } from '../api';

/** "Today", "Yesterday", or "12 Oct 2026" for sidebar grouping. */
export function friendlyDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(d, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "14 Oct 2026, 3:05 pm" */
export function fullDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Initials for the avatar fallback: "Atif Javed" -> "AJ". */
export function initials(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '');
  return letters.join('') || '?';
}

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
