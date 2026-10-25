import { type Game, TABLES } from '../../core/economy';
import { quotaOfRun, session } from '../../core/session';
import { fmt, T } from '../../i18n/es';
import { HudDom } from '../../ui/dom/hud';
import { attachNav, btn, el } from '../../ui/dom/kit';
import { Stage } from '../stage';
import { goHub, goPhase } from '../router';
import { sfx } from '../../audio/sfx';
import { engine } from '../engine';

const BET: Record<Game, number> = { slots: 50, roulette: 50, race: 100 };

/** Base de las tres mesas: HUD, apuesta, volver al pasillo, mensaje y cierre de noche. */
export abstract class TableStage extends Stage {
  protected hud!: HudDom;
  protected busy = false;
  protected line!: HTMLElement;
  protected bar!: HTMLElement;
  private betBtns: HTMLButtonElement[] = [];
  private backBtn!: HTMLButtonElement;
  private detach: () => void = () => undefined;
  protected actions: HTMLButtonElement[] = [];

  constructor(protected table: Game, private ambience: 'slots' | 'roulette' | 'race') {
    super();
  }

  protected abstract build(): void;
  /** Se llama cuando cambian la apuesta o el saldo, para reactivar botones. */
  protected onChange(): void { /* opcional */ }

  init(): void {
    if (session.run.phase === 'hub') session.dispatch({ type: 'enterTable' });
    if (session.run.phase !== 'playing') { goPhase(); return; }
    sfx.ambience(this.ambience);
    this.hud = new HudDom(this.ui);
    this.bar = el('div', 'hit', '', this.ui);
    Object.assign(this.bar.style, { position: 'absolute', left: '0', right: '0', bottom: '58px' });
    this.line = el('div', 'msg txt', '', this.ui);
    this.line.style.bottom = '16px'; this.line.style.fontSize = '28px';
    this.back = btn(this.ui, T.slots.back, () => this.leave(), { cls: 'small hit', hotkey: 'escape', style: { position: 'absolute', left: '16px', bottom: '12px', width: '230px' } });
    this.build();
    this.detach = attachNav(this.ui, () => this.leave());
    this.refreshBets();
  }

  private set back(b: HTMLButtonElement) { this.backBtn = b; }

  protected get bet(): number { return BET[this.table]; }
  protected say(s: string): void { this.line.textContent = s; }

  protected leave(): void {
    if (this.busy) return;
    session.dispatch({ type: 'leaveTable' });
    goHub();
  }

  protected affordable(): boolean {
    const r = session.run;
    return r.phase === 'playing' && r.balance >= this.bet && r.actionsLeft >= TABLES[this.table].cost;
  }

  /** Fila de fichas centrada dentro de `parent`. */
  protected betRow(parent: HTMLElement, w = 120): void {
    TABLES[this.table].bets.forEach((b) => {
      const x = btn(parent, fmt(b), () => { BET[this.table] = b; this.refreshBets(); }, { style: { width: `${w}px` } });
      x.dataset.v = String(b);
      this.betBtns.push(x);
    });
  }

  protected refreshBets(): void {
    const r = session.run, bets = TABLES[this.table].bets;
    if (this.bet > r.balance) BET[this.table] = [...bets].reverse().find((b) => b <= r.balance) ?? (bets[0] as number);
    this.betBtns.forEach((b) => { const v = Number(b.dataset.v); b.classList.toggle('sel', v === this.bet); b.disabled = this.busy || v > r.balance; });
    this.actions.forEach((a) => { a.disabled = this.busy || !this.affordable(); });
    this.onChange();
  }

  protected setBusy(v: boolean): void {
    this.busy = v;
    this.backBtn.disabled = v;
    this.refreshBets();
  }

  protected get quota(): number { return quotaOfRun(session.run); }

  /** Termina la jugada: revela el HUD y, si la noche se cierra, cambia de pantalla. */
  protected finishPlay(): void {
    this.hud.freeze(false);
    this.setBusy(false);
    const ph = session.run.phase;
    if (ph === 'duel' || ph === 'dawn' || ph === 'dead' || ph === 'ending') {
      this.say(ph === 'duel' ? '«Se acabó el tiempo. Hora de pagar.»' : ph === 'dawn' ? '«Amanece. Veamos qué has reunido.»' : ph === 'dead' ? '«La casa gana. Siempre.»' : '«…Imposible.»');
      this.run(async () => { await this.tweens.wait(2600); goPhase(); });
    }
  }

  dispose(): void {
    this.detach();
    this.hud?.dispose();
    engine.setLight(640, 400, 1150, 0.62);
    super.dispose();
  }
}
