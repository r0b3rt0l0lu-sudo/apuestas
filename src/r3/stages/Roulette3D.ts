import * as THREE from 'three';
import { drawWheel } from '../../art/wheel';
import { sfx } from '../../audio/sfx';
import { cursesFor } from '../../core/nights';
import { quotaOfRun, session } from '../../core/session';
import { rngOf } from '../../core/state';
import { type RouletteBet, OUTSIDE_KINDS, colorOf, labelOf, payoutFor, spin, wheelFor } from '../../games/roulette';
import { moodAfter } from '../../games/slots';
import { T, fmt } from '../../i18n/es';
import { btn, el, setBtnText } from '../../ui/dom/kit';
import { Cobrador3D } from '../cobrador3d';
import { engine } from '../engine';
import { Fx3D } from '../fx3d';
import { box, lam, mesh, rouletteTable, textures } from '../models';
import { phraseFor } from '../phrases';
import { canvasTex } from '../tex';
import { ease } from '../tween';
import { TableStage } from './TableStage';

const TURNS = 5, DUR = 4000, CX = -1.0, R_TRACK = 1.12, R_POCKET = 0.88;
const PCOL = { rojo: '#9c3c28', negro: '#26090e', verde: '#566a38' } as const;

/** Ruleta en 3D vista desde arriba: la rueda gira, la bola baja a su casilla y rebota. */
export class Roulette3D extends TableStage {
  readonly kind = 'roulette';
  private cob!: Cobrador3D;
  private disk!: THREE.Group;
  private ball!: THREE.Mesh;
  private pointer!: THREE.Mesh;
  private fx!: Fx3D;
  private bet_: RouletteBet = { kind: 'rojo' };
  private pleno = 17;
  private pockets: readonly number[] = [];
  private phi = 0; // giro actual de la rueda (rad, + = antihorario visto desde arriba)
  private kindBtns = new Map<string, HTMLButtonElement>();
  private plenoBtn!: HTMLButtonElement;
  private plenoNum!: HTMLElement;
  private chip!: HTMLElement;
  private spinBtn!: HTMLButtonElement;
  private ballAng: number | null = 0.0; // ángulo horario desde el puntero, en el marco del mundo
  private ballR = R_POCKET;
  private ballY = 1.2;

  constructor() { super('roulette', 'roulette'); }

