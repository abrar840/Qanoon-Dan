/**
 * The answer half of an exchange. Three looks:
 *   normal  -> white card, answer text, sources (used in the answer, then "also searched"), actions
 *   refused -> amber card, "No reliable information" label, no sources
 *   crisis  -> red card; the backend's answer starts with the helplines
 * Plus loading and error states while the request is in flight / failed.
 */
import type { AskResponse } from '../../api';
import { useToast } from '../../state/ToastContext';
import { copyText, shareText } from '../../utils/clipboard';
import { answerToText } from '../../utils/format';
import { AlertIcon, CopyIcon, InfoIcon, RetryIcon, ShareIcon } from '../ui/Icons';
import { AnswerText, citedSectionKeys, sectionKey } from './AnswerText';
import { SourceCard } from './SourceCard';

export interface ChatItem {
  /** Local id for React keys and DOM ids. */
  id: string;
  question: string;
  status: 'loading' | 'done' | 'error';
  response?: AskResponse;
  error?: string;
}

interface Props {
  item: ChatItem;
  showSources: boolean;
  onRetry(item: ChatItem): void;
}

export function AnswerCard({ item, showSources, onRetry }: Props) {
  const toast = useToast();

  if (item.status === 'loading') {
    return (
      <div className="answer answer-loading" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <span>Reading the Penal Code…</span>
      </div>
    );
  }

  if (item.status === 'error' || !item.response) {
    return (
      <div className="answer answer-error" role="alert">
        <div className="answer-label">
          <AlertIcon width={14} height={14} /> Could not answer
        </div>
        <p>{item.error ?? 'Something went wrong.'}</p>
        <div className="row">
          <button type="button" className="btn btn-sm" onClick={() => onRetry(item)}>
            <RetryIcon width={16} height={16} /> Try again
          </button>
        </div>
      </div>
    );
  }

  const res = item.response;
  const kind = res.crisis ? 'crisis' : res.refused ? 'refused' : 'normal';

  // sources come from the search; the answer text says which ones the model actually used
  const cited = citedSectionKeys(res.answer);
  const used = res.sources.filter((s) => cited.has(sectionKey(s.section)));
  const searched = res.sources.filter((s) => !cited.has(sectionKey(s.section)));
  const className = kind === 'crisis' ? 'answer answer-crisis' : kind === 'refused' ? 'answer answer-refused' : 'answer';

  async function handleCopy() {
    const ok = await copyText(answerToText(item.question, res));
    toast.show(ok ? 'Answer copied.' : 'Could not copy.', ok ? 'success' : 'error');
  }

  async function handleShare() {
    const result = await shareText('QanoonDaan answer', answerToText(item.question, res));
    if (result === 'copied') toast.show('Sharing is not available here, so the answer was copied.', 'info');
    if (result === 'failed') toast.show('Could not share.', 'error');
  }

  return (
    <article className={className} aria-label={kind === 'crisis' ? 'Crisis answer' : kind === 'refused' ? 'Refused answer' : 'Answer'}>
      {/* Helplines are NOT drawn here. The backend puts its verified numbers
          at the top of `answer`, and AnswerText shows them below. */}
      {kind === 'crisis' && (
        <div className="answer-label">
          <AlertIcon width={14} height={14} /> You may be in danger
        </div>
      )}

      {kind === 'refused' && (
        <div className="answer-label">
          <InfoIcon width={14} height={14} /> No reliable information
        </div>
      )}

      <AnswerText text={res.answer} itemId={item.id} />

      {showSources && res.sources.length > 0 && (
        <section className="sources" aria-label="Sources">
          {used.length > 0 ? (
            <>
              <div className="sources-title">Used in this answer</div>
              <ul className="source-list">
                {used.map((s) => (
                  <SourceCard key={s.section} source={s} itemId={item.id} />
                ))}
              </ul>
              {searched.length > 0 && (
                <details className="sources-more">
                  <summary>
                    Also searched ({searched.length}): {searched.map((s) => s.section).join(', ')}
                  </summary>
                  <ul className="source-list">
                    {searched.map((s) => (
                      <SourceCard key={s.section} source={s} itemId={item.id} />
                    ))}
                  </ul>
                </details>
              )}
            </>
          ) : (
            // the answer names no section: show everything, still collapsed, so nothing is hidden
            <>
              <div className="sources-title">Sources</div>
              <ul className="source-list">
                {res.sources.map((s) => (
                  <SourceCard key={s.section} source={s} itemId={item.id} />
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <div className="answer-foot">
        <span className="answer-disclaimer">{res.disclaimer}</span>
        <div className="answer-actions">
          <button type="button" className="icon-btn" aria-label="Copy answer" onClick={handleCopy}>
            <CopyIcon />
          </button>
          <button type="button" className="icon-btn" aria-label="Share answer" onClick={handleShare}>
            <ShareIcon />
          </button>
        </div>
      </div>
    </article>
  );
}
