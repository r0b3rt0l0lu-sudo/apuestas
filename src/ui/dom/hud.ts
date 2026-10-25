import { sfx } from '../../audio/sfx';
import { nightDef } from '../../core/nights';
import { quotaOfRun, session } from '../../core/session';
import { T, fmt } from '../../i18n/es';
import { el, urls } from './kit';

/** Barra superior compartida: noche, saldo animado, cuota segmentada y acciones como velas. */
export class HudDom {
  readonly root: HTMLElement;
  private night: HTMLElement;
  private bal: HTMLElement;
  private gauge: HTMLElement;
  private segs: HTMLElement[] = [];
  private quota: HTMLElement;
  private acts: HTMLElement;
  private ticks: HTMLElement;
  private unsub: () => void;
  private frozen = false;
  private shown: number;
  private target: number;
  private anim = 0;
  private lastActions: number;
  private pulse = 0;
  private pulseTimer: number;

  constructor(parent: HTMLElement) {
    this.root = el('div', 'hud hit', '', parent);
    this.night = el('div', 'night txt', '', this.root);
    const balBox = el('div', 'bal txt', '', this.root);
    const chip = el('img', '', '', balBox) as HTMLImageElement;
    chip.src = urls.chip as string;
    this.bal = el('span', '', '', balBox);
    this.gauge = el('div', 'gauge', '', this.root);
    for (let i = 0; i < 28; i++) this.segs.push(el('i', '', '', this.gauge));
    this.quota = el('div', 'quota txt', '', this.root);
    this.acts = el('div', 'acts txt', '', this.root);
    this.ticks = el('div', 'ticks', '', this.root);
    this.shown = this.target = session.run.balance;
    this.lastActions = session.run.actionsLeft;
    this.unsub = session.subscribe(() => this.refresh());
    this.pulseTimer = window.setInterval(() => { this.pulse++; this.paintGauge(); }, 250);
    this.refresh();
  }

  /** Congela el HUD mientras una animación no ha revelado el resultado. */
  freeze(v: boolean): void {
    this.frozen = v;
    if (!v) this.refresh();
  }

  private paintGauge(): void {
    const q = quotaOfRun(session.run);
    const filled = Math.floor(Math.min(1, this.shown / q) * 28 + 0.001);
    const met = this.shown >= q;
    this.gauge.classList.toggle('met', met);
    this.segs.forEach((s, i) => { s.className = i < filled ? (met && this.pulse % 2 === 0 ? 'on hot' : 'on') : ''; });
  }

  refresh(): void {
    if (this.frozen) return;
    const r = session.run, q = quotaOfRun(r), d = nightDef(r.night);
    this.night.textContent = `${T.hud.night} ${r.night}/7`;
    this.quota.textContent = `${T.hud.quota} ${fmt(q)}`;
    this.acts.textContent = `${T.hud.actions} ${r.actionsLeft}`;
    if (r.balance !== this.target) {
      const delta = r.balance - this.target;
      this.target = r.balance;
      const from = this.shown, t0 = performance.now(), dur = Math.min(900, 250 + Math.abs(delta) * 2);
      cancelAnimationFrame(this.anim);
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / dur);
        this.shown = Math.round(from + (r.balance - from) * k);
        this.bal.textContent = fmt(this.shown);
        this.paintGauge();
        if (k < 1) this.anim = requestAnimationFrame(step);
      };
      step();
      this.floatDelta(delta);
      if (delta > 0) sfx.reelTick();
    } else {
      this.shown = r.balance;
      this.bal.textContent = fmt(r.balance);
      this.paintGauge();
    }
    // velas: la que se acaba de gastar se apaga con un parpadeo
    this.ticks.textContent = '';
    for (let i = 0; i < d.actions; i++) {
      const on = i < r.actionsLeft;
      const im = el('img', on ? '' : i === r.actionsLeft && this.lastActions > r.actionsLeft ? 'snuff' : '', '', this.ticks) as HTMLImageElement;
      im.src = (on ? urls.tickOn : urls.tickOff) as string;
    }
    this.lastActions = r.actionsLeft;
  }

  private floatDelta(delta: number): void {
    if (delta === 0) return;
    const f = el('div', 'float', `${delta > 0 ? '+' : ''}${fmt(delta)}`, this.root);
    f.style.left = '560px'; f.style.top = '30px';
    f.style.color = delta > 0 ? '#ece0c0' : '#c4b494';
    window.setTimeout(() => f.remove(), 1300);
  }

  dispose(): void {
    this.unsub();
    cancelAnimationFrame(this.anim);
    window.clearInterval(this.pulseTimer);
  }
}
