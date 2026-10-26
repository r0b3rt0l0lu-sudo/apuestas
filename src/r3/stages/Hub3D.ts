import * as THREE from 'three';
import { sfx } from '../../audio/sfx';
import { drawWheel } from '../../art/wheel';
import { curtainTex, woodTex } from '../../art/tex3d';
import { GAMES, type Game, TABLES, canPlay, minBet } from '../../core/economy';
import { mortgageOffers, rankFor, tollFor } from '../../core/nights';
import { session } from '../../core/session';
import { canMortgage, quotaMet } from '../../core/state';
import { T } from '../../i18n/es';
import { HudDom } from '../../ui/dom/hud';
import { btn, el } from '../../ui/dom/kit';
import { openOptions } from '../../ui/dom/options';
import { showOverlay } from '../../ui/dom/overlay';
import { Typewriter } from '../../ui/dom/typewriter';
import { Cigarette } from '../cigarette';
import { CobradorWalker } from '../cobradorwalker';
import { FpsControls, type Solid } from '../fps';
import { HubWorld, type Spot } from '../hubworld';
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
const REACH = 2.6;
const EYE = 1.65;

type StationId = Game | 'mortgage';
interface Station { game: StationId; solid: Solid; cam: THREE.Vector3; look: THREE.Vector3; label: THREE.Vector3 }

/** Última posición en la sala, para volver donde estabas al salir de una mesa. */
let saved: { night: number; x: number; z: number; yaw: number; pitch: number } | null = null;

/** Sala de la feria en primera persona: caminas entre las tres mesas y El Cobrador te mira desde el fondo. */
export class Hub3D extends Stage {
  readonly kind = 'hub';
  private cobrador!: CobradorWalker;
  private lastPos = new THREE.Vector3();
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
  private fps!: FpsControls;
  private world!: HubWorld;
  private nearSpot: Spot | null = null;
  private caption!: HTMLElement;
  private room: string | null = null;
  private nextEvent = 25;
  private blackout = 0;
  private deskSolid: Solid = { x: 0, z: -7.5, hx: 2.4, hz: 0.8 };
  private near: Station | null = null;
  private listeners: Array<[string, EventListener, EventTarget]> = [];

  private get pos(): THREE.Vector3 { return this.fps.pos; }
  private get solids(): Solid[] { return this.fps.solids; }

