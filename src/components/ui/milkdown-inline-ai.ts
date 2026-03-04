import { $prose } from '@milkdown/kit/utils';
import { Plugin, PluginKey } from '@milkdown/kit/prose/state';

export const inlineAIPluginKey = new PluginKey('inline-ai');

export interface InlineAITrigger {
  from: number;
  to: number;
  coords: { top: number; left: number };
}

export function createInlineAIPlugin(
  onTriggerRef: { current: ((trigger: InlineAITrigger) => void) | null }
) {
  return $prose(() => {
    return new Plugin({
      key: inlineAIPluginKey,
      props: {
        handleTextInput(view, from, _to, text) {
          if (text !== '/') return false;

          const { state } = view;
          const posBefore = from - 1;
          if (posBefore < 0) return false;

          const charBefore = state.doc.textBetween(posBefore, from);
          if (charBefore !== '/') return false;

          // Check that "//" is at start of block or after whitespace (avoid URLs)
          if (posBefore > 0) {
            const charBeforeSlash = state.doc.textBetween(posBefore - 1, posBefore);
            if (charBeforeSlash && !/\s/.test(charBeforeSlash)) return false;
          }

          // Let the "/" be inserted, then trigger on next tick
          // Use viewport coords (for fixed positioning — avoids overflow clipping)
          setTimeout(() => {
            const coords = view.coordsAtPos(from + 1);
            onTriggerRef.current?.({
              from: posBefore,
              to: from + 1,
              coords: {
                top: coords.bottom + 4,
                left: coords.left,
              },
            });
          }, 0);

          return false;
        },
      },
    });
  });
}
