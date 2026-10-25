import * as THREE from 'three';
import { drawCandle } from '../../art/props';
import { sfx } from '../../audio/sfx';
import { cursesFor } from '../../core/nights';
import { quotaOfRun, session } from '../../core/session';
import { rngOf } from '../../core/state';
import { SYMBOLS, TRIPLE_PAY, type SlotSymbol, moodAfter, spin, stopTimes } from '../../games/slots';
import { T, fmt } from '../../i18n/es';
import { phraseFor } from '../phrases';
import { btn, el } from '../../ui/dom/kit';
import { Cobrador3D } from '../cobrador3d';
import { Fx3D } from '../fx3d';
import { engine } from '../engine';
import { box, glow, lam, mesh, reelDrum, slotMachine, textures } from '../models';
import { ease } from '../tween';
import { stripTexture, symPainter } from '../strip';
import { TableStage } from './TableStage';

const FACE = Math.PI / 3; // seis símbolos por tambor
/** Tragaperras en 3D: mueble lacado, tambores que giran, palanca y bombillas. */
export class Slots3D extends TableStage {
  readonly kind = 'slots';
  private cob!: Cobrador3D;
  private drums: THREE.Mesh[] = [];
  private lever!: THREE.Group;
  private bulbs!: THREE.Mesh[];
  private fx!: Fx3D;
  private result!: HTMLElement;
  private pull!: HTMLButtonElement;
  private angles = [0, 0, 0];
  private center: SlotSymbol[] = ['ojo', 'polilla', 'calavera'];
  private glowT = 0;
  private sconces: THREE.PointLight[] = [];

  constructor() { super('slots', 'slots'); }

