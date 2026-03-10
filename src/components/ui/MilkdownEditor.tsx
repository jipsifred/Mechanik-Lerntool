import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { MilkdownProvider, Milkdown, useEditor, useInstance } from '@milkdown/react';
import { Editor, defaultValueCtx, rootCtx, editorViewOptionsCtx } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { history } from '@milkdown/kit/plugin/history';
import { replaceAll } from '@milkdown/kit/utils';
import {
  remarkMathPlugin,
  mathInlineNode,
  mathDisplayNode,
  mathInlineView,
  mathDisplayView,
  mathInlineInputRule,
  mathConvertPlugin,
  mathTrailingSpacePlugin,
} from './milkdown-math';
import { createInlineAIPlugin, type InlineAITrigger } from './milkdown-inline-ai';
import { InlineAIOverlay } from './InlineAIOverlay';
import { useInlineAI } from '../../hooks/useInlineAI';

interface MilkdownEditorProps {
  defaultValue: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  inlineContext?: 'karteikarten' | 'fehler' | 'formeln';
}

function MilkdownInner({ defaultValue, onChange, placeholder, autoFocus, inlineContext }: MilkdownEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const containerRef = useRef<HTMLDivElement>(null);

  // Track current markdown for AI context
  const currentMarkdownRef = useRef(defaultValue || '');

  // Inline AI state
  const [aiTrigger, setAiTrigger] = useState<InlineAITrigger | null>(null);
  const triggerCallbackRef = useRef<((trigger: InlineAITrigger) => void) | null>(null);
  triggerCallbackRef.current = (trigger) => setAiTrigger(trigger);

  const { generate, isLoading, hasApiKey } = useInlineAI(inlineContext);
  const [, getInstance] = useInstance();

  // Create plugin once with stable ref
  const inlineAIPlugin = useMemo(
    () => createInlineAIPlugin(triggerCallbackRef),
    []
  );

  useEffect(() => {
    if (!autoFocus) return;
    const timer = setTimeout(() => {
      const editable = containerRef.current?.querySelector<HTMLElement>('[contenteditable="true"]');
      editable?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  useEditor((root) => {
    return Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, defaultValue || '');
        ctx.update(editorViewOptionsCtx, (prev) => ({
          ...prev,
          attributes: {
            class: 'milkdown-editor',
            'data-placeholder': placeholder || '',
            spellcheck: 'false',
          },
        }));
        ctx.get(listenerCtx).markdownUpdated((_ctx, md, prevMd) => {
          if (md !== prevMd) {
            currentMarkdownRef.current = md;
            onChangeRef.current(md);
          }
        });
      })
      .use(commonmark)
      .use(listener)
      .use(history)
      .use(remarkMathPlugin)
      .use(mathInlineNode)
      .use(mathDisplayNode)
      .use(mathInlineView)
      .use(mathDisplayView)
      .use(mathInlineInputRule)
      .use(mathConvertPlugin)
      .use(mathTrailingSpacePlugin)
      .use(inlineAIPlugin);
  }, []);

  const handleAISubmit = useCallback(async (instruction: string) => {
    if (!aiTrigger) return;

    const editor = getInstance();
    if (!editor) return;

    const currentMd = currentMarkdownRef.current;
    const result = await generate(instruction, currentMd);

    if (result) {
      // Replace "//" with the AI response in the markdown
      const newMd = currentMd.replace('//', result);
      editor.action(replaceAll(newMd));
    }

    setAiTrigger(null);
  }, [aiTrigger, getInstance, generate]);

  const handleAICancel = useCallback(() => {
    setAiTrigger(null);
  }, []);

  return (
    <div
      className="milkdown-container"
      ref={containerRef}
    >
      <Milkdown />
      {aiTrigger && (
        <InlineAIOverlay
          position={aiTrigger.coords}
          isLoading={isLoading}
          hasApiKey={hasApiKey}
          onSubmit={handleAISubmit}
          onCancel={handleAICancel}
        />
      )}
    </div>
  );
}

export function MilkdownEditor(props: MilkdownEditorProps) {
  return (
    <MilkdownProvider>
      <MilkdownInner {...props} />
    </MilkdownProvider>
  );
}

export type { MilkdownEditorProps };
