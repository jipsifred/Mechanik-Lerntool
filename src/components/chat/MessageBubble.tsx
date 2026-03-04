import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import type { MessageBubbleProps } from '../../types';

function CodeBlock({ className, children }: { className?: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace('language-', '') || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(children.replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {language && (
        <span className="absolute top-2 left-3 text-hint text-slate-400 font-mono select-none">
          {language}
        </span>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-1.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-hint text-slate-400 hover:text-slate-200 rounded"
      >
        {copied ? 'Kopiert!' : 'Kopieren'}
      </button>
      <pre className={language ? '!pt-7' : ''}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.sender === 'user' ? (
        <div className="bg-[#ededed] text-neutral-800 px-4 py-2 rounded-l-lg rounded-br-lg max-w-[85%] text-body leading-relaxed shadow-sm">
          {message.text}
        </div>
      ) : (
        <div className="text-slate-700 text-body w-full markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code({ className, children, ...props }) {
                const isInline = !className;
                if (isInline) {
                  return <code className={className} {...props}>{children}</code>;
                }
                return <CodeBlock className={className}>{String(children)}</CodeBlock>;
              },
              pre({ children }) {
                return <>{children}</>;
              },
            }}
          >
            {message.text}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