  protected build(): void {
    this.light(640, 360, 980, 0.34);
    const sc = this.scene;
    sc.background = new THREE.Color(0);
    sc.fog = new THREE.Fog(0x120208, 6, 18);
    sc.add(new THREE.AmbientLight(0x4a2438, 1.2));
    this.fx = new Fx3D(sc);

    // caseta: suelo de tablas, papel pintado y cortinas
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), lam(0x6a4a3a, textures.wood('#4a2a1c', [8, 8])));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    sc.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), lam(0x7a3030, textures.curtain()));
    wall.position.set(0, 3.5, -2.2);
    sc.add(wall);
    for (const x of [-3.6, 3.6]) {
      const drape = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 6.6), lam(0xa03038, textures.curtain()));
      drape.position.set(x, 3.4, -2.1);
      sc.add(drape);
      const lampB = mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), glow(0xe8c070), x * 0.6, 2.9, -2.0, sc);
      lampB.castShadow = false;
      const pl = new THREE.PointLight(0xe8a050, 14, 9, 1.5);
      pl.position.set(x * 0.6, 2.8, -1.7);
      sc.add(pl);
      this.sconces.push(pl);
    }

    // máquina
    const m = slotMachine();
    m.group.scale.setScalar(1.45);
    m.group.position.set(0, 0, 0);
    sc.add(m.group);
    this.lever = m.lever;
    this.bulbs = m.bulbs;
    const strip = stripTexture();
    m.reelAnchors.forEach((a, i) => {
      const d = reelDrum(strip, 0.36, 0.4);
      d.rotation.x = FACE * (SYMBOLS.indexOf(this.center[i] as SlotSymbol) + 0.5);
      this.angles[i] = d.rotation.x;
      a.add(d);
      this.drums.push(d);
    });
    // línea de pago y sombras en las ventanas
    box(1.5 * 1.45, 0.02, 0.02, glow(0xb13e53), 0, 1.42 * 1.45, 0.62 * 1.45, sc);
    const key = new THREE.SpotLight(0xf0d8a0, 80, 14, 0.7, 0.6, 1.3);
    key.position.set(0, 5, 4.5);
    key.target.position.set(0, 2, 0);
    key.castShadow = true;
    sc.add(key, key.target);
    this.cob = new Cobrador3D(0.03).anchor(-3.3, 1.7, -0.6);
    sc.add(this.cob);

    this.camera.position.set(0, 2.5, 7.6);
    this.camera.lookAt(0, 1.7, 0);

    // interfaz: tabla de pagos y controles
    const pay = el('div', 'abs frame panel', '', this.ui);
    Object.assign(pay.style, { right: '8px', top: '100px', width: '190px', textAlign: 'center', padding: '4px 4px 8px', fontSize: '26px' });
    el('div', 'label', T.slots.paytable, pay);
    SYMBOLS.forEach((s) => {
      const r = el('div', '', '', pay);
      Object.assign(r.style, { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: '4px 0' });
      const im = el('img', '', '', r) as HTMLImageElement;
      im.src = symPainter(s).canvas.toDataURL();
      Object.assign(im.style, { width: '48px', height: '48px', imageRendering: 'pixelated' });
      el('span', 'txt', `×${TRIPLE_PAY[s]}`, r).style.color = '#ece0c0';
    });
    const two = el('div', 'label', T.slots.twoEyes, pay);
    two.style.fontSize = '22px';
    this.result = el('div', 'msg txt', '', this.ui);
    Object.assign(this.result.style, { top: '440px', fontSize: '52px', color: '#ece0c0' });

    const row = el('div', 'row', '', this.bar);
    this.betRow(row, 120);
    this.pull = btn(row, T.slots.pull, () => this.pullLever(), { cls: 'big', hotkey: 'space', style: { width: '380px', marginLeft: '24px' } });
    this.actions.push(this.pull);
    this.say(T.night.intro(session.run.night));
    this.click(m.lever, () => this.pullLever(), { enabled: () => !this.busy && this.affordable(), hover: () => undefined });
    queueMicrotask(() => this.pull.focus());
    void drawCandle;
  }

  private target(_i: number, s: SlotSymbol): number {
    return FACE * (SYMBOLS.indexOf(s) + 0.5);
  }

  private pullLever(): void {
    if (this.busy || !this.affordable()) return;
    const r = session.run, bet = this.bet;
    const rng = rngOf(r);
    const res = spin(rng, bet);
    this.hud.freeze(true);
    session.dispatch({ type: 'resolve', game: 'slots', bet, payout: res.payout, rng: rng.state });
    this.setBusy(true);
    this.result.textContent = '';
    sfx.lever();
    this.say('');
    const stops = stopTimes(cursesFor(r.night));
    this.run(async () => {
      // palanca: baja y vuelve a subir
      this.tweens.tween(180, (k) => { this.lever.rotation.x = k * 0.9; }, ease.outQuad).then(() => this.tweens.tween(260, (k) => { this.lever.rotation.x = 0.9 * (1 - k); }, ease.outBounce)).catch(() => undefined);
      this.fx.sparks(this.lever.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.2, 0.3)), 6, 0xc4b494, 2);
      let tension = false;
      const done = res.reels.map((s, i) => {
        const start = this.angles[i] as number;
        const base = this.target(i, s);
        const delta = (base - (start % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const turns = 5 + i * 2;
        const total = delta + Math.PI * 2 * turns;
        let last = 0;
        return this.tweens.tween(stops[i] as number, (k) => {
          const a = start + total * k;
          this.angles[i] = a;
          this.drums[i]!.rotation.x = a;
          const face = Math.floor(a / FACE);
          if (face !== last) { last = face; sfx.reelTick(); }
        }, ease.outCubic).then(() => {
          sfx.reelStop();
          this.center[i] = s;
          this.fx.sparks(new THREE.Vector3((i - 1) * 0.72, 1.6, 0.9), 6, 0xc4b494, 2);
          // rebote al frenar
          this.tweens.tween(260, (k) => { this.drums[i]!.rotation.x = this.angles[i]! + 0.12 * Math.sin(k * Math.PI) * (1 - k); }).catch(() => undefined);
          if (i === 1 && res.reels[0] === s && !tension) { tension = true; engine.shake(0.05, 700); sfx.aim(); }
        });
      });
      await Promise.all(done);
      await this.tweens.wait(350);
      this.reveal(res.payout);
    });
  }

  private reveal(win: number): void {
    const bet = this.bet, r = session.run, lost = win === 0;
    this.result.textContent = lost ? '—' : `+${fmt(win)}`;
    this.cob.setMood(moodAfter(lost, r.actionsLeft, r.balance, quotaOfRun(r)));
    if (win > 0) {
      sfx.prize();
      this.fx.coins(new THREE.Vector3(0, 3.6, 0.8), Math.min(60, 12 + Math.round((win / bet) * 3)), 0.06);
      this.glowT = 2.4;
      engine.flash('#ece0c0', 0.35);
      if (win >= bet * 15) { this.fx.confetti(new THREE.Vector3(0, 4.8, 1), 60); this.cob.flinch(-1); }
    } else {
      sfx.lose();
      this.fx.smoke(new THREE.Vector3(0, 1.0, 1.1), 6, 0.7);
      this.cob.laugh();
    }
    this.say(phraseFor('slots', lost, r.actionsLeft, r.balance, quotaOfRun(r)));
    this.finishPlay();
  }

  protected onChange(): void { /* los botones de acción se gestionan en TableStage */ }

  update(dt: number, t: number): void {
    this.fx.update(dt);
    const p = engine.pointer;
    this.cob.setGaze((p.x - 400) / 420, (p.y - 420) / 260);
    this.cob.update(dt);
    this.glowT = Math.max(0, this.glowT - dt);
    this.bulbs.forEach((b, i) => { b.visible = this.glowT > 0 ? Math.floor(t * 9 + i) % 2 === 0 : (Math.floor(t * 3) + i) % 3 === 0; });
    this.sconces.forEach((l, i) => { l.intensity = 14 * (0.9 + 0.1 * Math.sin(t * 10 + i * 2) + (Math.sin(t * 3 + i) > 0.97 ? -0.25 : 0)); });
    this.camera.position.set(Math.sin(t * 0.2) * 0.15 + (p.x - 640) / 640 * 0.25, 2.5 + Math.sin(t * 0.5) * 0.03, 7.6);
    this.camera.lookAt(0, 1.7, 0);
    void lamA;
  }
}
const lamA = lam;
