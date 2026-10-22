/**
 * The answer half of an exchange. Three looks:
 *   normal  -> white card, answer text, source cards, actions
 *   refused -> amber card, "No reliable information" label, no sources
 *   crisis  -> red card, helplines FIRST, then any legal answer and sources
 * Plus loading and error states while the request is in flight / failed.
 */
import type { AskResponse, FeedbackRating } from '../../api';
import { useToast } from '../../state/ToastContext';
import { copyText, shareText } from '../../utils/clipboard';
import { answerToText } from '../../utils/format';
import { AlertIcon, CopyIcon, InfoIcon, RetryIcon, ShareIcon } from '../ui/Icons';
import { AnswerText } from './AnswerText';
import { CrisisHelplines } from './CrisisHelplines';
import { FeedbackButtons } from './FeedbackButtons';
import { SourceCard } from './SourceCard';

export interface ChatItem {
  /** Local id for React keys and DOM ids (not the server message id). */
  id: string;
  question: string;
  status: 'loading' | 'done' | 'error';
  response?: AskResponse;
  error?: string;
  /** Server id of the saved message, when logged in. Used for feedback. */
  messageId: string | null;
  feedback: FeedbackRating | null;
}

interface Props {
  item: ChatItem;
  showSources: boolean;
  onRetry(item: ChatItem): void;
  onFeedback(item: ChatItem, rating: FeedbackRating, comment?: string): Promise<void>;
}

export function AnswerCard({ item, showSources, onRetry, onFeedback }: Props) {
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
      {kind === 'crisis' && (
        <>
          <div className="answer-label">
            <AlertIcon width={14} height={14} /> You may be in danger
          </div>
          <CrisisHelplines />
        </>
      )}

      {kind === 'refused' && (
        <div className="answer-label">
          <InfoIcon width={14} height={14} /> No reliable information
        </div>
      )}

      <AnswerText text={res.answer} itemId={item.id} />

      {showSources && res.sources.length > 0 && (
        <section className="sources" aria-label="Cited sections">
          <div className="sources-title">Cited sections</div>
          <ul className="source-list">
            {res.sources.map((s) => (
              <SourceCard key={s.section} source={s} itemId={item.id} />
            ))}
          </ul>
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
          <FeedbackButtons rating={item.feedback} onRate={(r, c) => onFeedback(item, r, c)} />
        </div>
      </div>
    </article>
  );
}