  protected build(): void {
    this.light(430, 400, 1000, 0.3);
    const sc = this.scene;
    sc.background = new THREE.Color(0);
    sc.fog = new THREE.Fog(0x0a0a04, 8, 22);
    sc.add(new THREE.AmbientLight(0x3a3a28, 1.2));
    this.fx = new Fx3D(sc);
    this.pockets = wheelFor(cursesFor(session.run.night));
    const wheelTex = canvasTex(drawWheel(this.pockets).canvas);
    const rt = rouletteTable(wheelTex);
    sc.add(rt.group);
    this.disk = rt.disk;
    this.ball = rt.ball;
    this.pointer = rt.pointer;
    this.pointer.position.set(CX, 1.4, -1.34);
    this.pointer.rotation.x = 0;
    this.pointer.rotation.z = Math.PI;
    // suelo oscuro y luz cenital
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), lam(0x0a0e06));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    sc.add(floor);
    for (const x of [-4, 4]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), lam(0x4a5a30, textures.brick())); w.position.set(x, 3.5, -2); w.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; sc.add(w); }
    const key = new THREE.SpotLight(0xe8d8a0, 70, 16, 0.65, 0.7, 1.3);
    key.position.set(-0.8, 6.5, 1.5); key.target.position.set(-1, 1, 0); key.castShadow = true; key.shadow.mapSize.set(512, 512);
    sc.add(key, key.target);
    // candelabro colgado
    mesh(new THREE.CylinderGeometry(0.02, 0.02, 3, 4), lam(0x120c18), -1, 7.5, 1.5, sc);
    this.cob = new Cobrador3D(0.026).anchor(0.2, 2.9, -3.2);
    sc.add(this.cob);
    const back = new THREE.PointLight(0x9c3c28, 22, 9, 1.4);
    back.position.set(1.2, 3.5, -2.5); sc.add(back);
    // líneas de apuesta sobre el paño de la derecha
    for (let i = 0; i < 4; i++) box(1.4, 0.005, 0.015, lam(0xc4b494), 1.2, 0.99, -0.9 + i * 0.6, sc);
    for (let i = 0; i < 4; i++) box(0.015, 0.005, 1.8, lam(0xc4b494), 0.55 + i * 0.47, 0.99, 0, sc);

    this.camera.position.set(-0.9, 3.9, 3.3);
    this.camera.lookAt(-1.0, 0.95, 0.0);

    // interfaz: apuestas a la derecha
    const panel = el('div', 'abs frame panel hit', '', this.ui);
    Object.assign(panel.style, { right: '8px', top: '100px', width: '448px', padding: '2px 4px 8px' });
    const grid = el('div', '', '', panel);
    Object.assign(grid.style, { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' });
    OUTSIDE_KINDS.forEach((k, i) => { const b = btn(grid, T.roulette.kinds[k] as string, () => this.pickKind(k), { hotkey: String(i + 1) }); this.kindBtns.set(k, b); });
    const pl = el('div', 'row', '', panel);
    pl.style.marginTop = '8px';
    el('span', 'label', T.roulette.pleno, pl);
    btn(pl, '<', () => this.changePleno(-1), { hotkey: 'q', style: { width: '64px' } });
    this.plenoNum = el('span', 'txt', '', pl);
    Object.assign(this.plenoNum.style, { fontSize: '48px', width: '84px', textAlign: 'center' });
    btn(pl, '>', () => this.changePleno(1), { hotkey: 'e', style: { width: '64px' } });
    this.plenoBtn = btn(panel, `${T.roulette.pleno} ×36`, () => this.pickKind('pleno'), { cls: 'pill' });
    this.plenoBtn.style.marginTop = '6px'; this.plenoBtn.style.width = '100%';
    const help = el('div', 'label', T.roulette.plenoHelp, panel);
    help.style.fontSize = '22px'; help.style.marginTop = '6px'; help.style.textAlign = 'center';
    // casilla ganadora
    this.chip = el('div', 'abs frame panel', '', this.ui);
    Object.assign(this.chip.style, { left: '292px', top: '330px', width: '132px', height: '104px', textAlign: 'center', fontSize: '56px', lineHeight: '70px', color: '#ece0c0', display: 'none' });
    const row = el('div', 'row', '', this.bar);
    this.betRow(row, 96);
    this.spinBtn = btn(row, T.roulette.spin, () => this.start(), { cls: 'big', hotkey: 'space', style: { width: '380px', marginLeft: '24px' } });
    this.actions.push(this.spinBtn);
    this.pickKind('rojo');
    this.placeBall();
    this.say(T.night.intro(session.run.night));
    queueMicrotask(() => this.spinBtn.focus());
  }

  private pickKind(k: string): void {
    this.bet_ = k === 'pleno' ? { kind: 'pleno', n: this.pleno } : { kind: k as Exclude<RouletteBet['kind'], 'pleno'> };
    this.kindBtns.forEach((b, key) => b.classList.toggle('sel', key === k));
    this.plenoBtn.classList.toggle('sel', k === 'pleno');
    this.plenoNum.textContent = labelOf(this.pleno);
  }

  private changePleno(d: number): void {
    const list = this.pockets.slice().sort((a, b) => a - b);
    const i = list.indexOf(this.pleno);
    this.pleno = list[(i + d + list.length) % list.length] as number;
    this.pickKind('pleno');
  }

  /** Posición 3D de la bola dada su dirección horaria desde el puntero (arriba) en el mundo. */
  private placeBall(): void {
    if (this.ballAng === null) return;
    const a = this.ballAng;
    this.ball.position.set(CX + Math.sin(a) * this.ballR, this.ballY, -Math.cos(a) * this.ballR);
  }

  private start(): void {
    if (this.busy || !this.affordable()) return;
    const r = session.run, bet = this.bet;
    const rng = rngOf(r);
    const pocket = spin(rng, cursesFor(r.night));
    const payout = payoutFor(this.bet_, bet, pocket);
    this.hud.freeze(true);
    session.dispatch({ type: 'resolve', game: 'roulette', bet, payout, rng: rng.state });
    this.setBusy(true);
    this.chip.style.display = 'none';
    this.say('');
    sfx.lever();
    const step = (Math.PI * 2) / this.pockets.length;
    const alpha = this.pockets.indexOf(pocket) * step;
    const phi0 = this.phi;
    // la casilla p queda bajo el puntero cuando phi = alpha (módulo vuelta); la rueda gira en sentido horario
    let delta = (alpha - phi0) % (Math.PI * 2);
    if (delta > 0) delta -= Math.PI * 2;
    const phi1 = phi0 + delta - Math.PI * 2 * TURNS;
    const ballTurns = TURNS + 3;
    this.run(async () => {
      let lastTick = 0, landed = false;
      await this.tweens.tween(DUR, (e) => {
        this.phi = phi0 + (phi1 - phi0) * e;
        this.disk.rotation.y = this.phi;
        const k = Math.min(1, e);
        // la bola corre al revés y cae sobre la casilla ganadora, bajo el puntero
        this.ballAng = -ballTurns * Math.PI * 2 * (1 - e);
        const drop = k < 0.7 ? 0 : (k - 0.7) / 0.3;
        this.ballR = R_TRACK - (R_TRACK - R_POCKET) * drop * drop;
        let hop = 0;
        for (const [at, h] of [[0.74, 0.18], [0.82, 0.1], [0.89, 0.06], [0.94, 0.03]] as const) { const d = k - at; if (d >= 0 && d < 0.05) hop += Math.sin((d / 0.05) * Math.PI) * h; }
        this.ballY = 1.27 - 0.1 * drop + hop;
        this.placeBall();
        const tick = Math.floor(e * 70);
        if (tick !== lastTick && k < 0.97) { lastTick = tick; sfx.ballTick(); if (k > 0.72) this.fx.sparks(this.ball.position, 1, 0xece0c0, 1.2); }
        if (!landed && k >= 0.95) { landed = true; this.pointer.scale.setScalar(1.5); }
      }, ease.wheel);
      this.ball.position.y = 1.2;
      this.pointer.scale.setScalar(1);
      await this.tweens.wait(300);
      this.reveal(pocket, payout);
    });
  }

  private reveal(pocket: number, payout: number): void {
    const r = session.run, half = payout > 0 && payout < this.bet, lost = payout === 0 || half, c = colorOf(pocket);
    this.chip.style.display = 'block';
    this.chip.style.background = PCOL[c];
    this.chip.textContent = labelOf(pocket);
    this.cob.setMood(moodAfter(lost, r.actionsLeft, r.balance, quotaOfRun(r)));
    if (lost) { sfx.lose(); this.fx.smoke(new THREE.Vector3(CX, 1.3, 0), 5, 0.6); this.cob.laugh(); }
    else {
      sfx.prize();
      this.fx.coins(new THREE.Vector3(CX, 3, 0.5), Math.min(60, 14 + Math.round(payout / this.bet * 4)), 1.0);
      this.fx.sparks(new THREE.Vector3(CX, 1.4, -1.3), 16, 0xece0c0, 3);
      if (payout >= this.bet * 10) this.fx.confetti(new THREE.Vector3(CX, 3, 0), 60);
      this.say(`+${fmt(payout)}  ${phraseFor('roulette', false, r.actionsLeft, r.balance, quotaOfRun(r))}`);
    }
    if (lost) this.say(half ? T.roulette.partage(payout) : phraseFor('roulette', true, r.actionsLeft, r.balance, quotaOfRun(r)));
    this.finishPlay();
  }

  update(dt: number, t: number): void {
    this.fx.update(dt);
    // el Cobrador mira la bola
    const p = new THREE.Vector3().copy(this.ball.position).project(this.camera);
    this.cob.setGaze((p.x * 640 + 640 - 760) / 380, (-p.y * 400 + 400 - 340) / 260);
    this.cob.update(dt);
    this.cob.anchor(0.2 + Math.sin(t * 0.4) * 0.1, 2.9 + Math.sin(t * 0.9) * 0.05, -3.2);
    const px = engine.pointer.x;
    this.camera.position.set(-0.9 + (px - 640) / 640 * 0.25, 3.9 + Math.sin(t * 0.5) * 0.04, 3.3);
    this.camera.lookAt(-1.0, 0.95, 0.0);
  }
}
void setBtnText;
