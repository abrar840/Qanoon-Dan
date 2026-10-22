/**
 * The main screen. Handles two URLs with one component:
 *   /          new chat (guest or logged in)
 *   /c/:id     a saved conversation (logged in only)
 *
 * Data flow for one question:
 *   QuestionBox.onSend -> ask() -> api.ask() -> item.status 'done' | 'error'
 *   If the server returned a conversation_id for a NEW chat, we move the URL
 *   to /c/:id (without refetching) and refresh the sidebar list.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage, type FeedbackRating } from '../api';
import { useAuth } from '../state/AuthContext';
import { useConversations } from '../state/ConversationsContext';
import { useSettings } from '../state/SettingsContext';
import { useToast } from '../state/ToastContext';
import { AnswerCard, type ChatItem } from '../components/chat/AnswerCard';
import { EmptyState } from '../components/chat/EmptyState';
import { QuestionBox } from '../components/chat/QuestionBox';
import { CloseIcon } from '../components/ui/Icons';

const GUEST_BANNER_KEY = 'qd.guestBannerDismissed';

function localId(): string {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ChatPage() {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  const { settings } = useSettings();
  const { refresh: refreshList } = useConversations();

  const [items, setItems] = useState<ChatItem[]>([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);
  // {text, n}: the counter makes tapping the same example twice work.
  const [prefill, setPrefill] = useState<{ text: string; n: number } | undefined>();
  const [bannerDismissed, setBannerDismissed] = useState(() => sessionStorage.getItem(GUEST_BANNER_KEY) === '1');

  // When WE create a conversation we already have its messages, so we skip
  // the fetch that would normally run when the URL changes to /c/:id.
  const skipFetchFor = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // "New chat": clear the screen whenever the URL loses its id. This effect
  // depends ONLY on the id, so an auth or settings change never wipes an
  // in-flight question.
  useEffect(() => {
    if (!conversationId) {
      setItems([]);
      setConvError(null);
    }
  }, [conversationId]);

  // Load a saved conversation when the URL has an id.
  useEffect(() => {
    if (!conversationId) return;
    if (skipFetchFor.current === conversationId) {
      skipFetchFor.current = null;
      return;
    }
    if (authLoading) return;
    if (!user) {
      setConvError('Log in to view saved conversations.');
      return;
    }

    let cancelled = false;
    setLoadingConv(true);
    setConvError(null);
    api
      .getConversation(conversationId)
      .then((conv) => {
        if (cancelled) return;
        setItems(
          conv.messages.map((m) => ({
            id: m.id,
            question: m.question,
            status: 'done',
            response: {
              answer: m.answer,
              sources: m.sources,
              refused: m.refused,
              crisis: m.crisis,
              disclaimer: 'Legal information, not legal advice. Consult a licensed lawyer.',
            },
            messageId: m.id,
            feedback: m.feedback,
          })),
        );
      })
      .catch((err) => {
        if (!cancelled) setConvError(errorMessage(err, 'Could not load this conversation.'));
      })
      .finally(() => {
        if (!cancelled) setLoadingConv(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, user, authLoading]);

  // Cancel an in-flight question if the user leaves the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Keep the newest exchange in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [items.length, items[items.length - 1]?.status]);

  const busy = items.some((i) => i.status === 'loading');

  const ask = useCallback(
    async (question: string, replaceId?: string) => {
      const id = replaceId ?? localId();
      const fresh: ChatItem = { id, question, status: 'loading', messageId: null, feedback: null };
      setItems((prev) => (replaceId ? prev.map((i) => (i.id === replaceId ? fresh : i)) : [...prev, fresh]));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await api.ask(
          {
            question,
            conversation_id: user ? (conversationId ?? null) : undefined,
            answer_length: settings.answer_length,
          },
          { signal: controller.signal },
        );
        setItems((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, status: 'done', response: res, messageId: res.message_id ?? null } : i,
          ),
        );

        if (user && res.conversation_id) {
          if (!conversationId) {
            skipFetchFor.current = res.conversation_id;
            navigate(`/c/${res.conversation_id}`, { replace: true });
          }
          void refreshList();
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: 'error', error: errorMessage(err) } : i)),
        );
      }
    },
    [user, conversationId, settings.answer_length, navigate, refreshList],
  );

  async function handleFeedback(item: ChatItem, rating: FeedbackRating, comment?: string) {
    if (!item.response) return;
    try {
      await api.sendFeedback({
        message_id: item.messageId,
        rating,
        comment,
        question: item.question,
        answer: item.response.answer,
      });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, feedback: rating } : i)));
      toast.show('Thanks for your feedback.', 'success');
    } catch (err) {
      toast.show(errorMessage(err, 'Could not send feedback.'), 'error');
    }
  }

  function dismissBanner() {
    sessionStorage.setItem(GUEST_BANNER_KEY, '1');
    setBannerDismissed(true);
  }

  const showEmpty = items.length === 0 && !loadingConv && !convError;

  return (
    <div className="chat">
      <div className="chat-scroll">
        {!authLoading && !user && !bannerDismissed && (
          <div className="guest-banner">
            <span>
              You are asking as a guest. <Link to="/login">Log in</Link> to save your history.
            </span>
            <button type="button" className="icon-btn" aria-label="Dismiss" onClick={dismissBanner}>
              <CloseIcon width={16} height={16} />
            </button>
          </div>
        )}

        {loadingConv && (
          <div className="answer answer-loading" role="status">
            <span className="spinner" aria-hidden="true" /> Loading conversation…
          </div>
        )}

        {convError && (
          <div className="answer answer-error" role="alert">
            <p>{convError}</p>
            <div className="row">
              {!user ? (
                <Link to="/login" className="btn btn-sm">
                  Log in
                </Link>
              ) : (
                <Link to="/" className="btn btn-sm">
                  Start a new chat
                </Link>
              )}
            </div>
          </div>
        )}

        {showEmpty && <EmptyState onPick={(q) => setPrefill((p) => ({ text: q, n: (p?.n ?? 0) + 1 }))} />}

        {items.map((item) => (
          <div key={item.id} className="exchange">
            <div className="question" aria-label="Your question">
              {item.question}
            </div>
            <AnswerCard
              item={item}
              showSources={settings.show_sources}
              onRetry={(i) => void ask(i.question, i.id)}
              onFeedback={handleFeedback}
            />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Disabled until we know who is logged in, so the first question is saved to the right account. */}
      <QuestionBox busy={busy || loadingConv || authLoading} prefill={prefill} onSend={(q) => void ask(q)} />
    </div>
  );
}
