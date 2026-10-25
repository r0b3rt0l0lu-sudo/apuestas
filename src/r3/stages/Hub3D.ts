import * as THREE from 'three';
import { sfx } from '../../audio/sfx';
import { drawWheel } from '../../art/wheel';
import { brickTex, curtainTex, woodTex } from '../../art/tex3d';
import { GAMES, type Game, TABLES, canPlay, minBet } from '../../core/economy';
import { session } from '../../core/session';
import { quotaMet } from '../../core/state';
import { T } from '../../i18n/es';
import { HudDom } from '../../ui/dom/hud';
import { btn, el } from '../../ui/dom/kit';
import { openOptions } from '../../ui/dom/options';
import { Typewriter } from '../../ui/dom/typewriter';
import { Cigarette } from '../cigarette';
import { Cobrador3D } from '../cobrador3d';
import { engine } from '../engine';
import { bulbString, box, carousel, cyl, glow, lam, mesh, reelDrum, rouletteTable, slotMachine } from '../models';
import { goPhase, goTable } from '../router';
import { Stage } from '../stage';
import { stripTexture } from '../strip';
import { canvasTex, tex } from '../tex';
import { ease } from '../tween';

const HALF_X = 6.8;
const Z_MIN = -8.6;
const Z_MAX = 6.6;
const RADIUS = 0.35;
const REACH = 2.6;
const EYE = 1.65;

interface Solid { x: number; z: number; hx: number; hz: number }
interface Station { game: Game; solid: Solid; cam: THREE.Vector3; look: THREE.Vector3 }

const game3dHeight = (g: Game): number => (g === 'slots' ? 3.4 : g === 'roulette' ? 2.4 : 4.6);

/** Última posición en la sala, para volver donde estabas al salir de una mesa. */
let saved: { night: number; x: number; z: number; yaw: number; pitch: number } | null = null;

/** Sala de la feria en primera persona: caminas entre las tres mesas y El Cobrador te mira desde el fondo. */
export class Hub3D extends Stage {
  readonly kind = 'hub';
  private cobrador!: Cobrador3D;
  private spinC!: THREE.Group;
  private horses: THREE.Group[] = [];
  private bulbsA!: ReturnType<typeof bulbString>;
  private lamps: THREE.PointLight[] = [];
  private hud!: HudDom;
  private tw!: Typewriter;
  private locked = false;
  private entering = false;
  private waiting: (() => void) | null = null;
  private prompt!: HTMLElement;
  private sleepBtn: HTMLButtonElement | null = null;
  private labels: Array<{ el: HTMLElement; s: Station }> = [];
  private cig!: Cigarette;
  private stations: Station[] = [];
  private solids: Solid[] = [];
  private keys = new Set<string>();
  private yaw = 0;
  private pitch = 0;
  private pos = new THREE.Vector3(0, EYE, 5);
  private near: Station | null = null;
  private walked = 0;
  private listeners: Array<[string, EventListener, EventTarget]> = [];

