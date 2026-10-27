import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { sfx } from '../audio/sfx';
import { brickTex, metalTex, woodTex } from '../art/tex3d';
import { session } from '../core/session';
import { T } from '../i18n/es';
import { Cobrador3D } from './cobrador3d';
import type { Solid } from './fps';
import { box, cyl, glow, lam, mesh, reelDrum, slotMachine } from './models';
import { cv, px } from './pixel';
import { stripTexture } from './strip';
import { canvasTex, tex } from './tex';

const H = 4.8;

/** Cosa que se puede examinar con F (los easter eggs del pasillo). */
export interface Spot { id: string; x: number; z: number; reach: number; use: () => void }

/** Retrato antiguo de 24×32: cara pálida con las cuencas vacías (los ojos se añaden aparte, brillantes). */
function portraitTex(seed: number): THREE.CanvasTexture {
  return cv(24, 32, (g) => {
    px(g, '#2a0e12', 0, 0, 24, 32);
    px(g, '#8c7442', 0, 0, 24, 1); px(g, '#8c7442', 0, 31, 24, 1); px(g, '#8c7442', 0, 0, 1, 32); px(g, '#8c7442', 23, 0, 1, 32);
    px(g, '#1a0a0e', 2, 2, 20, 28);
    const skin = ['#cfc6a8', '#b8a888', '#d8ccb0', '#a89c80'][seed % 4] ?? '#cfc6a8';
    px(g, skin, 7, 8, 10, 13); px(g, skin, 8, 7, 8, 1); px(g, skin, 8, 21, 8, 2);
    px(g, '#26090e', 5, 4 + (seed % 2), 14, 4); // pelo / sombrero
    if (seed % 3 === 0) px(g, '#26090e', 4, 8, 3, 12);
    px(g, '#0b0305', 9, 12, 2, 3); px(g, '#0b0305', 13, 12, 2, 3); // cuencas
    px(g, '#0b0305', 10 + (seed % 2), 18, 4, 1); // boca
    px(g, '#3a4226', 6, 24, 12, 5); // cuello / ropa
    px(g, '#7a2a20', 11, 24, 2, 3);
  });
}

const eyeDot = (() => { let t: THREE.CanvasTexture | null = null; return () => t ?? (t = cv(4, 4, (g) => { px(g, '#ece0c0', 1, 0, 2, 4); px(g, '#ece0c0', 0, 1, 4, 2); px(g, '#c24a3a', 1, 1, 2, 2); })); })();

function neonTex(text: string, col: string, w = 96, h = 24): THREE.CanvasTexture {
  return cv(w, h, (g) => {
    g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = "20px 'VT323', monospace";
    g.shadowColor = col; g.shadowBlur = 5;
    g.fillStyle = col;
    g.fillText(text, w / 2, h / 2 + 1);
  });
}

let webCache: THREE.CanvasTexture | null = null;
const webTex = (): THREE.CanvasTexture => webCache ?? (webCache = cv(24, 24, (g) => {
  g.strokeStyle = 'rgba(200,190,170,0.9)';
  g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(24, i * 6); g.stroke(); g.beginPath(); g.moveTo(0, 0); g.lineTo(i * 6, 24); g.stroke(); }
  for (let r = 6; r <= 22; r += 5) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI / 2); g.stroke(); }
}));

const stainTex = (): THREE.CanvasTexture => cv(16, 16, (g) => {
  g.fillStyle = 'rgba(8,2,10,0.85)';
  [[8, 8, 6], [4, 10, 3], [11, 5, 3], [10, 12, 3]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x ?? 0, y ?? 0, r ?? 1, 0, Math.PI * 2); g.fill(); });
});

/** Todo lo que hay más allá del pasillo: tres salas, decoración inquietante y los easter eggs. */
export class HubWorld {
  readonly spots: Spot[] = [];
  readonly lights: Array<{ l: THREE.Light; base: number; flicker: number }> = [];
  /** Multiplica todas las luces (los apagones). */
  dim = 1;
  private anims: Array<(dt: number, t: number) => void> = [];
  private dolls: Array<{ head: THREE.Group; base: THREE.Vector3 }> = [];
  private portraits: Array<{ g: THREE.Group; eyes: THREE.Mesh[]; ry: number }> = [];
  private ghost!: Cobrador3D;
  private mannequin!: THREE.Group;
  private mannequinHome = new THREE.Vector3(16, 0, -2.6);
  private manAcc = 0;
  private tvTex!: THREE.CanvasTexture;
  private tvCtx: CanvasRenderingContext2D | null = null;
  private tvAcc = 0;
  private phoneLight!: THREE.Mesh;
  private ringT = 0;
  private counts: Record<string, number> = {};

  constructor(private scene: THREE.Scene, private solids: Solid[], private say: (text: string, whisper?: boolean) => void) {}

  // ---------- utilidades ----------

