import { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator, GlassContainer } from '../ui';
import { AI_MODELS } from '../../data/mockData';
import type { ChatPanelProps } from '../../types';

const GEMINI_MODELS = AI_MODELS.filter(m => m.provider === 'gemini');
const GROQ_MODELS   = AI_MODELS.filter(m => m.provider === 'groq');

export function ChatPanel({ messages, isTyping, inputValue, onInputChange, onSend, onKeyDown, selectedModelId, onModelChange }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Model selector */}
      <div className="flex items-center mb-3 shrink-0">
        <GlassContainer className="h-7 px-3">
          <select
            value={selectedModelId}
            onChange={(e) => onModelChange(e.target.value)}
            className="bg-transparent text-[12px] text-slate-600 focus:outline-none cursor-pointer appearance-none"
          >
            <optgroup label="Google Gemini">
              {GEMINI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </optgroup>
            <optgroup label="Groq (Kostenlos)">
              {GROQ_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </optgroup>
          </select>
        </GlassContainer>
      </div>

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
