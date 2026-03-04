import { InlineMath } from 'react-katex';

/**
 * Render a string that may contain inline LaTeX ($...$) as mixed text + InlineMath.
 * Splits on single $ delimiters and alternates between text and math spans.
 */
export function MarkdownMath({ text }: { text: string }) {
  if (!text) return null;

  // Split on $ delimiters (but not $$)
  const parts = text.split(/(?<!\$)\$(?!\$)/);

  return (
    <>
      {parts.map((part, i) => {
        // Odd indices are math content (between $ delimiters)
        if (i % 2 === 1) {
          try {
            return <InlineMath key={i} math={part} />;
          } catch {
            return <code key={i}>{part}</code>;
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
