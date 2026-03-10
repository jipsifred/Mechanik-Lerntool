import { $node, $view, $remark, $inputRule, $prose } from '@milkdown/kit/utils';
import { InputRule } from '@milkdown/kit/prose/inputrules';
import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import remarkMath from 'remark-math';
import katex from 'katex';

/* ── remark-math: parses $...$ and $$...$$ in markdown ── */
export const remarkMathPlugin = $remark('remarkMath', () => remarkMath);

/* ── Inline math node ($...$) ── */
export const mathInlineNode = $node('math_inline', () => ({
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  attrs: { value: { default: '' } },
  toDOM: (node: any) => [
    'span',
    { 'data-type': 'math_inline', 'data-value': node.attrs.value, class: 'math-inline-node' },
  ],
  parseDOM: [{
    tag: 'span[data-type="math_inline"]',
    getAttrs: (dom: any) => ({ value: (dom as HTMLElement).getAttribute('data-value') || '' }),
  }],
  parseMarkdown: {
    match: (node: any) => node.type === 'inlineMath',
    runner: (state: any, node: any, type: any) => {
      state.addNode(type, { value: node.value as string });
    },
  },
  toMarkdown: {
    match: (node: any) => node.type.name === 'math_inline',
    runner: (state: any, node: any) => {
      state.addNode('inlineMath', undefined, node.attrs.value as string);
    },
  },
}));

/* ── Display math node ($$...$$) ── */
export const mathDisplayNode = $node('math_display', () => ({
  group: 'block',
  atom: true,
  selectable: true,
  attrs: { value: { default: '' } },
  toDOM: (node: any) => [
    'div',
    { 'data-type': 'math_display', 'data-value': node.attrs.value, class: 'math-display-node' },
  ],
  parseDOM: [{
    tag: 'div[data-type="math_display"]',
    getAttrs: (dom: any) => ({ value: (dom as HTMLElement).getAttribute('data-value') || '' }),
  }],
  parseMarkdown: {
    match: (node: any) => node.type === 'math',
    runner: (state: any, node: any, type: any) => {
      state.addNode(type, { value: node.value as string });
    },
  },
  toMarkdown: {
    match: (node: any) => node.type.name === 'math_display',
    runner: (state: any, node: any) => {
      state.addNode('math', undefined, node.attrs.value as string);
    },
  },
}));

/* ── NodeView helpers ── */
function renderKatexTo(el: HTMLElement, value: string, displayMode: boolean) {
  if (!value) {
    el.innerHTML = '<span class="math-placeholder">Formel…</span>';
    return;
  }
  try {
    el.innerHTML = katex.renderToString(value, { throwOnError: false, displayMode });
  } catch {
    el.textContent = value;
  }
}

function createMathView(nodeName: string, displayMode: boolean) {
  return (initialNode: any, view: any, getPos: any) => {
    let currentNode = initialNode;
    let editing = false;

    const dom = document.createElement(displayMode ? 'div' : 'span');
    dom.className = displayMode ? 'math-display-node' : 'math-inline-node';
    dom.setAttribute('data-type', nodeName);

    const render = () => {
      renderKatexTo(dom, currentNode.attrs.value, displayMode);
      // Add zero-width space as baseline anchor so the browser caret
      // stays at text height instead of dropping below tall formulas
      if (!displayMode) {
        const anchor = document.createElement('span');
        anchor.className = 'math-baseline-anchor';
        anchor.textContent = '\u200B';
        dom.appendChild(anchor);
      }
      dom.classList.remove('math-editing');
    };

    const startEdit = () => {
      if (editing) return;
      editing = true;

      const input = displayMode
        ? document.createElement('textarea')
        : document.createElement('input');

      if (!displayMode) (input as HTMLInputElement).type = 'text';
      if (displayMode) (input as HTMLTextAreaElement).rows = 3;

      input.value = currentNode.attrs.value;
      input.className = displayMode ? 'math-display-input' : 'math-inline-input';

      const finish = () => {
        if (!editing) return;
        editing = false;
        const val = input.value;
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (pos != null && val !== currentNode.attrs.value) {
          view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { value: val }));
        }
        render();
      };

      input.addEventListener('blur', finish);
      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' && (!displayMode || !e.shiftKey)) {
          e.preventDefault();
          finish();
        }
        if (e.key === 'Escape') {
          editing = false;
          render();
        }
      });

      dom.innerHTML = '';
      dom.appendChild(input);
      dom.classList.add('math-editing');
      input.focus();
      if ('select' in input) input.select();
    };

    dom.addEventListener('dblclick', (e) => { e.stopPropagation(); e.preventDefault(); startEdit(); });

    render();

    return {
      dom,
      stopEvent: (event: Event) => {
        if (editing) return true;
        // Let dblclick be handled by our listener, block it from ProseMirror
        if (event.type === 'dblclick') return true;
        // Let single clicks pass through to ProseMirror for cursor placement
        return false;
      },
      ignoreMutation: () => true,
      update: (up: any) => {
        if (up.type.name !== nodeName) return false;
        currentNode = up;
        if (!editing) render();
        return true;
      },
      selectNode: () => { dom.classList.add('ProseMirror-selectednode'); },
      deselectNode: () => { dom.classList.remove('ProseMirror-selectednode'); },
      destroy: () => {},
    };
  };
}

/* ── Register views ── */
export const mathInlineView = $view(mathInlineNode, () => createMathView('math_inline', false));
export const mathDisplayView = $view(mathDisplayNode, () => createMathView('math_display', true));

/* ── Input rule: typing $...$  →  inline math node ── */
export const mathInlineInputRule = $inputRule((ctx) =>
  new InputRule(/\$([^$]+)\$$/, (state, match, start, end) => {
    const value = match[1];
    if (!value?.trim()) return null;
    const nodeType = mathInlineNode.type(ctx);
    return state.tr.replaceWith(start, end, nodeType.create({ value })).scrollIntoView();
  }),
);

/* ── Fallback plugin: catches $...$ patterns that InputRule misses ── */
const mathConvertKey = new PluginKey('mathConvertFallback');

export const mathConvertPlugin = $prose((ctx) => {
  const nodeType = mathInlineNode.type(ctx);

  return new Plugin({
    key: mathConvertKey,
    view() {
      let timer: ReturnType<typeof setTimeout> | null = null;

      return {
        update(view, prevState) {
          // Only act when the document actually changed
          if (view.state.doc.eq(prevState.doc)) return;

          // Debounce: wait 150ms after the last change before converting
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            timer = null;
            try {
              const { state } = view;
              const allMatches: { start: number; end: number; value: string }[] = [];

              state.doc.descendants((node, pos) => {
                if (!node.isText || !node.text) return;
                const text = node.text;
                if (!text.includes('$')) return;
                const regex = /\$([^$]+)\$/g;
                let m;
                while ((m = regex.exec(text)) !== null) {
                  const value = m[1].trim();
                  if (value) {
                    allMatches.push({ start: pos + m.index, end: pos + m.index + m[0].length, value: m[1] });
                  }
                }
              });

              if (allMatches.length === 0) return;

              // Sort descending so replacements don't shift earlier positions
              allMatches.sort((a, b) => b.start - a.start);

              const tr = state.tr;
              for (const { start, end, value } of allMatches) {
                tr.replaceWith(start, end, nodeType.create({ value }));
              }
              view.dispatch(tr);
            } catch {
              // Silently ignore conversion errors to never break the editor
            }
          }, 150);
        },
        destroy() {
          if (timer) clearTimeout(timer);
        },
      };
    },
  });
});