  private wall(x0: number, x1: number, z0: number, z1: number): void {
    const w = x1 - x0, d = z1 - z0;
    const m = lam(0xffffff, tex(`hw-wall-${w.toFixed(1)}-${d.toFixed(1)}`, () => brickTex('#3a1018'), [Math.max(w, d) / 2, 2.4]));
    box(w, H, d, m, (x0 + x1) / 2, H / 2, (z0 + z1) / 2, this.scene);
    this.solids.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, hx: w / 2, hz: d / 2 });
  }

  private room(x0: number, x1: number, z0: number, z1: number, floorCol: string): void {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam(0xffffff, tex(`hw-floor-${floorCol}`, () => woodTex(floorCol), [w / 1.6, d / 1.6])));
    f.rotation.x = -Math.PI / 2;
    f.position.set(cx, 0.01, cz);
    this.scene.add(f);
    const c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam(0x0a050a));
    c.rotation.x = Math.PI / 2;
    c.position.set(cx, H, cz);
    this.scene.add(c);
  }

  private light(col: number, intensity: number, dist: number, x: number, y: number, z: number, flicker = 0): void {
    const l = new THREE.PointLight(col, intensity, dist, 1.5);
    l.position.set(x, y, z);
    this.scene.add(l);
    this.lights.push({ l, base: intensity, flicker });
  }

  private spot(id: string, x: number, z: number, reach: number, use: () => void): void {
    this.spots.push({ id, x, z, reach, use });
  }

  private nth(id: string): number {
    const n = (this.counts[id] ?? 0);
    this.counts[id] = n + 1;
    return n;
  }

  private cycle(id: string, lines: readonly string[], whisper = true): void {
    this.say(lines[this.nth(id) % lines.length] ?? '', whisper);
  }

  private candle(x: number, y: number, z: number, parent: THREE.Object3D = this.scene): void {
    cyl(0.035, 0.04, 0.22, lam(0xcfc6a8, null, { emissive: 0x2a2418 }), x, y + 0.11, z, parent, 6);
    const f = mesh(new THREE.SphereGeometry(0.035, 6, 5), glow(0xffb040), x, y + 0.27, z, parent);
    f.scale.y = 1.6;
    const ph = Math.random() * 10;
    this.anims.push((_dt, t) => { f.scale.y = 1.4 + Math.sin(t * 17 + ph) * 0.35; f.visible = Math.sin(t * 3 + ph) > -0.97; });
  }

  private cobweb(x: number, y: number, z: number, ry: number, s = 1): void {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1 * s, 1.1 * s), new THREE.MeshBasicMaterial({ map: webTex(), transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    this.scene.add(m);
  }

  private stain(x: number, z: number, r: number): void {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: stainTex(), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.03, z);
    this.scene.add(m);
  }

  private coins(x: number, z: number, n: number, spread: number): void {
    for (let i = 0; i < n; i++) {
      const c = cyl(0.09, 0.09, 0.015, lam(0xc4a050, null, { emissive: 0x302408 }), x + (Math.random() - 0.5) * spread, 0.04, z + (Math.random() - 0.5) * spread, this.scene, 8);
      c.rotation.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4);
    }
  }

  private mask(x: number, y: number, z: number, ry: number): void {
    const t = cv(12, 14, (g) => {
      px(g, '#d8ccb0', 2, 0, 8, 12); px(g, '#d8ccb0', 1, 2, 10, 8); px(g, '#d8ccb0', 3, 12, 6, 2);
      px(g, '#0b0305', 3, 4, 2, 3); px(g, '#0b0305', 7, 4, 2, 3);
      px(g, '#7a1e1e', 3, 9, 6, 1); px(g, '#7a1e1e', 2, 8, 1, 1); px(g, '#7a1e1e', 9, 8, 1, 1);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.64), new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.3, color: 0xb8b0a0, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    this.scene.add(m);
  }

  private neon(text: string, col: string, x: number, y: number, z: number, ry: number, w = 2.4): void {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: neonTex(text, col), transparent: true, side: THREE.DoubleSide, fog: false }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    this.scene.add(m);
    const ph = Math.random() * 9;
    this.anims.push((_dt, t) => { m.visible = Math.sin(t * 29 + ph) * Math.sin(t * 4.3 + ph) < 0.8; });
  }

  private doll(x: number, y: number, z: number, parent: THREE.Object3D = this.scene): void {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    cyl(0.02, 0.17, 0.3, lam(0x7a1428), 0, 0.15, 0, g, 8); // vestido
    box(0.13, 0.12, 0.08, lam(0xd8ccb0, null, { emissive: 0x2a2418 }), 0, 0.33, 0, g);
    [-1, 1].forEach((s) => box(0.05, 0.16, 0.05, lam(0xd8ccb0), s * 0.11, 0.2, 0.02, g).rotation.z = -s * 0.35);
    const head = new THREE.Group();
    head.position.set(0, 0.46, 0);
    mesh(new THREE.SphereGeometry(0.095, 8, 6), lam(0xe0d6bc, null, { emissive: 0x3a3428 }), 0, 0, 0, head);
    [-1, 1].forEach((s) => box(0.025, 0.03, 0.02, glow(0x0b0305), s * 0.035, 0.012, 0.085, head));
    box(0.05, 0.012, 0.02, glow(0x7a1e1e), 0, -0.04, 0.088, head);
    g.add(head);
    parent.add(g);
    this.dolls.push({ head, base: g.position.clone() });
  }

  private crate(x: number, z: number, s = 0.9, y = 0, ry = 0): void {
    const m = box(s, s, s, lam(0xffffff, tex('hw-crate', () => woodTex('#4a3220'), [1, 1])), x, y + s / 2, z, this.scene);
    m.rotation.y = ry;
    this.solids.push({ x, z, hx: s / 2 + 0.05, hz: s / 2 + 0.05 });
  }

  private barrel(x: number, z: number): void {
    cyl(0.4, 0.4, 0.95, lam(0xffffff, tex('hw-barrel', () => woodTex('#3a2a1c'), [2, 1])), x, 0.48, z, this.scene, 10);
    cyl(0.41, 0.41, 0.06, lam(0x6a6070), x, 0.25, z, this.scene, 10);
    cyl(0.41, 0.41, 0.06, lam(0x6a6070), x, 0.75, z, this.scene, 10);
    this.solids.push({ x, z, hx: 0.45, hz: 0.45 });
  }

  private portrait(x: number, y: number, z: number, ry: number, seed: number): void {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    mesh(new THREE.PlaneGeometry(0.8, 1.06), new THREE.MeshLambertMaterial({ map: portraitTex(seed), emissive: 0x201014, emissiveMap: portraitTex(seed) }), 0, 0, 0.01, g);
    const eyes: THREE.Mesh[] = [];
    [-0.075, 0.075].forEach((ex) => {
      const e = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshBasicMaterial({ map: eyeDot(), transparent: true, fog: false }));
      e.position.set(ex - 0.0, 0.06, 0.03);
      g.add(e);
      eyes.push(e);
    });
    this.scene.add(g);
    this.portraits.push({ g, eyes, ry });
  }

  // ---------- construcción ----------

  build(): void {
    this.mainWalls();
    this.mainDecor();
    this.westRoom();
    this.eastRoom();
    this.northRoom();
  }

  /** Paredes del pasillo con las cuatro puertas: espejos (oeste), almacén (este), archivo (norte) y la salida (sur). */
  private mainWalls(): void {
    this.wall(-7.0, -6.2, -8.8, -8.4); this.wall(-4.2, 7.0, -8.8, -8.4);        // norte, hueco en x∈[-6.2,-4.2]
    this.wall(-7.0, -1.0, 6.4, 6.8); this.wall(1.0, 7.0, 6.4, 6.8);             // sur, hueco para la puerta de salida
    this.wall(-7.0, -6.6, -8.8, -2.7); this.wall(-7.0, -6.6, -0.3, 6.8);        // oeste, hueco en z∈[-2.7,-0.3]
    this.wall(6.6, 7.0, -8.8, 0.6); this.wall(6.6, 7.0, 3.0, 6.8);              // este, hueco en z∈[0.6,3.0]
    // puerta de salida: sin picaporte
    box(2.0, 3.4, 0.2, lam(0xffffff, tex('hw-exit', () => metalTex('#4a4250'), [1, 2])), 0, 1.7, 6.45, this.scene);
    box(0.5, 0.5, 0.05, lam(0x0b0305), 0, 2.4, 6.33, this.scene);
    this.solids.push({ x: 0, z: 6.5, hx: 1.0, hz: 0.25 });
    this.neon('SALIDA', '#e0503c', 0, 3.8, 6.3, Math.PI, 1.6);
    this.spot('exit', 0, 5.6, 1.7, () => this.say(session.run.mode === 'endless' ? T.eggs.exitEndless : T.eggs.exit, true));
    // letreros de las salas
    this.neon('ESPEJOS', '#8aa0e0', -6.55, 3.7, -1.5, Math.PI / 2, 1.8);
    this.neon('ALMACÉN', '#e8b868', 6.55, 3.7, 1.8, -Math.PI / 2, 1.8);
    this.neon('ARCHIVO', '#c24a3a', -5.2, 3.7, -8.2, 0, 1.8);
  }

  /** Decoración de los puestos de apuestas y del resto del pasillo. */
  private mainDecor(): void {
    const sc = this.scene;
    // —— tragaperras: monedas, banqueta caída, muñeca, planta muerta, neón
    this.coins(-4.3, 1.0, 14, 2.4);
    box(0.42, 0.06, 0.42, lam(0x3a2418), -4.2, 0.46, 3.2, sc).rotation.set(0, 0.5, 1.2);
    for (const [dx, dz] of [[-0.15, -0.15], [0.15, 0.15]] as const) cyl(0.025, 0.025, 0.46, lam(0x3a2418), -4.2 + dx, 0.2, 3.2 + dz, sc, 4).rotation.z = 1.3;
    this.doll(-5.3, 0.0, 3.5);
    cyl(0.22, 0.17, 0.3, lam(0x5a3a22), -6.2, 0.15, 3.0, sc, 8);
    for (let i = 0; i < 4; i++) { const st = cyl(0.01, 0.015, 0.5, lam(0x3a3a26), -6.2 + (i - 1.5) * 0.06, 0.55, 3.0, sc, 3); st.rotation.z = (i - 1.5) * 0.4; }
    this.neon('SUERTE', '#e0503c', -6.55, 3.5, 1.0, Math.PI / 2, 2.0);
    this.cobweb(-6.55, 4.3, 5.6, Math.PI / 2, 1.3);
    this.mask(-6.55, 2.6, 4.8, Math.PI / 2);
    this.stain(-4.5, 3.9, 0.8);

    // —— ruleta: candelabros, cartas de tarot, fichas, lámpara de araña
    for (const x of [-3.2, 1.0]) {
      cyl(0.04, 0.06, 1.0, lam(0xc4a050), x, 1.45, -4.0, sc, 6);
      box(0.5, 0.04, 0.04, lam(0xc4a050), x, 1.97, -4.0, sc);
      [-0.22, 0, 0.22].forEach((o) => this.candle(x + o, 1.97, -4.0));
    }
    this.light(0xe8a050, 6, 6, -1.1, 3.0, -2.6, 0.8);
    const cardTex = (n: number): THREE.CanvasTexture => cv(10, 16, (g) => {
      px(g, '#d6cbae', 0, 0, 10, 16); px(g, '#7a1e1e', 1, 1, 8, 14); px(g, '#d6cbae', 2, 2, 6, 12);
      px(g, '#0b0305', 4, 5 + n, 2, 2); px(g, '#7a1e1e', 3, 9 + n, 4, 1);
    });
    ([[-1.9, -3.0, 0.4], [-1.45, -2.92, -0.3], [-1.0, -3.1, 0.15]] as const).forEach(([x, z, r], i) => {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.46), new THREE.MeshLambertMaterial({ map: cardTex(i), emissive: 0x201a14, emissiveMap: cardTex(i) }));
      c.rotation.set(-Math.PI / 2, 0, r);
      c.position.set(x, 0.96, z);
      sc.add(c);
    });
    for (let i = 0; i < 6; i++) cyl(0.07, 0.07, 0.025, lam([0x7a1e1e, 0x3a4226, 0xc4b494][i % 3] ?? 0x7a1e1e), -0.1, 0.97 + i * 0.027, -3.2, sc, 8);
    this.spot('tarot', -1.4, -2.2, 1.0, () => this.say(T.eggs.tarot, true));
    this.stain(-2.8, -2.0, 0.7);
    this.mask(-6.55, 2.9, -6.5, Math.PI / 2);

    // —— tiovivo: banderines rotos, globos pinchados, cartel
    for (let i = 0; i < 9; i++) {
      const x = 2.4 + i * 0.5, y = 3.6 - Math.sin((i / 8) * Math.PI) * 0.3;
      const f = box(0.28, 0.34, 0.01, lam([0x7a1428, 0xc4b494, 0x3a4226][i % 3] ?? 0x7a1428, null, { emissive: 0x201018 }), x, y, -5.9, sc);
      f.rotation.z = (i % 2 ? 1 : -1) * 0.15;
    }
    for (let i = 0; i < 3; i++) {
      const b = mesh(new THREE.SphereGeometry(0.2, 8, 6), lam([0x7a1428, 0x3a4226, 0xc4a050][i] ?? 0x7a1428), 5.6 + i * 0.3, 0.1, 0.4 + i * 0.5, sc);
      b.scale.y = 0.35;
    }
    const post = cv(32, 40, (g) => {
      px(g, '#d6cbae', 0, 0, 32, 40); px(g, '#7a1e1e', 2, 2, 28, 36); px(g, '#d6cbae', 3, 3, 26, 34);
      g.fillStyle = '#7a1e1e'; g.font = "9px 'VT323', monospace"; g.textAlign = 'center'; g.fillText('ÚLTIMA', 16, 11); g.fillText('VUELTA', 16, 19);
      px(g, '#7a1e1e', 12, 25, 8, 8); px(g, '#d6cbae', 14, 27, 2, 2); px(g, '#d6cbae', 17, 27, 2, 2); px(g, '#d6cbae', 14, 31, 5, 1);
    });
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.38), new THREE.MeshLambertMaterial({ map: post, emissive: 0x201a14, emissiveMap: post }));
    poster.position.set(6.55, 2.4, -6.2);
    poster.rotation.y = -Math.PI / 2;
    sc.add(poster);
    this.spot('poster', 5.8, -6.2, 1.2, () => this.say(T.eggs.poster, true));
    this.cobweb(6.5, 4.2, -8.2, -Math.PI / 2, 1.4);

    // —— general: reloj parado, teléfono, manchas, telarañas, máscaras
    const clk = cv(20, 20, (g) => {
      g.fillStyle = '#d6cbae'; g.beginPath(); g.arc(10, 10, 9, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#0b0305'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(10, 10); g.lineTo(10, 3); g.moveTo(10, 10); g.lineTo(10, 4); g.stroke();
      g.strokeStyle = '#7a1e1e'; g.beginPath(); g.moveTo(10, 10); g.lineTo(10, 2); g.stroke();
    });
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.45, 14), new THREE.MeshBasicMaterial({ map: clk, color: 0xb8b0a0 }));
    clock.position.set(-3.0, 3.7, -8.15);
    sc.add(clock);
    this.spot('clock', -3.0, -7.2, 1.4, () => this.say(T.eggs.clock, true));
    // teléfono de pared que suena solo
    box(0.25, 0.4, 0.18, lam(0x2a1a14), -6.5, 1.6, 4.9, sc);
    this.phoneLight = mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), glow(0xe0503c), -6.38, 1.72, 4.9, sc);
    this.phoneLight.visible = false;
    this.spot('phone', -5.8, 4.9, 1.2, () => { this.ringT = 0; this.phoneLight.visible = false; this.cycle('phone', T.eggs.phone); });
    this.stain(3.0, 4.3, 0.9); this.stain(-1.2, 0.6, 0.6);
    this.cobweb(6.5, 4.3, 6.2, -Math.PI / 2, 1.3); this.cobweb(-6.5, 4.3, -8.2, Math.PI / 2, 1.2);
    this.mask(2.2, 3.3, 6.3, Math.PI); this.mask(-2.4, 3.1, 6.3, Math.PI);
    // muñecas colgadas del techo, quietas a menos que mires de reojo
    for (const x of [-2.6, 2.8]) { cyl(0.004, 0.004, 1.6, lam(0x1c100c), x, 4.0, 3.5, sc, 3); this.doll(x, 2.55, 3.5); }
  }

  // ---------- sala de los espejos (oeste) ----------

  private westRoom(): void {
    const sc = this.scene;
    this.wall(-16.4, -6.6, -4.8, -4.4); this.wall(-16.4, -6.6, 1.4, 1.8); this.wall(-16.4, -16.0, -4.4, 1.4);
    this.room(-16, -6.8, -4.6, 1.6, '#201820');
    this.light(0xa0b0ff, 16, 10, -11.4, 3.7, -1.5, 1.4);
    // espejos reales: cada uno vuelve a dibujar la sala (por eso solo hay dos)
    const mirror = (x: number, z: number, ry: number): void => {
      const r = new Reflector(new THREE.PlaneGeometry(5, 3.2), { textureWidth: 384, textureHeight: 256, color: 0x8a9298, clipBias: 0.003 });
      r.position.set(x, 2.2, z);
      r.rotation.y = ry;
      sc.add(r);
      const frame = lam(0xc4a050, tex('hw-gold', () => metalTex('#c4a050')));
      const dz = Math.cos(ry) * 0.04, dx = Math.sin(ry) * 0.04;
      box(5.3, 0.14, 0.12, frame, x - dx, 3.85, z - dz, sc).rotation.y = ry; box(5.3, 0.14, 0.12, frame, x - dx, 0.55, z - dz, sc).rotation.y = ry;
      for (const s of [-1, 1]) box(0.14, 3.4, 0.12, frame, x + Math.cos(ry) * s * 2.57, 2.2, z - Math.sin(ry) * s * 2.57, sc).rotation.y = ry;
    };
    mirror(-11.4, -4.38, 0);
    mirror(-11.4, 1.18, Math.PI);
    this.ghost = new Cobrador3D(0.034).anchor(-11.4, 1.95, -0.1);
    this.ghost.visible = false;
    this.ghost.setMood('acecho', true);
    sc.add(this.ghost);
    this.spot('mirror', -11.4, -3.0, 1.8, () => this.cycle('mirror', T.eggs.mirror));
    // candelabros en el suelo, tocador roto y muñecas
    for (const x of [-14.5, -8.5]) { cyl(0.05, 0.08, 1.4, lam(0xc4a050), x, 0.7, -3.6, sc, 6); [-0.2, 0, 0.2].forEach((o) => this.candle(x + o, 1.4, -3.6)); }
    box(1.6, 0.8, 0.6, lam(0x3a2418), -14.8, 0.4, 0.6, sc); this.solids.push({ x: -14.8, z: 0.6, hx: 0.9, hz: 0.4 });
    this.doll(-14.8, 0.8, 0.6); this.doll(-14.3, 0.8, 0.6);
    // sábana sobre un mueble, telarañas y manchas
    const sheet = box(1.2, 1.3, 0.9, lam(0xb8b0a0, null, { emissive: 0x1c1a16 }), -9.6, 0.65, -3.4, sc); sheet.rotation.y = 0.2;
    this.solids.push({ x: -9.6, z: -3.4, hx: 0.7, hz: 0.6 });
    this.cobweb(-15.5, 4.4, -4.1, 0, 1.6); this.cobweb(-15.5, 4.4, 1.1, Math.PI, 1.6); this.cobweb(-7.2, 4.4, -4.1, 0, 1.2);
    this.stain(-12.5, -1.0, 1.0); this.stain(-9.0, 0.4, 0.6);
    this.mask(-15.85, 2.6, -1.5, Math.PI / 2);
    this.spot('doll', -14.0, 1.0, 1.2, () => this.cycle('doll', T.eggs.doll));
  }

  // ---------- almacén (este) ----------

  private eastRoom(): void {
    const sc = this.scene;
    this.wall(6.6, 17.2, -3.8, -3.4); this.wall(6.6, 17.2, 6.8, 7.2); this.wall(16.8, 17.2, -3.4, 6.8);
    this.room(6.8, 17, -3.6, 7, '#1c1812');
    // luz de bombilla colgante que se balancea
    cyl(0.01, 0.01, 1.2, lam(0x1c100c), 12, 4.2, 1.5, sc, 3);
    mesh(new THREE.SphereGeometry(0.12, 8, 6), glow(0xf0d890), 12, 3.55, 1.5, sc);
    this.light(0xe8a860, 18, 11, 12, 3.4, 1.5, 1.8);
    // cajas, barriles y lonas
    this.crate(15.8, -2.6, 1.0); this.crate(14.7, -2.8, 0.8); this.crate(15.6, -2.4, 0.7, 1.0, 0.4);
    this.crate(8.2, 6.0, 0.9); this.crate(9.2, 6.2, 0.8); this.crate(8.6, 5.6, 0.6, 0.9, 0.7);
    this.barrel(16.2, 3.2); this.barrel(16.2, 4.0); this.barrel(7.6, -2.8);
    const tarp = box(1.4, 1.1, 1.0, lam(0x8a8478, null, { emissive: 0x1a1814 }), 12.6, 0.55, 5.8, sc); tarp.rotation.y = 0.15;
    this.solids.push({ x: 12.6, z: 5.8, hx: 0.8, hz: 0.6 });
    // estantería con frascos (ojos flotando) y muñecas
    box(0.5, 2.6, 4.4, lam(0x2a1c12), 16.55, 1.3, 0.2, sc); this.solids.push({ x: 16.55, z: 0.2, hx: 0.3, hz: 2.3 });
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) {
      const z = -1.7 + i * 0.7, y = 0.65 + r * 0.8;
      cyl(0.17, 0.17, 0.4, lam(0x4a5a50, null, { transparent: true, opacity: 0.55, emissive: 0x101a14 }), 16.18, y, z, sc, 8);
      const e = mesh(new THREE.SphereGeometry(0.08, 6, 5), lam(0xe0d6bc, null, { emissive: 0x302a20 }), 16.18, y, z, sc);
      box(0.035, 0.035, 0.035, glow(0xc24a3a), 15.99, y, z, sc);
      this.anims.push((_dt, t) => { e.position.y = y + Math.sin(t * 1.3 + i + r) * 0.03; });
    }
    this.spot('jars', 15.2, 0.2, 1.6, () => this.cycle('jars', T.eggs.jars));
    this.doll(16.2, 0.0, -3.1, sc);
    // televisor con nieve
    box(1.0, 0.8, 0.7, lam(0x2a2a2e), 12.4, 1.3, -2.9, sc); box(1.2, 0.5, 0.9, lam(0x3a2418), 12.4, 0.5, -2.9, sc);
    this.solids.push({ x: 12.4, z: -2.9, hx: 0.7, hz: 0.5 });
    const tvc = document.createElement('canvas'); tvc.width = 40; tvc.height = 30;
    this.tvCtx = tvc.getContext('2d');
    this.tvTex = canvasTex(tvc);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.58), new THREE.MeshBasicMaterial({ map: this.tvTex, fog: false }));
    scr.position.set(12.4, 1.32, -2.54);
    sc.add(scr);
    this.spot('tv', 12.4, -1.7, 1.6, () => { this.cycle('tv', T.eggs.tv); sfx.glitch(); });
    // gramola
    box(0.9, 1.5, 0.6, lam(0x5a1c20), 8.0, 0.75, -2.8, sc); mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 12, Math.PI), glow(0xe8b868), 8.0, 1.35, -2.48, sc);
    this.solids.push({ x: 8.0, z: -2.8, hx: 0.55, hz: 0.4 });
    this.spot('jukebox', 8.0, -1.8, 1.5, () => { this.say(T.eggs.jukebox, true); this.playTune(); });
    // tablero de ouija sobre una mesa
    box(1.5, 0.8, 1.0, lam(0x3a2418), 10.8, 0.4, 5.5, sc); this.solids.push({ x: 10.8, z: 5.5, hx: 0.85, hz: 0.6 });
    const ou = cv(48, 32, (g) => {
      px(g, '#6a5240', 0, 0, 48, 32); px(g, '#d6cbae', 2, 2, 44, 28);
      g.fillStyle = '#26090e'; g.font = "8px 'VT323', monospace"; g.textAlign = 'center';
      g.fillText('SÍ        NO', 24, 9); g.fillText('A B C D E F G H I J K', 24, 17); g.fillText('L M N Ñ O P Q R S T', 24, 23); g.fillText('ADIÓS', 24, 29);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.86), new THREE.MeshLambertMaterial({ map: ou, emissive: 0x3a3428, emissiveMap: ou }));
    board.rotation.x = -Math.PI / 2; board.position.set(10.8, 0.82, 5.5); sc.add(board);
    const plan = box(0.16, 0.03, 0.2, lam(0x1c100c), 10.8, 0.85, 5.5, sc);
    this.anims.push((_dt, t) => { plan.position.x = 10.8 + Math.sin(t * 0.6) * 0.25; plan.position.z = 5.5 + Math.sin(t * 0.9 + 1) * 0.15; });
    this.spot('ouija', 10.8, 4.5, 1.3, () => this.say(T.eggs.ouija[this.nth('ouija') % T.eggs.ouija.length] ?? '', true));
    // tragaperras rota con tres sietes
    const slot = slotMachine();
    const strip = stripTexture();
    slot.group.position.set(16.0, 0, 5.8); slot.group.rotation.set(0, -Math.PI / 2 - 0.2, 0.12); slot.group.scale.setScalar(1.15);
    slot.reelAnchors.forEach((a) => { const d = reelDrum(strip, 0.36, 0.4); d.rotation.x = (Math.PI / 3) * 5.5; a.add(d); });
    sc.add(slot.group);
    this.solids.push({ x: 16.0, z: 5.8, hx: 0.9, hz: 1.2 });
    this.spot('slot777', 14.6, 5.8, 1.6, () => {
      if (session.run.flags['egg-777']) { this.say(T.eggs.slot777Done, true); return; }
      session.dispatch({ type: 'find', key: 'egg-777', chips: 77 });
      sfx.prize();
      this.say(T.eggs.slot777, true);
    });
    // moneda en el suelo
    const coin = cyl(0.16, 0.16, 0.03, lam(0xc4a050, null, { emissive: 0x5a4414 }), 9.6, 0.05, 3.4, sc, 10);
    this.anims.push((_dt, t) => { coin.rotation.y = t * 1.2; coin.visible = !session.run.flags['egg-coin']; });
    this.spot('coin', 9.6, 3.4, 1.0, () => {
      if (session.run.flags['egg-coin']) { this.say(T.eggs.coinDone, true); return; }
      session.dispatch({ type: 'find', key: 'egg-coin', chips: 100 });
      sfx.prize();
      this.say(T.eggs.coin, true);
    });
    // maniquí que se mueve cuando no lo miras
    this.mannequin = this.buildMannequin();
    this.mannequin.position.copy(this.mannequinHome);
    sc.add(this.mannequin);
    this.spot('mannequin', 16, -2.6, 1.2, () => this.cycle('mannequin', T.eggs.mannequin));
    this.cobweb(16.6, 4.4, -3.2, -Math.PI / 2, 1.6); this.cobweb(7.4, 4.4, 6.6, Math.PI, 1.4); this.cobweb(16.6, 4.4, 6.6, -Math.PI / 2, 1.2);
    this.stain(11.0, 2.0, 1.2); this.stain(14.0, 4.0, 0.8);
    this.coins(9.0, 4.4, 6, 2);
    this.mask(7.3, 2.8, 5.0, Math.PI / 2);
  }

  private buildMannequin(): THREE.Group {
    const g = new THREE.Group();
    const m = lam(0xcfc6a8, null, { emissive: 0x2a2820 });
    cyl(0.07, 0.07, 0.9, m, -0.12, 0.45, 0, g, 6); cyl(0.07, 0.07, 0.9, m, 0.12, 0.45, 0, g, 6);
    box(0.5, 0.7, 0.26, m, 0, 1.25, 0, g);
    [-1, 1].forEach((s) => box(0.08, 0.7, 0.08, m, s * 0.32, 1.2, 0.05, g).rotation.z = s * 0.1);
    mesh(new THREE.SphereGeometry(0.15, 8, 6), m, 0, 1.78, 0, g).scale.set(0.85, 1.15, 0.9);
    return g;
  }

  private tune = 0;
  private playTune(): void {
    // organillo desafinado: unas notas con la afinación caída
    const base = [262, 330, 392, 330, 262, 294, 349, 294];
    base.forEach((f, i) => window.setTimeout(() => sfx.note(f * (1 - 0.012 * (i + this.tune))), i * 260));
    this.tune++;
  }

  // ---------- archivo de deudas (norte) ----------

  private northRoom(): void {
    const sc = this.scene;
    this.wall(-10.0, -9.6, -17.8, -8.4); this.wall(-0.8, -0.4, -17.8, -8.4); this.wall(-10.0, -0.4, -17.8, -17.4);
    this.room(-9.6, -0.8, -17.6, -8.6, '#1a1014');
    this.light(0xc03a2a, 14, 11, -5.2, 3.7, -13.2, 1.1);
    // archivadores
    for (let i = 0; i < 4; i++) {
      for (const x of [-9.1, -1.3]) {
        const z = -10.6 - i * 1.5;
        box(0.7, 1.7, 0.9, lam(0xffffff, tex('hw-cab', () => metalTex('#3a4a40'), [1, 2])), x, 0.85, z, sc);
        this.solids.push({ x, z, hx: 0.45, hz: 0.55 });
        for (let k = 0; k < 3; k++) box(0.03, 0.12, 0.3, lam(0xc4b494), x + (x < 0 ? 0.36 : -0.36), 0.4 + k * 0.5, z, sc);
      }
    }
    // mesa del libro de deudas con lámpara
    box(1.8, 0.85, 0.9, lam(0xffffff, tex('hw-desk2', () => woodTex('#3a2418'), [2, 1])), -5.2, 0.42, -11.6, sc);
    this.solids.push({ x: -5.2, z: -11.6, hx: 1.0, hz: 0.55 });
    const led = cv(24, 16, (g) => {
      px(g, '#d6cbae', 0, 0, 24, 16); px(g, '#6a5240', 11, 0, 2, 16);
      g.fillStyle = '#26090e'; for (let i = 0; i < 6; i++) { g.fillRect(2, 2 + i * 2, 7 + (i % 3) * 2, 1); g.fillRect(14, 2 + i * 2, 6 + ((i + 1) % 3) * 2, 1); }
      px(g, '#7a1e1e', 15, 13, 6, 1);
    });
    const book = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.54), new THREE.MeshLambertMaterial({ map: led, emissive: 0x3a3428, emissiveMap: led }));
    book.rotation.x = -Math.PI / 2; book.position.set(-5.2, 0.87, -11.6); sc.add(book);
    mesh(new THREE.SphereGeometry(0.1, 8, 6), glow(0xa0c080), -4.6, 1.15, -11.7, sc); cyl(0.02, 0.02, 0.3, lam(0x2a2a1a), -4.6, 0.98, -11.7, sc, 4);
    this.spot('ledger', -5.2, -10.4, 1.4, () => {
      const r = session.run;
      this.say(T.eggs.ledger(r.history.length, r.mode, r.tolls), true);
    });
    // pared de retratos que miran, con un marco vacío
    const zWall = -17.2;
    [-9.0, -8.0, -7.0, -3.4, -2.4, -1.4].forEach((x, i) => this.portrait(x, 2.6, zWall, 0, i + 1));
    this.portrait(-9.2, 2.6, -13.0, Math.PI / 2, 7);
    this.portrait(-9.2, 2.6, -15.0, Math.PI / 2, 8);
    this.portrait(-1.0, 2.6, -13.0, -Math.PI / 2, 9);
    this.spot('portraits', -5.2, -15.6, 2.4, () => this.cycle('portraits', T.eggs.portraits));
    // marco vacío con placa
    const fr = lam(0xc4a050, tex('hw-gold', () => metalTex('#c4a050')));
    box(0.9, 0.08, 0.06, fr, -1.0, 3.2, -16.0, sc).rotation.y = -Math.PI / 2;
    // (el marco vacío está en la pared este, entre dos retratos)
    box(0.06, 1.1, 0.8, lam(0x1a0a0e), -0.9, 2.6, -14.0, sc);
    box(0.04, 0.12, 0.4, lam(0xc4b494, null, { emissive: 0x3a3424 }), -0.92, 1.95, -14.0, sc);
    this.spot('emptyFrame', -1.8, -14.0, 1.2, () => this.say(T.eggs.emptyFrame, true));
    // puerta de Deudores con una rendija roja
    box(1.8, 3.2, 0.25, lam(0xffffff, tex('hw-door', () => metalTex('#2a1a1a'), [1, 2])), -5.2, 1.6, -17.3, sc);
    box(0.05, 2.4, 0.03, glow(0xc24a3a), -5.2, 1.6, -17.15, sc);
    this.neon('DEUDORES', '#c24a3a', -5.2, 3.5, -17.15, 0, 1.7);
    this.spot('lockedDoor', -5.2, -16.2, 1.6, () => this.say(T.eggs.lockedDoor, true));
    this.cobweb(-9.4, 4.4, -17.3, 0, 1.5); this.cobweb(-0.7, 4.4, -17.3, 0, 1.5);
    this.stain(-6.0, -14.2, 1.1);
    this.mask(-9.55, 2.6, -11.0, Math.PI / 2);
  }

  // ---------- por fotograma ----------

  roomAt(x: number, z: number): 'mirrors' | 'storage' | 'archive' | null {
    if (x < -6.8 && z > -4.6 && z < 1.6) return 'mirrors';
    if (x > 6.8) return 'storage';
    if (z < -8.6 && x > -9.6 && x < -0.8) return 'archive';
    return null;
  }

  /** ¿Está el punto dentro del cono de visión del jugador? */
  private seen(pos: THREE.Vector3, yaw: number, pitch: number, p: THREE.Vector3, cos = 0.55): boolean {
    const v = p.clone().sub(pos);
    if (v.lengthSq() < 0.001) return true;
    v.normalize();
    const f = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    return v.dot(f) > cos;
  }

  /** Suena el teléfono: parpadea la luz y repite un timbre un rato. */
  ring(): void {
    this.ringT = 4.5;
  }

  update(dt: number, t: number, pos: THREE.Vector3, yaw: number, pitch: number): void {
    this.anims.forEach((f) => f(dt, t));
    this.lights.forEach(({ l, base, flicker }) => {
      const f = flicker > 0 ? 1 - 0.5 * Math.max(0, Math.sin(t * (6 + flicker * 4)) * Math.sin(t * 2.9 + flicker) - 0.5) * 2 : 1;
      l.intensity = base * this.dim * f;
    });
    // teléfono
    if (this.ringT > 0) {
      this.ringT -= dt;
      this.phoneLight.visible = Math.floor(t * 6) % 2 === 0;
      if (Math.floor(t * 2) !== Math.floor((t - dt) * 2) && Math.floor(t * 2) % 3 !== 2) sfx.ring();
      if (this.ringT <= 0) this.phoneLight.visible = false;
    }
    // televisor: nieve a ~10 fps
    this.tvAcc += dt;
    if (this.tvCtx && this.tvAcc > 0.1) {
      this.tvAcc = 0;
      const img = this.tvCtx.createImageData(40, 30);
      for (let i = 0; i < img.data.length; i += 4) { const v = 40 + Math.random() * 190; img.data[i] = v * 0.85; img.data[i + 1] = v; img.data[i + 2] = v * 0.9; img.data[i + 3] = 255; }
      this.tvCtx.putImageData(img, 0, 0);
      this.tvTex.needsUpdate = true;
    }
    // muñecas: miran hacia otro lado mientras las miras y se vuelven hacia ti cuando no
    for (const d of this.dolls) {
      const wp = new THREE.Vector3();
      d.head.getWorldPosition(wp);
      const looked = this.seen(pos, yaw, pitch, wp, 0.78);
      const toYou = Math.atan2(pos.x - wp.x, pos.z - wp.z);
      const target = looked ? toYou + 1.1 : toYou;
      d.head.rotation.y += (target - d.head.rotation.y) * Math.min(1, dt * (looked ? 2 : 14));
    }
    // retratos: las pupilas brillantes te siguen
    for (const p of this.portraits) {
      const dx = pos.x - p.g.position.x, dz = pos.z - p.g.position.z;
      const c = Math.cos(p.ry), s = Math.sin(p.ry);
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      const off = THREE.MathUtils.clamp(lx / Math.max(1.5, Math.abs(lz)), -1, 1) * 0.022;
      p.eyes.forEach((e, i) => { e.position.x = (i ? 0.075 : -0.075) + off; e.visible = Math.hypot(dx, dz) < 9; });
    }
    // fantasma del espejo: solo aparece cuando miras de frente al espejo del norte
    const inMir = this.roomAt(pos.x, pos.z) === 'mirrors';
    const front = inMir && pos.z < -1.3 && this.seen(pos, yaw, pitch, new THREE.Vector3(-11.4, 2.2, -4.4), 0.8);
    if (this.ghost) { this.ghost.visible = front; this.ghost.update(dt); this.ghost.setGaze(0, 0); }
    // maniquí: se acerca cuando no lo miras; si llega demasiado cerca, vuelve a su sitio con un chasquido
    if (this.mannequin && this.roomAt(pos.x, pos.z) === 'storage') {
      const mp = this.mannequin.position.clone(); mp.y = 1.2;
      if (this.seen(pos, yaw, pitch, mp, 0.45)) this.manAcc = 0;
      else {
        this.manAcc += dt;
        if (this.manAcc > 1.0) {
          this.manAcc = 0;
          const dist = Math.hypot(pos.x - mp.x, pos.z - mp.z);
          if (dist > 2.6) {
            const dir = new THREE.Vector3(pos.x - mp.x, 0, pos.z - mp.z).normalize();
            this.mannequin.position.addScaledVector(dir, 0.9);
            this.mannequin.rotation.y = Math.atan2(dir.x, dir.z);
          } else { sfx.glitch(); this.mannequin.position.copy(this.mannequinHome); }
        }
      }
    }
  }
}
