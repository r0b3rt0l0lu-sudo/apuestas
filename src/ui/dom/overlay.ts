import { attachNav, btn, el } from './kit';

export interface OverlayBtn { text: string; onClick: () => void; cls?: string }

/** Ventana modal con botones, foco de teclado propio y Esc opcional. */
export function showOverlay(parent: HTMLElement, title: string, body: string[], buttons: OverlayBtn[], o: { w?: number; extra?: (box: HTMLElement) => void; onBack?: () => void } = {}): { close: () => void; root: HTMLElement } {
  const root = el('div', 'overlay', '', parent);
  const box = el('div', 'box frame dialog', '', root);
  if (o.w) box.style.width = `${o.w}px`;
  el('h2', '', title, box);
  body.forEach((t) => el('p', '', t, box));
  o.extra?.(box);
  const row = el('div', 'row', '', box);
  let detach = () => undefined as void;
  const close = () => { detach(); root.remove(); };
  buttons.forEach((b) => btn(row, b.text, b.onClick, { cls: `big ${b.cls ?? ''}` }));
  detach = attachNav(root, o.onBack);
  return { close, root };
}
