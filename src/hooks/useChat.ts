import { useState, type KeyboardEvent } from 'react';
import type { Message } from '../types';
import { INITIAL_MESSAGES, MOCK_RESPONSE } from '../data/mockData';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const sendMessage = () => {
    if (!inputValue.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: inputValue }]);
    setInputValue('');
    setIsTyping(true);

    // TODO: Replace with actual API call (e.g. Gemini)
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'system',
        text: MOCK_RESPONSE,
      }]);
      setIsTyping(false);
    }, 7000);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return {
    messages,
    isTyping,
    inputValue,
    setInputValue,
    sendMessage,
    handleKeyDown,
  };
}
