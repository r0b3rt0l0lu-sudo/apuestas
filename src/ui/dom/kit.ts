import { drawFrame, drawChip, drawTick } from '../../art/ui';
import './style.css';

/** Crea un elemento con clase y texto. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '', parent?: HTMLElement): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  parent?.appendChild(e);
  return e;
}

export const urls: Record<string, string> = {};

/** Genera los marcos de pixel art y los pone como variables CSS (una sola vez al arrancar). */
export function initKit(): void {
  const set = (name: string, key: string, url: string) => { urls[key] = url; document.documentElement.style.setProperty(name, `url(${url})`); };
  (['btn', 'btn-f', 'btn-t', 'btn-d', 'panel', 'dialog'] as const).forEach((k) => set(`--f-${k}`, `frame-${k}`, drawFrame(k).canvas.toDataURL()));
  urls.chip = drawChip().canvas.toDataURL();
  urls.tickOn = drawTick(true).canvas.toDataURL();
  urls.tickOff = drawTick(false).canvas.toDataURL();
}

export interface BtnOpts { cls?: string; sub?: string; hotkey?: string; style?: Partial<CSSStyleDeclaration>; sel?: boolean }

export function btn(parent: HTMLElement | null, text: string, onClick: () => void, o: BtnOpts = {}): HTMLButtonElement {
  const b = el('button', `btn ${o.cls ?? ''} ${o.sel ? 'sel' : ''}`, '', parent ?? undefined);
  b.type = 'button';
  const t = el('span', '', text, b);
  void t;
  if (o.sub) el('small', '', o.sub, b);
  if (o.style) Object.assign(b.style, o.style);
  if (o.hotkey) b.dataset.hotkey = o.hotkey.toLowerCase();
  b.addEventListener('click', () => onClick());
  return b;
}

export function setBtnText(b: HTMLElement, text: string): void {
  (b.querySelector('span') as HTMLElement).textContent = text;
}

// ---------- navegación con teclado ----------
interface Nav { root: HTMLElement; onBack?: () => void }
const navs: Nav[] = [];

function items(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('button.btn')).filter((b) => !b.disabled && b.offsetParent !== null);
}

function move(root: HTMLElement, dx: number, dy: number): void {
  const list = items(root);
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || !list.includes(cur as HTMLButtonElement)) { list[0]?.focus(); return; }
  const cr = cur.getBoundingClientRect();
  const cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
  let best: HTMLElement | null = null, bs = Infinity;
  for (const b of list) {
    if (b === cur) continue;
    const r = b.getBoundingClientRect();
    const vx = r.left + r.width / 2 - cx, vy = r.top + r.height / 2 - cy;
    const main = vx * dx + vy * dy;
    if (main <= 1) continue;
    const score = main + (Math.abs(vx * dy) + Math.abs(vy * dx)) * 2;
    if (score < bs) { bs = score; best = b; }
  }
  best?.focus();
}

window.addEventListener('keydown', (e) => {
  const nav = navs[navs.length - 1];
  if (!nav) return;
  const key = e.key.toLowerCase();
  if (key === 'escape') { nav.onBack?.(); return; }
  const hk = nav.root.querySelector<HTMLButtonElement>(`button.btn[data-hotkey="${key === ' ' ? 'space' : key}"]`);
  if (hk && !hk.disabled) { e.preventDefault(); hk.click(); return; }
  const dir = ({ arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] } as Record<string, [number, number]>)[key];
  if (dir) { e.preventDefault(); move(nav.root, dir[0], dir[1]); }
});

/** Activa la navegación por teclado (flechas, Intro/Espacio nativos, Esc, teclas rápidas) sobre un contenedor. Devuelve cómo quitarla. */
export function attachNav(root: HTMLElement, onBack?: () => void): () => void {
  const n: Nav = { root, onBack };
  navs.push(n);
  queueMicrotask(() => { if (!root.contains(document.activeElement) || document.activeElement === document.body) items(root)[0]?.focus(); });
  return () => { const i = navs.indexOf(n); if (i >= 0) navs.splice(i, 1); };
}

export function focusFirst(root: HTMLElement): void {
  items(root)[0]?.focus();
}
