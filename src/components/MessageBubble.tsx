import ReactMarkdown from 'react-markdown';
import type { Message } from '@/types';
import Icon from './Icon';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <Icon name="ball" size={32} className="mr-2 mt-1" />
      )}
      <div
        className={`min-w-0 max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
          isUser
            ? 'bg-pitch-green text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
        }`}
      >
        <div
          className={`text-sm prose prose-sm max-w-none [overflow-wrap:anywhere] ${
            isUser ? 'prose-invert' : ''
          }`}
        >
          <ReactMarkdown
            components={{
              pre: ({ children }) => (
                <pre className="mb-2 max-w-full overflow-x-auto rounded-lg bg-gray-800 p-2 text-xs text-gray-100">
                  {children}
                </pre>
              ),
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              h1: ({ children }) => <h1 className="font-bold text-base mb-1">{children}</h1>,
              h2: ({ children }) => <h2 className="font-bold text-sm mb-1">{children}</h2>,
              h3: ({ children }) => <h3 className="font-semibold text-sm mb-1">{children}</h3>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        <p className={`text-xs mt-1 ${isUser ? 'text-green-200' : 'text-gray-400'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
