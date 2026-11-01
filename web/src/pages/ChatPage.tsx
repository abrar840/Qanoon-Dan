/**
 * The main screen ("/").
 *
 * Data flow for one question:
 *   QuestionBox.onSend -> ask() -> api.ask() -> item.status 'done' | 'error'
 *   AnswerCard then draws the item.
 *
 * Questions live only in React state, so they disappear on reload.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, errorMessage } from '../api';
import { useSettings } from '../state/SettingsContext';
import { AnswerCard, type ChatItem } from '../components/chat/AnswerCard';
import { EmptyState } from '../components/chat/EmptyState';
import { QuestionBox } from '../components/chat/QuestionBox';

function localId(): string {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ChatPage() {
  const location = useLocation();
  const { settings } = useSettings();

  const [items, setItems] = useState<ChatItem[]>([]);
  // {text, n}: the counter makes tapping the same example twice work.
  const [prefill, setPrefill] = useState<{ text: string; n: number } | undefined>();

  const abortRef = useRef<AbortController | null>(null);
  const lastExchangeRef = useRef<HTMLDivElement>(null);

  // "New chat" links to "/" again. The URL stays the same but the router
  // gives each click a new location.key, so we clear the screen on that.
  useEffect(() => {
    abortRef.current?.abort();
    setItems([]);
  }, [location.key]);

  // Cancel an in-flight question if the user leaves the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  // When a question is sent, move it to the top of the screen so its answer appears right below it
  // and is read from the start. (Scrolling to the very bottom hid the answer behind the sticky
  // question box, and jumped past long answers to their sources.)
  useEffect(() => {
    lastExchangeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [items.length]);

  const busy = items.some((i) => i.status === 'loading');

  const ask = useCallback(async (question: string, replaceId?: string) => {
    const id = replaceId ?? localId();
    const fresh: ChatItem = { id, question, status: 'loading' };
    setItems((prev) => (replaceId ? prev.map((i) => (i.id === replaceId ? fresh : i)) : [...prev, fresh]));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await api.ask({ question }, { signal: controller.signal });
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'done', response: res } : i)));
    } catch (err) {
      if (controller.signal.aborted) return;
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'error', error: errorMessage(err) } : i)));
    }
  }, []);

  return (
    <div className="chat">
      <div className="chat-scroll">
        {items.length === 0 && (
          <EmptyState onPick={(q) => setPrefill((p) => ({ text: q, n: (p?.n ?? 0) + 1 }))} />
        )}

        {items.map((item, index) => (
          <div key={item.id} className="exchange" ref={index === items.length - 1 ? lastExchangeRef : undefined}>
            <div className="question" aria-label="Your question">
              {item.question}
            </div>
            <AnswerCard item={item} showSources={settings.show_sources} onRetry={(i) => void ask(i.question, i.id)} />
          </div>
        ))}
      </div>

      <QuestionBox busy={busy} prefill={prefill} onSend={(q) => void ask(q)} />
    </div>
  );
}
