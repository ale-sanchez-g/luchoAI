'use client';

import { useState, useRef, useEffect } from 'react';
import type { Message, PlayerProfile, AIProviderConfig } from '@/types';
import { sendMessage } from '@/lib/claude';
import MessageBubble from './MessageBubble';

interface CoachChatProps {
  providerConfig: AIProviderConfig;
  playerProfile: PlayerProfile | null;
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hola! \u{1F44B} I'm LuchoAI, your personal football coach. Set up your player profile to get personalised advice, or just ask me anything about football!",
  timestamp: new Date(),
};

function buildWelcome(profile: PlayerProfile | null): Message {
  if (!profile) return WELCOME;
  return {
    ...WELCOME,
    content: `Hola ${profile.name}! \u{1F44B} I'm LuchoAI, your personal football coach. Ready to take your game to the next level? What would you like to work on today?`,
  };
}

export default function CoachChat({ providerConfig, playerProfile }: CoachChatProps) {
  const [messages, setMessages] = useState<Message[]>([buildWelcome(playerProfile)]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      const reply = await sendMessage(providerConfig, messages, userMessage.content, playerProfile);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setError('Could not reach your coach. Check your API key and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
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
        {error && <p className="text-center text-red-500 text-sm mb-4">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t p-4 flex gap-2 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach anything..."
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-pitch-green text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-pitch-dark transition-colors disabled:opacity-50 text-lg"
          aria-label="Send message"
        >
          &uarr;
        </button>
      </form>
    </div>
  );
}
