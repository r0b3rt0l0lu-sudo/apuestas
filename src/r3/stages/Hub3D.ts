import * as THREE from 'three';
import { sfx } from '../../audio/sfx';
import { GAMES, type Game, TABLES, canPlay, minBet } from '../../core/economy';
import { session } from '../../core/session';
import { quotaMet } from '../../core/state';
import { T } from '../../i18n/es';
import { drawWheel } from '../../art/wheel';
import { Cobrador3D } from '../cobrador3d';
import { engine } from '../engine';
import { bulbString, carousel, ferris, ground, lam, lampPost, mesh, rouletteTable, sky, slotMachine, tent, box, cyl } from '../models';
import { Stage } from '../stage';
import { canvasTex } from '../tex';
import { ease } from '../tween';
import { HudDom } from '../../ui/dom/hud';
import { attachNav, btn, el } from '../../ui/dom/kit';
import { openOptions } from '../../ui/dom/options';
import { Typewriter } from '../../ui/dom/typewriter';
import { goPhase, goTable } from '../router';

/** Pasillo de la feria: tres atracciones y El Cobrador al fondo, entre la niebla. */
export class Hub3D extends Stage {
  readonly kind = 'hub';
  private cobrador!: Cobrador3D;
  private fer!: ReturnType<typeof ferris>;
  private spinC!: THREE.Group;
  private bulbsA!: ReturnType<typeof bulbString>;
  private lamps: THREE.PointLight[] = [];
  private hud!: HudDom;
  private tw!: Typewriter;
  private locked = false;
  private waiting: (() => void) | null = null;
  private row!: HTMLElement;
  private detach: () => void = () => undefined;
  private entering = false;

  init(): void {
    const r = session.run;
    if (r.phase !== 'hub' && r.phase !== 'playing') { goPhase(); return; }
    if (r.phase === 'playing') session.dispatch({ type: 'leaveTable' });
    this.light(560, 380, 1100, 0.4);
    sfx.ambience('hub');
    const sc = this.scene;
    sc.background = new THREE.Color(0x000000);
    sc.fog = new THREE.Fog(0x14041c, 9, 48);
    sc.add(new THREE.AmbientLight(0x3a2848, 1.6));
    sc.add(sky());
    const gr = ground(60, 90);
    gr.position.z = -25;
    sc.add(gr);

    // farolas y guirnaldas
    ([[-7.5, 1], [7.5, -1], [-3, -10], [4, -12]] as const).forEach(([x, z]) => {
      const l = lampPost(0xe8b868, 16, 20);
      l.group.position.set(x, 0, z);
      sc.add(l.group);
      this.lamps.push(l.light);
    });
    this.bulbsA = bulbString(new THREE.Vector3(-7.5, 4.7, 1), new THREE.Vector3(7.5, 4.7, -1), 18, 1.5);
    sc.add(this.bulbsA.group);

    // fondo: carpas, noria y el Cobrador
    ([[0x7a1428, 0xb08a46, -9, -16], [0x0e4a46, 0x8a6a34, 8, -18], [0x7a1428, 0xb08a46, -16, -24], [0x7a1428, 0xb08a46, 18, -26]] as const)
      .forEach(([a, b, x, z], i) => { const t = tent(a, b, 3.4 + (i % 2), 1.6, 2.8, i); t.position.set(x, 0, z); sc.add(t); });
    this.fer = ferris(7);
    this.fer.group.position.set(13, 0, -30);
    sc.add(this.fer.group);
    this.cobrador = new Cobrador3D(0.075).anchor(-0.5, 4.4, -15);
    this.cobrador.setMood(r.actionsLeft <= 3 && !quotaMet(r) ? 'cobra' : 'acecho');
    sc.add(this.cobrador);
    const aura = new THREE.PointLight(0x9c3c28, 22, 22, 1.5);
    aura.position.set(-0.5, 4, -12);
    sc.add(aura);

    // atracciones: se pueden pulsar
    const slot = slotMachine();
    slot.group.position.set(-4.3, 0, -1);
    slot.group.rotation.y = 0.45;
    slot.group.scale.setScalar(1.15);
    sc.add(slot.group);
    const wheelTex = canvasTex(drawWheel([0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]).canvas);
    const rt = rouletteTable(wheelTex);
    rt.group.position.set(0.4, 0, -4.4);
    sc.add(rt.group);
    const car = carousel(2.4);
    car.group.position.set(5.6, 0, -4.2);
    car.group.scale.setScalar(0.85);
    sc.add(car.group);
    this.spinC = car.spin;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      cyl(0.04, 0.04, 2.6, lam(0xc4a050), Math.cos(a) * 1.7, 1.7, Math.sin(a) * 1.7, car.spin, 6);
      box(0.7, 0.45, 0.25, lam(0x948068), Math.cos(a) * 1.7, 1.4 + (i % 2) * 0.3, Math.sin(a) * 1.7, car.spin).rotation.y = -a;
    }
    const spot = new THREE.SpotLight(0xe8b868, 40, 22, 0.7, 0.5, 1.4);
    spot.position.set(0, 7, 4);
    spot.target.position.set(0, 0.5, -4);
    sc.add(spot, spot.target);

    const where: Record<Game, { obj: THREE.Object3D; cam: THREE.Vector3; look: THREE.Vector3 }> = {
      slots: { obj: slot.group, cam: new THREE.Vector3(-2.6, 1.9, 2.4), look: new THREE.Vector3(-4.3, 1.6, -1) },
      roulette: { obj: rt.group, cam: new THREE.Vector3(0.4, 3.2, -0.6), look: new THREE.Vector3(0.4, 1, -4.4) },
      race: { obj: car.group, cam: new THREE.Vector3(4.2, 2.2, 0.2), look: new THREE.Vector3(5.6, 2, -4.2) }
    };
    GAMES.forEach((g) => this.click(where[g].obj, () => void this.enter(g, where[g].cam, where[g].look), { enabled: () => !this.locked && !this.entering && canPlay(g, session.run.balance, session.run.actionsLeft) }));