  init(): void {
    const r = session.run;
    if (r.phase !== 'hub' && r.phase !== 'playing') { goPhase(); return; }
    if (r.phase === 'playing') session.dispatch({ type: 'leaveTable' });
    this.light(640, 400, 1250, 0.5);
    sfx.ambience('hub');
    this.camera.rotation.order = 'YXZ';
    const sc = this.scene;
    sc.background = new THREE.Color(0x000000);
    sc.fog = new THREE.Fog(0x14041c, 7, 24);
    sc.add(new THREE.AmbientLight(0x4a3858, 1.9));
    this.buildRoom();
    this.buildStations();
    this.buildCobrador();

    if (saved && saved.night === r.night) {
      this.pos.set(saved.x, EYE, saved.z);
      this.yaw = saved.yaw;
      this.pitch = saved.pitch;
    }
    this.applyCamera();
    this.scene.add(this.camera);
    this.cig = new Cigarette(this.scene, this.camera);
    this.cig.onFinished = (n) => { const l = T.hub.smoke[(n - 1) % T.hub.smoke.length]; if (l && !this.locked) void this.tw.say(l, true); };

    // interfaz
    this.hud = new HudDom(this.ui);
    const dlg = el('div', 'dlg frame dialog hit', '', this.ui);
    this.tw = new Typewriter(el('div', '', '', dlg));
    this.prompt = el('div', 'frame hit', '', this.ui);
    Object.assign(this.prompt.style, { position: 'absolute', left: '50%', bottom: '176px', transform: 'translateX(-50%)', padding: '12px 28px', fontSize: '30px', textAlign: 'center', display: 'none', cursor: 'pointer' });
    this.prompt.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.interact(); });
    const hint = el('div', '', T.hub.controls, this.ui);
    Object.assign(hint.style, { position: 'absolute', left: '0', right: '0', top: '92px', textAlign: 'center', fontSize: '22px', color: '#9c9278', textShadow: '2px 2px 0 #000' });
    const opts = btn(this.ui, T.options, () => openOptions(this.ui), { cls: 'small', style: { position: 'absolute', left: '16px', top: '100px' } });
    opts.classList.add('hit');
    this.buildSleep();
    this.stations.forEach((s) => {
      const l = el('div', '', T.hub[s.game], this.ui);
      Object.assign(l.style, { position: 'absolute', transform: 'translate(-50%,-50%)', fontFamily: "'Special Elite', serif", fontSize: '32px', color: '#ece0c0', textShadow: '2px 2px 0 #000, -2px 2px 0 #000, 0 0 14px #c24a3a', whiteSpace: 'nowrap', pointerEvents: 'none', display: 'none' });
      this.labels.push({ el: l, s });
    });
    this.bind();
    this.run(() => this.intro());
  }

  // ---------- construcción de la sala ----------

  private buildRoom(): void {
    const sc = this.scene;
    const w = HALF_X * 2, d = Z_MAX - Z_MIN, h = 4.8, cz = (Z_MAX + Z_MIN) / 2;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam(0xffffff, tex('hub-floor', () => woodTex('#2a1a12'), [7, 8])));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, cz);
    sc.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam(0x0c060c));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, h, cz);
    sc.add(ceil);
    const wall = (ww: number, x: number, z: number, ry: number): THREE.Mesh => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ww, h), lam(0xffffff, tex(`hub-brick-${Math.round(ww)}`, () => brickTex('#3a1018'), [ww / 2, 2])));
      m.position.set(x, h / 2, z);
      m.rotation.y = ry;
      sc.add(m);
      return m;
    };
    wall(w, 0, Z_MIN, 0);
    wall(w, 0, Z_MAX, Math.PI);
    wall(d, -HALF_X, cz, Math.PI / 2);
    wall(d, HALF_X, cz, -Math.PI / 2);
    // cortina tras El Cobrador y alfombra
    const cur = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.2), lam(0xffffff, tex('hub-curtain', () => curtainTex('#8a1e28'), [4, 1])));
    cur.position.set(0, 2.3, Z_MIN + 0.05);
    sc.add(cur);
    box(3.4, 0.03, 9, lam(0x3a0f14), 0, 0.02, -1.5, sc);
    // vigas y guirnaldas de bombillas
    [-4.5, 0, 4.5].forEach((z) => box(w, 0.3, 0.3, lam(0x1c100c), 0, h - 0.15, z, sc));
    this.bulbsA = bulbString(new THREE.Vector3(-HALF_X + 0.3, 4.2, 1.5), new THREE.Vector3(HALF_X - 0.3, 4.2, 1.5), 16, 0.5);
    sc.add(this.bulbsA.group);
    // lámparas colgantes
    ([[-3.6, 1.5], [3.6, 1.5], [0, -3.2]] as const).forEach(([x, z]) => {
      cyl(0.02, 0.02, 1.0, lam(0x1c100c), x, h - 0.5, z, sc, 4);
      mesh(new THREE.ConeGeometry(0.4, 0.3, 8, 1, true), lam(0x2a1a12, null, { side: THREE.DoubleSide }), x, h - 1.1, z, sc);
      mesh(new THREE.SphereGeometry(0.1, 8, 6), glow(0xf0d890), x, h - 1.2, z, sc);
      const l = new THREE.PointLight(0xe8b868, 20, 11, 1.5);
      l.position.set(x, h - 1.4, z);
      sc.add(l);
      this.lamps.push(l);
    });
    this.solids.push({ x: 0, z: -7.5, hx: 2.4, hz: 0.8 });
    box(4.4, 1.05, 1.3, lam(0x5a3a22, tex('hub-desk', () => woodTex('#5a3a22'), [3, 1])), 0, 0.52, -7.5, sc);
    box(4.5, 0.08, 1.4, lam(0x2a3a1c), 0, 1.07, -7.5, sc);
    // cuatro columnas
    ([[-6.2, -5.5], [6.2, -5.5], [-6.2, 4.5], [6.2, 4.5]] as const).forEach(([x, z]) => {
      cyl(0.3, 0.34, h, lam(0x3a2418, tex('hub-wood-col', () => woodTex('#3a2418'), [1, 3])), x, h / 2, z, sc, 8);
      this.solids.push({ x, z, hx: 0.34, hz: 0.34 });
    });
  }

  private buildStations(): void {
    const sc = this.scene;
    // tragaperras contra la pared izquierda, mirando al centro
    const slot = slotMachine();
    slot.group.position.set(-5.9, 0, 1.0);
    slot.group.rotation.y = Math.PI / 2;
    slot.group.scale.setScalar(1.3);
    sc.add(slot.group);
    const strip = stripTexture();
    slot.reelAnchors.forEach((a, i) => { const d = reelDrum(strip, 0.36, 0.4); d.rotation.x = Math.PI / 3 * (i * 2 + 0.5); a.add(d); });
    const sSolid = { x: -5.9, z: 1.0, hx: 1.2, hz: 1.3 };
    // ruleta
    const wheelTex = canvasTex(drawWheel([0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]).canvas);
    const rt = rouletteTable(wheelTex);
    rt.group.position.set(-1.1, 0, -4.0);
    sc.add(rt.group);
    const rSolid = { x: -1.1, z: -4.0, hx: 2.4, hz: 1.6 };
    // tiovivo con sus caballitos
    const car = carousel(2.4);
    car.group.position.set(4.4, 0, -3.4);
    car.group.scale.setScalar(0.8);
    sc.add(car.group);
    this.spinC = car.spin;
    const coats = [0xbfb8a8, 0xa0603a, 0xe8e0c8, 0x3a302a, 0x5e7a72, 0x2e2834];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      cyl(0.04, 0.04, 3.0, lam(0xc4a050), Math.cos(a) * 1.55, 1.9, Math.sin(a) * 1.55, car.spin, 6);
      const hs = this.horse(coats[i] ?? 0xbfb8a8);
      hs.position.set(Math.cos(a) * 1.55, 1.3, Math.sin(a) * 1.55);
      hs.rotation.y = -a - Math.PI / 2;
      hs.userData.base = 1.3;
      car.spin.add(hs);
      this.horses.push(hs);
    }
    const cSolid = { x: 4.4, z: -3.4, hx: 2.05, hz: 2.05 };
    this.solids.push(sSolid, rSolid, cSolid);
    this.stations = [
      { game: 'slots', solid: sSolid, cam: new THREE.Vector3(-3.6, 1.75, 1.0), look: new THREE.Vector3(-5.9, 1.6, 1.0) },
      { game: 'roulette', solid: rSolid, cam: new THREE.Vector3(-1.6, 2.7, -1.3), look: new THREE.Vector3(-2.1, 1, -4.0) },
      { game: 'race', solid: cSolid, cam: new THREE.Vector3(4.4, 2.0, -0.3), look: new THREE.Vector3(4.4, 1.7, -3.4) }
    ];
    const spot = new THREE.PointLight(0xe8b868, 14, 9, 1.5);
    spot.position.set(-1.1, 3.4, -3.1);
    sc.add(spot);
    this.stations.forEach((s, i) => {
      const obj = [slot.group, rt.group, car.group][i] ?? slot.group;
      this.click(obj, () => { if (this.near === s) this.interact(); }, { enabled: () => !this.entering && this.near === s });
    });
  }

  /** Caballito de tiovivo hecho con cajas, de cara a +x. */
  private horse(coat: number): THREE.Group {
    const g = new THREE.Group();
    const m = lam(coat), dark = lam(0x1c100c), gold = lam(0xc4a050), red = lam(0x7a1428);
    box(0.95, 0.42, 0.34, m, 0, 0, 0, g);
    box(0.34, 0.6, 0.26, m, 0.5, 0.3, 0, g).rotation.z = -0.35;
    box(0.5, 0.22, 0.22, m, 0.78, 0.62, 0, g);
    box(0.08, 0.5, 0.1, dark, 0.34, 0.48, 0, g).rotation.z = 0.3;
    box(0.5, 0.06, 0.4, red, -0.05, 0.25, 0, g);
    box(0.08, 0.08, 0.08, glow(0xe0503c), 0.9, 0.7, 0.12, g);
    ([[0.32, 0.12], [0.32, -0.12], [-0.32, 0.12], [-0.32, -0.12]] as const).forEach(([x, z]) => { box(0.1, 0.4, 0.1, m, x, -0.35, z, g).rotation.z = x > 0 ? 0.4 : -0.3; });
    box(0.1, 0.1, 0.1, gold, -0.5, 0.1, 0, g);
    return g;
  }

  private buildCobrador(): void {
    this.cobrador = new Cobrador3D(0.04).anchor(0, 2.55, -7.9);
    this.cobrador.setMood(session.run.actionsLeft <= 3 && !quotaMet(session.run) ? 'cobra' : 'acecho');
    this.scene.add(this.cobrador);
    const aura = new THREE.PointLight(0x9c3c28, 16, 9, 1.5);
    aura.position.set(0, 3.2, -6.4);
    this.scene.add(aura);
  }

  private buildSleep(): void {
    if (!quotaMet(session.run)) return;
    this.sleepBtn = btn(this.ui, T.hub.sleep, () => this.sleep(), { cls: 'small', hotkey: 'z', style: { position: 'absolute', right: '16px', top: '100px' } });
    this.sleepBtn.classList.add('hit');
  }

  // ---------- entrada y movimiento ----------

  private on(target: EventTarget, type: string, fn: EventListener): void {
    target.addEventListener(type, fn);
    this.listeners.push([type, fn, target]);
  }

  private bind(): void {
    const look = (dx: number, dy: number): void => {
      this.yaw -= dx * 0.0035;
      this.pitch = Math.max(-0.7, Math.min(0.7, this.pitch - dy * 0.0035));
    };
    this.on(window, 'pointermove', ((e: PointerEvent) => {
      if (this.entering) return;
      if (document.pointerLockElement === engine.canvas) look(e.movementX, e.movementY);
      else if ((e.buttons & 1) && e.target === engine.canvas) look(e.movementX, e.movementY);
    }) as EventListener);
    // un clic en la sala captura el ratón (Esc lo suelta); si el navegador no lo permite, se mira arrastrando
    this.on(engine.canvas, 'pointerdown', (() => {
      if (this.entering || document.pointerLockElement === engine.canvas) return;
      try { void (engine.canvas.requestPointerLock() as Promise<void> | undefined)?.catch(() => undefined); } catch { /* sin bloqueo de puntero */ }
    }) as EventListener);
    this.on(window, 'keydown', ((e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'escape') { if (!document.pointerLockElement) openOptions(this.ui); return; }
      const onBtn = e.target instanceof HTMLButtonElement;
      if (onBtn && (k === 'enter' || k === ' ')) return;
      if (k === 'enter' || k === ' ') { e.preventDefault(); if (this.locked) this.advance(); else this.interact(); return; }
      if (k === 'z' && this.sleepBtn && !this.sleepBtn.disabled) { this.sleepBtn.click(); return; }
      if (k === 'e') { if (!e.repeat) this.smoke(); return; }
      if (k === 'f') { e.preventDefault(); this.interact(); return; }
      const idx = ['1', '2', '3'].indexOf(k);
      if (idx >= 0) { const g = GAMES[idx]; if (g) void this.enter(g); return; }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { this.keys.add(k); e.preventDefault(); }
    }) as EventListener);
    this.on(window, 'keyup', ((e: KeyboardEvent) => { this.keys.delete(e.key.toLowerCase()); }) as EventListener);
    this.on(window, 'blur', () => this.keys.clear());
    this.on(this.ui, 'pointerdown', () => { if (!this.tw.skip()) this.waiting?.(); });
  }

  private smoke(): void {
    if (!this.entering) this.cig.press();
  }

  private advance(): void {
    if (!this.tw.skip()) this.waiting?.();
  }

  private applyCamera(): void {
    this.camera.position.copy(this.pos);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  private stationDist(s: Station): number {
    const dx = Math.max(Math.abs(this.pos.x - s.solid.x) - s.solid.hx, 0);
    const dz = Math.max(Math.abs(this.pos.z - s.solid.z) - s.solid.hz, 0);
    return Math.hypot(dx, dz);
  }

  private walk(dt: number): void {
    const k = this.keys;
    const turn = (k.has('arrowleft') ? 1 : 0) - (k.has('arrowright') ? 1 : 0);
    this.yaw += turn * 1.9 * dt;
    const fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    const str = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0);
    if (!fwd && !str) return;
    const len = Math.hypot(fwd, str);
    const sp = 3.3 * dt / len;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const dx = (-sin * fwd + cos * str) * sp;
    const dz = (-cos * fwd - sin * str) * sp;
    this.tryMove(dx, 0);
    this.tryMove(0, dz);
    this.walked += Math.hypot(dx, dz);
  }

  private tryMove(dx: number, dz: number): void {
    const x = Math.max(-HALF_X + RADIUS, Math.min(HALF_X - RADIUS, this.pos.x + dx));
    const z = Math.max(Z_MIN + RADIUS, Math.min(Z_MAX - RADIUS, this.pos.z + dz));
    const hit = this.solids.some((s) => Math.abs(x - s.x) < s.hx + RADIUS && Math.abs(z - s.z) < s.hz + RADIUS);
    if (!hit) { this.pos.x = x; this.pos.z = z; }
  }

  private updateNear(): void {
    let best: Station | null = null, bd = REACH;
    for (const s of this.stations) { const d = this.stationDist(s); if (d < bd) { bd = d; best = s; } }
    this.near = best;
    if (!best || this.entering) { this.prompt.style.display = 'none'; return; }
    const r = session.run, g = best.game;
    const ok = canPlay(g, r.balance, r.actionsLeft);
    this.prompt.style.display = 'block';
    this.prompt.style.opacity = ok ? '1' : '0.6';
    this.prompt.textContent = `${T.hub.use(T.hub[g])} · ${ok ? T.hub.cost(TABLES[g].cost, minBet(g)) : T.hub.unavailable}`;
  }

  private interact(): void {
    if (this.near && !this.entering) void this.enter(this.near.game);
  }

  // ---------- flujo ----------

  private async intro(): Promise<void> {
    const r = session.run;
    const key = `intro-${r.night}`;
    if (r.flags[key]) { await this.tw.say(quotaMet(r) ? T.hub.quotaMet : T.night.intro(r.night), true); return; }
    // el diálogo avanza solo (Intro lo acelera) y nunca impide moverse ni entrar en una mesa
    this.locked = true;
    session.dispatch({ type: 'flag', key });
    const adv = () => new Promise<void>((res) => {
      const timer = window.setTimeout(() => { this.waiting = null; res(); }, 2600);
      this.waiting = () => { window.clearTimeout(timer); this.waiting = null; res(); };
    });
    if (r.night === 1 && !r.flags.tutorial) {
      session.dispatch({ type: 'flag', key: 'tutorial' });
      for (const line of T.tutorial) { await this.tw.say(line, true); await adv(); }
    }
    await this.tw.say(T.night.intro(r.night), true);
    const curse = T.night.curseLine(r.night);
    if (curse) { await adv(); this.cobrador.setMood('sonrisa'); await this.tw.say(`«${curse}»`, true); }
    this.locked = false;
  }

  private async enter(g: Game): Promise<void> {
    const r = session.run;
    if (this.entering || !canPlay(g, r.balance, r.actionsLeft)) return;
    const s = this.stations.find((x) => x.game === g);
    if (!s) return;
    this.entering = true;
    this.prompt.style.display = 'none';
    this.cig.hide();
    saved = { night: r.night, x: this.pos.x, z: this.pos.z, yaw: this.yaw, pitch: this.pitch };
    session.dispatch({ type: 'enterTable' });
    const c0 = this.pos.clone();
    const l0 = c0.clone().add(new THREE.Vector3(-Math.sin(this.yaw) * 5, Math.sin(this.pitch) * 5, -Math.cos(this.yaw) * 5));
    const look = new THREE.Vector3();
    this.run(async () => {
      await this.tweens.tween(750, (k) => {
        this.camera.position.lerpVectors(c0, s.cam, k);
        look.lerpVectors(l0, s.look, k);
        this.camera.lookAt(look);
      }, ease.inOutCubic);
      goTable(g);
    });
  }

  private sleep(): void {
    if (this.locked || this.entering) return;
    session.dispatch({ type: 'sleep' });
    goPhase();
  }

  update(dt: number, t: number): void {
    this.spinC.rotation.y += dt * 0.4;
    this.horses.forEach((h, i) => { h.position.y = (h.userData.base as number) + Math.sin(t * 2.2 + i * 1.7) * 0.22; });
    this.bulbsA.update(t);
    this.lamps.forEach((l, i) => { l.intensity = 20 * (1 - 0.15 * Math.max(0, Math.sin(t * 9 + i * 3) - 0.8) * 5); });
    const p = engine.pointer;
    this.cobrador.setGaze((p.x - 640) / 500, (p.y - 300) / 300);
    this.cobrador.update(dt);
    this.tickCig(dt, t);
    if (this.entering) return;
    this.walk(dt);
    this.pos.y = EYE + Math.sin(this.walked * 5) * 0.035;
    this.applyCamera();
    this.updateNear();
    this.placeLabels();
  }

  private placeLabels(): void {
    const v = new THREE.Vector3();
    for (const { el: l, s } of this.labels) {
      v.set(s.solid.x, game3dHeight(s.game), s.solid.z);
      const d = v.distanceTo(this.pos);
      v.project(this.camera);
      const vis = v.z < 1 && Math.abs(v.x) < 1.1 && d < 11 && !this.entering;
      l.style.display = vis ? 'block' : 'none';
      if (!vis) continue;
      l.style.left = `${(v.x * 0.5 + 0.5) * 1280}px`;
      l.style.top = `${(-v.y * 0.5 + 0.5) * 800}px`;
      l.style.opacity = this.near === s ? '1' : String(Math.max(0.8, 1 - d / 20));
    }
  }

  private tickCig(dt: number, t: number): void {
    this.cig.update(dt, t);
  }

  dispose(): void {
    if (!this.entering) saved = { night: session.run.night, x: this.pos.x, z: this.pos.z, yaw: this.yaw, pitch: this.pitch };
    this.listeners.forEach(([t, fn, target]) => target.removeEventListener(t, fn));
    this.cig?.dispose();
    if (document.pointerLockElement) document.exitPointerLock();
    this.hud?.dispose();
    this.tw?.stop();
    super.dispose();
  }
}
