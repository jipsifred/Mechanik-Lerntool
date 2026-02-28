import { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from '../ui';
import type { ChatPanelProps } from '../../types';

export function ChatPanel({ messages, isTyping, inputValue, onInputChange, onSend, onKeyDown }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-14">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput
        value={inputValue}
        onChange={onInputChange}
        onSend={onSend}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
