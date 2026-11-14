import { useEffect } from 'react';

/**
 * Keeps the line being typed visible above the on-screen keyboard on touch devices.
 *
 * A docked keyboard shrinks the visual viewport, so the browser mostly copes on its own. A split
 * or floating keyboard (common on iPhone Duo's inner display and on iPad) does not: the page
 * keeps its full height, and an entry near the bottom ends up typed behind the keyboard halves.
 * While a text field is focused, this scrolls its container so the caret stays in the top part of
 * the screen. The extra room to scroll into comes from the `main:has(:focus)` rule in index.css.
 */
export function useKeepCaretAboveKeyboard() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: coarse)').matches) return;

    let frame = 0;
    const schedule = (target: EventTarget | null, delay: number) => {
      if (!(target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement)) return;
      window.clearTimeout(frame);
      frame = window.setTimeout(() => keepVisible(target), delay);
    };
    // Wait for the keyboard to finish appearing on focus; follow typing quickly.
    const onFocusIn = (e: FocusEvent) => schedule(e.target, 350);
    const onInput = (e: Event) => schedule(e.target, 30);

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('input', onInput);
    return () => {
      window.clearTimeout(frame);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('input', onInput);
    };
  }, []);
}

function keepVisible(field: HTMLTextAreaElement | HTMLInputElement) {
  if (document.activeElement !== field) return;
  const scroller = scrollParent(field);
  if (!scroller) return;

  const vv = window.visualViewport;
  const visibleTop = vv ? vv.offsetTop : 0;
  const visibleHeight = vv ? vv.height : window.innerHeight;
  // If the viewport already shrank, a docked keyboard is accounted for: just keep a small gap.
  // Otherwise assume a split or floating keyboard over the lower part of the screen.
  const keyboardDocked = visibleHeight < window.innerHeight - 120;
  const limit = keyboardDocked ? visibleTop + visibleHeight - 32 : visibleTop + visibleHeight * 0.55;

  const caretBottom = caretBottomY(field);
  if (caretBottom > limit) {
    scroller.scrollBy({ top: caretBottom - limit + 24, behavior: 'smooth' });
  }
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/** Viewport Y of the bottom of the caret's line (the field's bottom for single-line inputs). */
function caretBottomY(field: HTMLTextAreaElement | HTMLInputElement): number {
  const rect = field.getBoundingClientRect();
  if (!(field instanceof HTMLTextAreaElement)) return rect.bottom;

  // Mirror the textarea's text up to the caret in an invisible div to find the caret's line.
  const style = getComputedStyle(field);
  const mirror = document.createElement('div');
  for (const prop of [
    'boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight',
    'textTransform', 'wordSpacing', 'textIndent', 'tabSize',
  ] as const) {
    mirror.style[prop] = style[prop];
  }
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.top = '0';
  mirror.style.left = '-9999px';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflowWrap = 'break-word';
  mirror.textContent = field.value.slice(0, field.selectionEnd ?? field.value.length);
  const marker = document.createElement('span');
  marker.textContent = '​';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const lineBottom = marker.offsetTop + marker.offsetHeight;
  mirror.remove();

  return Math.min(rect.bottom, rect.top + lineBottom - field.scrollTop);
}
