import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { MessageBubbleProps } from '../../types';

export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.sender === 'user' ? (
        <div className="bg-[#ededed] text-neutral-800 px-4 py-2 rounded-l-lg rounded-br-lg max-w-[85%] text-[13px] leading-relaxed shadow-sm">
          {message.text}
        </div>
      ) : (
        <div className="text-slate-700 text-[13px] w-full markdown-body">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {message.text}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
