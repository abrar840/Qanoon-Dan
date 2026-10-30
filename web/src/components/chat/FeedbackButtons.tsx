/**
 * Thumbs up / thumbs down for one answer.
 *  - Up: sent immediately.
 *  - Down: a small optional comment box opens; "Send" or "Skip" both record
 *    the thumbs-down (with or without the comment).
 */
import { useId, useState } from 'react';
import type { FeedbackRating } from '../../api';
import { ThumbDownIcon, ThumbUpIcon } from '../ui/Icons';

interface Props {
  rating: FeedbackRating | null;
  disabled?: boolean;
  onRate(rating: FeedbackRating, comment?: string): Promise<void>;
}

export function FeedbackButtons({ rating, disabled, onRate }: Props) {
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const commentId = useId(); // unique per answer card

  async function send(r: FeedbackRating, c?: string) {
    setSending(true);
    try {
      await onRate(r, c);
    } finally {
      setSending(false);
      setCommentOpen(false);
      setComment('');
    }
  }

  return (
    <>
      <button
        type="button"
        className="icon-btn"
        aria-label="Helpful answer"
        aria-pressed={rating === 'up'}
        disabled={disabled || sending}
        onClick={() => send('up')}
      >
        <ThumbUpIcon />
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label="Not helpful answer"
        aria-pressed={rating === 'down'}
        disabled={disabled || sending}
        onClick={() => setCommentOpen((v) => !v)}
      >
        <ThumbDownIcon />
      </button>

      {commentOpen && (
        <div className="feedback-comment">
          <label htmlFor={commentId} className="small muted">
            What was wrong? (optional)
          </label>
          <textarea
            id={commentId}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            placeholder="e.g. the section quoted does not match my question"
          />
          <div className="row">
            <button type="button" className="btn btn-sm btn-primary" disabled={sending} onClick={() => send('down', comment.trim() || undefined)}>
              Send
            </button>
            <button type="button" className="btn btn-sm" disabled={sending} onClick={() => send('down')}>
              Skip comment
            </button>
            <button type="button" className="btn btn-sm btn-ghost" disabled={sending} onClick={() => setCommentOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
