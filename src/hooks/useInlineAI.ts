import { useState } from 'react';
import { useInlineAIContext } from '../context/InlineAIContext';

const INLINE_SYSTEM_PROMPT = `Du bist ein Assistent für Mechanik-Notizen. Der Benutzer schreibt Lernkarten, Fehlernotizen oder Formelsammlungen zu Technischer Mechanik.

Deine Aufgabe: Generiere formatierten Markdown-Text basierend auf der Anweisung des Benutzers.

Regeln:
- Antworte NUR mit dem gewünschten Inhalt, ohne Einleitung, Erklärung oder Meta-Kommentare.
- Verwende LaTeX: $...$ für Inline-Formeln, $$...$$ für Block-Formeln.
- Formatiere klar mit Markdown (Überschriften, Listen, Fett, etc.) wo sinnvoll.
- Sei präzise und fachlich korrekt.
- Passe den Inhalt an den Kontext an (was bereits im Feld steht, welche Aufgabe bearbeitet wird).`;

export function useInlineAI() {
  const ctx = useInlineAIContext();
  const [isLoading, setIsLoading] = useState(false);

  const generate = async (
    instruction: string,
    fieldContent: string
  ): Promise<string | null> => {
    if (!ctx?.geminiKey) return null;
    setIsLoading(true);

    try {
      const lines = [INLINE_SYSTEM_PROMPT];

      if (ctx.task) {
        lines.push('', '--- Aktuelle Aufgabe ---');
        lines.push(`Titel: ${ctx.task.title}`);
        if (ctx.task.description) lines.push(`Aufgabenstellung: ${ctx.task.description}`);
        if (ctx.task.given_latex) lines.push(`Gegebene Größen: ${ctx.task.given_latex}`);

        if (ctx.apiSubtasks.length > 0) {
          lines.push('', 'Teilaufgaben:');
          for (const s of ctx.apiSubtasks) {
            const desc = (s.label ? s.label + ' ' : '') + s.description;
            const formula = [s.math_prefix, s.solution, s.math_suffix].filter(Boolean).join(' ');
            lines.push(`- ${desc}: ${formula}`);
          }
        }
      }

      if (fieldContent.trim()) {
        lines.push('', '--- Aktueller Feldinhalt ---');
        lines.push(fieldContent);
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${ctx.selectedModel}:generateContent?key=${ctx.geminiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: lines.join('\n') }] },
          contents: [{ role: 'user', parts: [{ text: instruction }] }],
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as {
        candidates: { content: { parts: { text: string }[] } }[];
      };

      return data.candidates[0].content.parts[0].text;
    } catch {
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { generate, isLoading, hasApiKey: !!ctx?.geminiKey };
}