    this.camera.position.set(0, 1.7, 7.5);
    this.camera.lookAt(0, 0.9, -6);
    const mx = new THREE.Vector3();
    this.camLook = new THREE.Vector3(0, 0.9, -6);
    void mx;

    // interfaz
    this.hud = new HudDom(this.ui);
    const dlg = el('div', 'dlg frame dialog hit', '', this.ui);
    const dtxt = el('div', '', '', dlg);
    this.tw = new Typewriter(dtxt);
    this.row = el('div', 'row hit', '', this.ui);
    Object.assign(this.row.style, { position: 'absolute', left: '0', right: '0', bottom: '166px', gap: '14px' });
    this.buildButtons();
    const opts = btn(this.ui, T.options, () => openOptions(this.ui), { cls: 'small', style: { position: 'absolute', left: '16px', top: '100px' } });
    opts.classList.add('hit');
    this.detach = attachNav(this.ui, () => openOptions(this.ui));
    const advance = () => { if (!this.tw.skip()) this.waiting?.(); };
    this.ui.addEventListener('pointerdown', advance);
    window.addEventListener('keydown', this.keyAdv = (e) => { if (this.locked && (e.key === 'Enter' || e.key === ' ')) advance(); });
    this.run(() => this.intro());
  }

  private keyAdv: (e: KeyboardEvent) => void = () => undefined;
  private camLook = new THREE.Vector3();

  private buildButtons(): void {
    const r = session.run;
    this.row.textContent = '';
    GAMES.forEach((g, i) => {
      const ok = canPlay(g, r.balance, r.actionsLeft) && !this.locked;
      const b = btn(this.row, T.hub[g], () => void this.enter(g), { cls: 'big', hotkey: String(i + 1), sub: canPlay(g, r.balance, r.actionsLeft) ? T.hub.cost(TABLES[g].cost, minBet(g)) : T.hub.unavailable, style: { width: '330px', minHeight: '104px' } });
      b.disabled = !ok;
    });
    if (quotaMet(r)) {
      const s = btn(this.row, T.hub.sleep, () => this.sleep(), { cls: 'big', hotkey: 'e', style: { width: '330px', minHeight: '104px' } });
      s.disabled = this.locked;
    }
    queueMicrotask(() => (this.row.querySelector('button:not(:disabled)') as HTMLElement | null)?.focus());
  }

  private async intro(): Promise<void> {
    const r = session.run;
    const key = `intro-${r.night}`;
    if (r.flags[key]) { await this.tw.say(quotaMet(r) ? T.hub.quotaMet : T.night.intro(r.night), true); return; }
    this.locked = true;
    this.buildButtons();
    session.dispatch({ type: 'flag', key });
    const adv = () => new Promise<void>((res) => { this.waiting = () => { this.waiting = null; res(); }; });
    if (r.night === 1 && !r.flags.tutorial) {
      for (const line of T.tutorial) { await this.tw.say(line, true); await adv(); }
      session.dispatch({ type: 'flag', key: 'tutorial' });
    }
    await this.tw.say(T.night.intro(r.night), true);
    const curse = T.night.curseLine(r.night);
    if (curse) { await adv(); this.cobrador.setMood('sonrisa'); await this.tw.say(`«${curse}»`, true); }
    this.locked = false;
    this.buildButtons();
  }

  private async enter(g: Game, cam?: THREE.Vector3, look?: THREE.Vector3): Promise<void> {
    if (this.locked || this.entering) return;
    this.entering = true;
    session.dispatch({ type: 'enterTable' });
    const c0 = this.camera.position.clone(), l0 = this.camLook.clone();
    const c1 = cam ?? c0.clone().add(new THREE.Vector3(0, 0, -3)), l1 = look ?? l0;
    this.run(async () => { await this.tweens.tween(650, (k) => { this.camera.position.lerpVectors(c0, c1, k); this.camLook.lerpVectors(l0, l1, k); this.camera.lookAt(this.camLook); }, ease.inOutCubic); });
    this.tweens.wait(300).then(() => goTable(g)).catch(() => undefined);
  }

  private sleep(): void {
    if (this.locked) return;
    session.dispatch({ type: 'sleep' });
    goPhase();
  }

  update(dt: number, t: number): void {
    this.fer.update(dt);
    this.spinC.rotation.y += dt * 0.35;
    this.bulbsA.update(t);
    this.lamps.forEach((l, i) => { l.intensity = 16 * (1 - 0.12 * Math.max(0, Math.sin(t * 9 + i * 3) - 0.8) * 5); });
    // la mirada del Cobrador sigue al puntero y la cámara respira
    const p = engine.pointer;
    this.cobrador.setGaze((p.x - 640) / 500, (p.y - 300) / 300);
    this.cobrador.update(dt);
    if (!this.entering) {
      this.camera.position.set(Math.sin(t * 0.25) * 0.12 + (p.x - 640) / 640 * 0.35, 1.7 + Math.sin(t * 0.6) * 0.03, 7.5);
      this.camLook.set((p.x - 640) / 640 * 0.6, 0.9 - (p.y - 400) / 400 * 0.25, -6);
      this.camera.lookAt(this.camLook);
    }
  }

  dispose(): void {
    this.detach();
    this.hud?.dispose();
    this.tw?.stop();
    window.removeEventListener('keydown', this.keyAdv);
    super.dispose();
  }
}

void mesh;
