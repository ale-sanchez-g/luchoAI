'use client';

import { useState, useRef, useEffect } from 'react';
import type { Message, PlayerProfile, AIProviderConfig } from '@/types';
import { sendMessage, FREE_LIMIT_MESSAGE } from '@/lib/claude';
import { loadContextBatches } from '@/lib/context';
import type { ContextMessage } from '@/lib/context';
import { MAX_MESSAGE_LENGTH } from '@/lib/guardrails';
import ErrorMessage from './ErrorMessage';
import MessageBubble from './MessageBubble';

interface CoachChatProps {
  providerConfig: AIProviderConfig;
  playerProfile: PlayerProfile | null;
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hola! I'm LuchoAI, your personal football coach. Set up your player profile to get personalised advice, or just ask me anything about football!",
  timestamp: new Date(),
};

function buildWelcome(profile: PlayerProfile | null): Message {
  if (!profile) return WELCOME;
  return {
    ...WELCOME,
    content: `Hola ${profile.name}! I'm LuchoAI, your personal football coach. Ready to take your game to the next level? What would you like to work on today?`,
  };
}

export default function CoachChat({ providerConfig, playerProfile }: CoachChatProps) {
  const [messages, setMessages] = useState<Message[]>([buildWelcome(playerProfile)]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contextMessages, setContextMessages] = useState<ContextMessage[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadContextBatches(playerProfile).then(setContextMessages);
  }, [playerProfile]);

  // Scroll the list itself: scrollIntoView would also scroll the page and carry the header away.
  useEffect(() => {
    const list = scrollerRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, loading, error]);

  // The keyboard shrinks the list: keep the newest message in view unless the player scrolled up.
  useEffect(() => {
    const list = scrollerRef.current;
    if (!list) return;
    let pinned = true;
    const onScroll = (): void => {
      pinned = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    };
    const observer = new ResizeObserver(() => {
      if (pinned) list.scrollTop = list.scrollHeight;
    });
    list.addEventListener('scroll', onScroll, { passive: true });
    observer.observe(list);
    return () => {
      list.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  async function handleSend(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const reply = await sendMessage(providerConfig, messages, userMessage.content, playerProfile, contextMessages);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error && err.message === FREE_LIMIT_MESSAGE
          ? FREE_LIMIT_MESSAGE
          : 'Could not reach your coach. Check your API key and try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth p-3 motion-reduce:scroll-auto sm:p-4"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
        {error && <ErrorMessage className="mb-4">{error}</ErrorMessage>}
      </div>

      <form onSubmit={handleSend} className="flex flex-shrink-0 gap-2 border-t bg-white p-2 sm:p-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach about football..."
          aria-label="Message to your coach"
          maxLength={MAX_MESSAGE_LENGTH}
          enterKeyHint="send"
          className="min-w-0 flex-1 rounded-full border border-gray-300 px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-pitch-green sm:text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-pitch-green text-white transition-colors hover:bg-pitch-dark disabled:opacity-50 text-lg"
          aria-label="Send message"
        >
          &uarr;
        </button>
      </form>
    </div>
  );
}