  init(): void {
    const r = session.run;
    if (r.phase !== 'hub' && r.phase !== 'playing') { goPhase(); return; }
    if (r.phase === 'playing') session.dispatch({ type: 'leaveTable' });
    this.light(640, 400, 1250, 0.5);
    sfx.ambience('hub');
    this.fps = new FpsControls(this.camera, engine.canvas, { minX: -16.6, maxX: 17.2, minZ: -17.9, maxZ: 7.0 }, { eye: EYE, radius: 0.35, speed: 3.3 });
    this.fps.pos.set(0, EYE, 5);
    const sc = this.scene;
    sc.background = new THREE.Color(0x000000);
    sc.fog = new THREE.Fog(0x14041c, 7, 24);
    sc.add(new THREE.AmbientLight(0x4a3858, 1.9));
    this.buildRoom();
    this.buildStations();
    this.world = new HubWorld(this.scene, this.solids, (text, whisper) => { void this.tw.say(text, whisper); });
    this.world.build();
    this.buildCobrador();

    if (saved && saved.night === r.night) {
      this.pos.set(saved.x, EYE, saved.z);
      this.fps.yaw = saved.yaw;
      this.fps.pitch = saved.pitch;
    }
    this.fps.apply();
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
    this.caption = el('div', 'title abs center', '', this.ui);
    Object.assign(this.caption.style, { left: '0', right: '0', top: '150px', fontSize: '54px', color: '#ece0c0', opacity: '0', transition: 'opacity .8s', textShadow: '3px 3px 0 #000, 0 0 18px #c24a3a', pointerEvents: 'none' });
    this.buildSleep();
    this.stations.forEach((s) => {
      const l = el('div', '', s.game === 'mortgage' && session.run.mode === 'endless' ? T.endless.house : T.hub[s.game], this.ui);
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
    this.solids.push(this.deskSolid);
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
      { game: 'slots', solid: sSolid, cam: new THREE.Vector3(-3.6, 1.75, 1.0), look: new THREE.Vector3(-5.9, 1.6, 1.0), label: new THREE.Vector3(-5.9, 3.4, 1.0) },
      { game: 'roulette', solid: rSolid, cam: new THREE.Vector3(-1.6, 2.7, -1.3), look: new THREE.Vector3(-2.1, 1, -4.0), label: new THREE.Vector3(-1.1, 2.4, -4.0) },
      { game: 'race', solid: cSolid, cam: new THREE.Vector3(4.4, 2.0, -0.3), look: new THREE.Vector3(4.4, 1.7, -3.4), label: new THREE.Vector3(4.4, 4.6, -3.4) },
      { game: 'mortgage', solid: this.deskSolid, cam: new THREE.Vector3(0, 1.8, -5.0), look: new THREE.Vector3(0, 1.9, -7.5), label: new THREE.Vector3(0, 1.45, -6.7) }
    ];
    const spot = new THREE.PointLight(0xe8b868, 14, 9, 1.5);
    spot.position.set(-1.1, 3.4, -3.1);
    sc.add(spot);
    this.stations.forEach((s, i) => {
      const obj = [slot.group, rt.group, car.group][i];
      if (!obj) return;
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
    // arranca tras el mostrador y, cuando te mueves, sale a pasear por la sala con sus piernas
    this.cobrador = new CobradorWalker(this.solids, { minX: -6.2, maxX: 6.2, minZ: -8.0, maxZ: 6.0 });
    this.cobrador.position.set(0, 0, -7.9);
    this.cobrador.setMood(session.run.actionsLeft <= 3 && !quotaMet(session.run) ? 'cobra' : 'acecho');
    this.scene.add(this.cobrador);
    const aura = new THREE.PointLight(0x9c3c28, 16, 9, 1.5);
    aura.position.set(0, 3.2, 1.2);
    this.cobrador.add(aura);
    this.lastPos.copy(this.pos);
  }

  private buildSleep(): void {
    if (session.run.mode === 'endless' || !quotaMet(session.run)) return;
    this.sleepBtn = btn(this.ui, T.hub.sleep, () => this.sleep(), { cls: 'small', hotkey: 'z', style: { position: 'absolute', right: '16px', top: '100px' } });
    this.sleepBtn.classList.add('hit');
  }

  // ---------- entrada y movimiento ----------

  private on(target: EventTarget, type: string, fn: EventListener): void {
    target.addEventListener(type, fn);
    this.listeners.push([type, fn, target]);
  }

  private bind(): void {
    this.fps.bind();
    this.on(window, 'keydown', ((e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'escape') { if (!document.pointerLockElement && this.fps.enabled) openOptions(this.ui); return; }
      if (!this.fps.enabled) return;
      const onBtn = e.target instanceof HTMLButtonElement;
      if (onBtn && (k === 'enter' || k === ' ')) return;
      if (k === 'enter' || k === ' ') { e.preventDefault(); if (this.locked) this.advance(); else this.interact(); return; }
      if (k === 'z' && this.sleepBtn && !this.sleepBtn.disabled) { this.sleepBtn.click(); return; }
      if (k === 'e') { if (!e.repeat) this.smoke(); return; }
      if (k === 'f') { e.preventDefault(); this.interact(); return; }
      const idx = ['1', '2', '3', '4'].indexOf(k);
      if (idx === 3) { this.openMortgage(); return; }
      if (idx >= 0) { const g = GAMES[idx]; if (g) void this.enter(g); }
    }) as EventListener);
    this.on(this.ui, 'pointerdown', () => { if (!this.tw.skip()) this.waiting?.(); });
  }

  private smoke(): void {
    if (!this.entering) this.cig.press();
  }

  private advance(): void {
    if (!this.tw.skip()) this.waiting?.();
  }

  private stationDist(s: Station): number {
    const dx = Math.max(Math.abs(this.pos.x - s.solid.x) - s.solid.hx, 0);
    const dz = Math.max(Math.abs(this.pos.z - s.solid.z) - s.solid.hz, 0);
    return Math.hypot(dx, dz);
  }

  private updateNear(): void {
    let best: Station | null = null;
    const bd = REACH;
    const here = this.world.roomAt(this.pos.x, this.pos.z);
    // entre varias mesas a mano gana la que miras
    const fx = -Math.sin(this.fps.yaw), fz = -Math.cos(this.fps.yaw);
    let bs = Infinity;
    for (const s of this.stations) {
      const d = this.stationDist(s);
      if (d >= bd || here !== null) continue;
      const vx = s.solid.x - this.pos.x, vz = s.solid.z - this.pos.z;
      const facing = Math.max(0, (vx * fx + vz * fz) / (Math.hypot(vx, vz) || 1));
      const score = d - 1.2 * facing;
      if (score < bs) { bs = score; best = s; }
    }
    this.near = best;
    this.nearSpot = null;
    if (!best && !this.entering) {
      let bs2 = Infinity;
      for (const sp of this.world.spots) {
        const d = Math.hypot(sp.x - this.pos.x, sp.z - this.pos.z);
        if (d >= sp.reach || this.world.roomAt(sp.x, sp.z) !== here) continue;
        const facing = Math.max(0, ((sp.x - this.pos.x) * fx + (sp.z - this.pos.z) * fz) / (d || 1));
        const score = d - 1.0 * facing;
        if (score < bs2) { bs2 = score; this.nearSpot = sp; }
      }
      if (this.nearSpot) {
        this.prompt.style.display = 'block';
        this.prompt.style.opacity = '1';
        this.prompt.textContent = T.eggs.examine(T.eggs.names[this.nearSpot.id] ?? '');
        return;
      }
    }
    if (!best || this.entering) { this.prompt.style.display = 'none'; return; }
    const r = session.run, g = best.game;
    this.prompt.style.display = 'block';
    if (g === 'mortgage') {
      const ok = canMortgage(r);
      this.prompt.style.opacity = ok ? '1' : '0.6';
      this.prompt.textContent = r.mode === 'endless' ? `${T.hub.use(T.endless.house)}` : `${T.hub.use(T.hub.mortgage)} · ${ok ? T.mortgage.hint : T.mortgage.done}`;
      return;
    }
    const ok = canPlay(g, r.balance, r.actionsLeft);
    this.prompt.style.opacity = ok ? '1' : '0.6';
    this.prompt.textContent = `${T.hub.use(T.hub[g])} · ${ok ? T.hub.cost(TABLES[g].cost, minBet(g)) : T.hub.unavailable}`;
  }

  private interact(): void {
    if (this.entering || !this.fps.enabled) return;
    if (!this.near) { this.nearSpot?.use(); return; }
    if (this.near.game === 'mortgage') this.openMortgage();
    else void this.enter(this.near.game);
  }

  /** El Cobrador te adelanta fichas a cambio de sumar lo prestado, con interés, a la cuota de esta noche. */
  private openMortgage(): void {
    const r = session.run;
    if (this.entering || !this.fps.enabled) return;
    if (r.mode === 'endless') {
      const next = tollFor(r.tolls, r.balance);
      void this.tw.say(T.endless.desk(r.peak, Math.max(session.best(), r.peak), T.endless.ranks[rankFor(r.peak)] ?? '', r.plays, next), true);
      return;
    }
    if (!canMortgage(r)) { void this.tw.say(T.mortgage.refuse, true); return; }
    this.fps.setEnabled(false);
    const close = (): void => { ov.close(); this.fps.setEnabled(true); };
    const ov = showOverlay(this.ui, T.mortgage.title, T.mortgage.body, [
      ...mortgageOffers(r.night).map((o) => ({
        text: T.mortgage.option(o.amount, o.owed),
        onClick: () => {
          close();
          session.dispatch({ type: 'mortgage', amount: o.amount });
          sfx.prize();
          this.cobrador.setMood('sonrisa');
          void this.tw.say(T.mortgage.signed(o.amount, o.owed), true);
        }
      })),
      { text: T.mortgage.cancel, onClick: close }
    ], { w: 900, onBack: close });
  }

  // ---------- flujo ----------

  private async intro(): Promise<void> {
    const r = session.run;
    if (r.mode === 'endless') {
      if (r.flags['intro-endless']) { await this.tw.say(T.endless.hubLine, true); return; }
      session.dispatch({ type: 'flag', key: 'intro-endless' });
      const wait = () => new Promise<void>((res) => { const timer = window.setTimeout(() => { this.waiting = null; res(); }, 2800); this.waiting = () => { window.clearTimeout(timer); this.waiting = null; res(); }; });
      this.locked = true;
      for (const line of T.endless.intro) { await this.tw.say(line, true); await wait(); }
      this.locked = false;
      return;
    }
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
    saved = { night: r.night, x: this.pos.x, z: this.pos.z, yaw: this.fps.yaw, pitch: this.fps.pitch };
    session.dispatch({ type: 'enterTable' });
    const c0 = this.pos.clone();
    const l0 = c0.clone().add(new THREE.Vector3(-Math.sin(this.fps.yaw) * 5, Math.sin(this.fps.pitch) * 5, -Math.cos(this.fps.yaw) * 5));
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
    this.lamps.forEach((l, i) => { l.intensity = 20 * this.world.dim * (1 - 0.15 * Math.max(0, Math.sin(t * 9 + i * 3) - 0.8) * 5); });
    const p = engine.pointer;
    this.cobrador.setGaze((p.x - 640) / 500, (p.y - 300) / 300);
    this.tickCig(dt, t);
    if (this.entering) return;
    this.fps.update(dt);
    this.stepCobrador(dt);
    this.updateNear();
    this.world.update(dt, t, this.pos, this.fps.yaw, this.fps.pitch);
    this.worldLife(dt);
    this.placeLabels();
  }

  /** El Cobrador camina cuando tú caminas: en el pasillo te rodea y en las salas laterales espera en la puerta. */
  private stepCobrador(dt: number): void {
    const moved = Math.hypot(this.pos.x - this.lastPos.x, this.pos.z - this.lastPos.z);
    this.lastPos.copy(this.pos);
    const speed = dt > 0 ? Math.min(6, moved / dt) : 0;
    const room = this.world.roomAt(this.pos.x, this.pos.z);
    const door = room === 'mirrors' ? { x: -5.4, z: -1.5 } : room === 'storage' ? { x: 5.4, z: 1.8 } : room === 'archive' ? { x: -5.2, z: -7.1 } : null;
    this.cobrador.step(dt, this.pos, speed, door);
  }

  /** Cartel de sala al entrar y sucesos aleatorios: susurros, apagones, teléfono y golpes. */
  private worldLife(dt: number): void {
    const room = this.world.roomAt(this.pos.x, this.pos.z);
    if (room !== this.room) {
      this.room = room;
      if (room) {
        this.caption.textContent = T.eggs.rooms[room] ?? '';
        this.caption.style.opacity = '1';
        window.setTimeout(() => { this.caption.style.opacity = '0'; }, 2600);
        sfx.whisper();
      }
    }
    if (this.blackout > 0) {
      this.blackout -= dt;
      this.world.dim = this.blackout > 0 ? (session.options.reduceFlash ? 0.35 : 0.04) : 1;
    }
    this.nextEvent -= dt;
    if (this.nextEvent > 0 || this.locked || this.entering || !this.fps.enabled) return;
    this.nextEvent = 22 + Math.random() * 28;
    const pick = Math.floor(Math.random() * 4);
    if (pick === 0) { void this.tw.say(T.eggs.whispers[Math.floor(Math.random() * T.eggs.whispers.length)] ?? '', true); }
    else if (pick === 1) { this.blackout = session.options.reduceFlash ? 1.2 : 0.55; sfx.glitch(); }
    else if (pick === 2) { this.world.ring(); void this.tw.say(T.eggs.ring); }
    else { sfx.thud(); sfx.thud(); void this.tw.say(T.eggs.knock, true); }
  }

  private placeLabels(): void {
    const v = new THREE.Vector3();
    for (const { el: l, s } of this.labels) {
      v.copy(s.label);
      const d = v.distanceTo(this.pos);
      v.project(this.camera);
      const vis = v.z < 1 && Math.abs(v.x) < 1.1 && d < 11 && !this.entering;
      l.style.display = vis ? 'block' : 'none';
      if (!vis) continue;
      l.style.left = `${(v.x * 0.5 + 0.5) * 1280}px`;
      l.style.top = `${Math.max(150, Math.min(560, (-v.y * 0.5 + 0.5) * 800))}px`;
      l.style.opacity = this.near === s ? '1' : String(Math.max(0.8, 1 - d / 20));
    }
  }

  private tickCig(dt: number, t: number): void {
    this.cig.update(dt, t);
  }

  dispose(): void {
    if (!this.entering) saved = { night: session.run.night, x: this.pos.x, z: this.pos.z, yaw: this.fps.yaw, pitch: this.fps.pitch };
    this.listeners.forEach(([t, fn, target]) => target.removeEventListener(t, fn));
    this.cig?.dispose();
    this.fps?.unbind();
    this.hud?.dispose();
    this.tw?.stop();
    super.dispose();
  }
}
