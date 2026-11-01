/**
 * Renders the answer string. The backend's answer is Markdown (bold, bullet lists, italics,
 * sometimes tables), so it is rendered with react-markdown + remark-gfm (tables).
 * Raw HTML in the answer is NOT rendered (no rehype-raw), so an answer cannot inject markup.
 *
 * "[Section 302]" becomes a clickable chip that scrolls to that source card:
 * before rendering, each citation is turned into a markdown link "#cite-302", and the custom
 * `a` renderer below draws those links as the chip button.
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// "[Section 302]" or "[Section 182, Section 211]"
const CITE_RE = /\[Section\s+([^\]]+)\]/g;
const CITE_PREFIX = '#cite-';

/** "489-F" / " 489 f " -> "489F", used to build matching element ids. */
export function sectionKey(section: string): string {
  return section.replace(/[^0-9a-z]/gi, '').toUpperCase();
}

// any "Section 302" / "Section 337-A" in the answer, with or without brackets
const MENTION_RE = /Section\s+(\d{1,3}(?:-?[A-Z]{1,2})?)/gi;

/** Keys of every section the answer text mentions, e.g. {"302", "337A"}. */
export function citedSectionKeys(answer: string): Set<string> {
  const keys = new Set<string>();
  for (const match of answer.matchAll(MENTION_RE)) {
    keys.add(sectionKey(match[1]));
  }
  return keys;
}

/** "[Section 182, Section 211]" -> "[Section 182](#cite-182), [Section 211](#cite-211)" */
function citationsToLinks(text: string): string {
  return text.replace(CITE_RE, (_match, inside: string) => {
    const sections = inside.split(/,\s*(?:Section\s+)?/).map((s) => s.trim()).filter(Boolean);
    return sections.map((s) => `[Section ${s}](${CITE_PREFIX}${encodeURIComponent(s)})`).join(', ');
  });
}

export function AnswerText({ text, itemId }: { text: string; itemId: string }) {
  function jumpTo(section: string) {
    // "337A(i)" cites a sub-clause; its source card is "337A"
    const base = section.split('(')[0];
    const el =
      document.getElementById(`${itemId}-src-${sectionKey(section)}`) ??
      document.getElementById(`${itemId}-src-${sectionKey(base)}`);
    if (!el) return;
    // sources are collapsible: open the row (and the "Also searched" group it may sit in)
    el.closest('details')?.setAttribute('open', '');
    el.querySelector('details')?.setAttribute('open', '');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('highlight');
    window.setTimeout(() => el.classList.remove('highlight'), 1600);
  }

  return (
    <div className="answer-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            if (href?.startsWith(CITE_PREFIX)) {
              const section = decodeURIComponent(href.slice(CITE_PREFIX.length));
              return (
                <button
                  type="button"
                  className="cite"
                  onClick={() => jumpTo(section)}
                  aria-label={`Go to Section ${section} source`}
                >
                  Section {section}
                </button>
              );
            }
            // any other link opens in a new tab, without giving that page access to this one
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          // wide tables scroll sideways inside the card instead of stretching the page on a phone
          table({ children }) {
            return (
              <div className="answer-table">
                <table>{children}</table>
              </div>
            );
          },
        }}
      >
        {citationsToLinks(text)}
      </ReactMarkdown>
    </div>
  );
}
