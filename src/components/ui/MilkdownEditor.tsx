import { useRef } from 'react';
import { MilkdownProvider, Milkdown, useEditor } from '@milkdown/react';
import { Editor, defaultValueCtx, rootCtx, editorViewOptionsCtx } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { history } from '@milkdown/kit/plugin/history';
import {
  remarkMathPlugin,
  mathInlineNode,
  mathDisplayNode,
  mathInlineView,
  mathDisplayView,
  mathInlineInputRule,
} from './milkdown-math';

interface MilkdownEditorProps {
  defaultValue: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

function MilkdownInner({ defaultValue, onChange, placeholder }: MilkdownEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
      .use(mathInlineInputRule);
  }, []);

  return (
    <div className="milkdown-container">
      <Milkdown />
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
