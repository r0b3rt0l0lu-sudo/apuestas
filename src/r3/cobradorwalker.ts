import * as THREE from 'three';
import type { Mood } from '../art/cobrador';
import { Cobrador3D } from './cobrador3d';
import type { Solid } from './fps';
import { cv, lit, px } from './pixel';

const RADIUS = 0.4;
const HEAD_Y = 2.2;

interface Bounds { minX: number; maxX: number; minZ: number; maxZ: number }

// ---------- pixel art del cuerpo (cada textura se dibuja píxel a píxel) ----------

const INK = '#0b0305';
const COAT = ['#2e2038', '#3c2a48', '#4a3658', '#5a4470'] as const; // sombra → luz
const BONE = ['#7a6a58', '#a89c80', '#cfc6a8', '#ece0c0'] as const;
const MOSS = ['#3a4226', '#566a38'] as const;

const shadeCols = (g: CanvasRenderingContext2D, w: number, h: number): void => {
  px(g, COAT[1], 0, 0, w, h);
  px(g, COAT[2], 1, 0, 2, h); // luz a la izquierda
  px(g, COAT[0], w - 4, 0, 3, h); // sombra a la derecha
  px(g, INK, 0, 0, 1, h); px(g, INK, w - 1, 0, 1, h); // contorno selectivo
};

/** Levita vista de frente: solapas, camisa, corbatín rojo, botones, cadena y reloj de bolsillo, bajo rasgado. */
const coatFront = (): THREE.CanvasTexture => cv(24, 32, (g) => {
  shadeCols(g, 24, 32);
  for (let y = 0; y < 14; y++) { const hw = Math.max(1, 5 - Math.floor(y * 0.33)); px(g, BONE[2], 12 - hw, y, hw * 2, 1); } // camisa
  for (let y = 0; y < 17; y++) { px(g, COAT[3], 7 + Math.floor(y * 0.3), y, 3, 1); px(g, COAT[3], 14 - Math.floor(y * 0.3), y, 3, 1); } // solapas
  px(g, INK, 6 + Math.floor(17 * 0.3), 16, 1, 1); px(g, INK, 17 - Math.floor(17 * 0.3), 16, 1, 1);
  px(g, '#c24a3a', 9, 1, 6, 3); px(g, '#7a1e1e', 11, 2, 2, 3); px(g, '#e0503c', 9, 1, 2, 1); // corbatín
  [18, 23, 28].forEach((y) => { px(g, '#c4a050', 11, y, 2, 2); px(g, INK, 11, y + 1, 2, 1); }); // botones
  ([[17, 14], [18, 15], [18, 16], [19, 17], [19, 18]] as const).forEach(([x, y]) => px(g, '#c4a050', x, y)); // cadena
  px(g, '#c4a050', 18, 19, 4, 4); px(g, INK, 19, 20, 2, 2); px(g, '#ece0c0', 19, 20); // reloj
  px(g, COAT[0], 2, 22, 5, 1); px(g, INK, 2, 23, 5, 1); // bolsillo
  px(g, '#26090e', 4, 26); px(g, '#26090e', 6, 26); px(g, '#26090e', 8, 26); // puntadas
  ([[3, 6], [4, 6], [4, 7], [20, 25], [21, 25], [21, 26]] as const).forEach(([x, y], i) => px(g, MOSS[i % 2] ?? MOSS[0], x, y)); // cardenillo
  for (let x = 1; x < 23; x++) if ((x * 7) % 5 < 2) px(g, INK, x, 31 - ((x * 3) % 2)); // dobladillo roto
});

const coatBack = (): THREE.CanvasTexture => cv(24, 32, (g) => {
  shadeCols(g, 24, 32);
  px(g, COAT[0], 11, 0, 2, 32); px(g, INK, 12, 12, 1, 20); // costura central y abertura
  px(g, COAT[0], 3, 18, 5, 1); px(g, COAT[0], 16, 22, 5, 1);
  px(g, '#c4a050', 11, 14, 1, 1); px(g, '#c4a050', 12, 14, 1, 1);
  ([[5, 9], [6, 9], [18, 20]] as const).forEach(([x, y]) => px(g, MOSS[0], x, y));
  for (let x = 1; x < 23; x++) if ((x * 5) % 7 < 3) px(g, INK, x, 31);
});

const coatSide = (): THREE.CanvasTexture => cv(10, 32, (g) => {
  px(g, COAT[1], 0, 0, 10, 32); px(g, COAT[2], 1, 0, 2, 32); px(g, COAT[0], 7, 0, 3, 32);
  px(g, INK, 0, 0, 1, 32); px(g, INK, 9, 0, 1, 32); px(g, COAT[0], 4, 6, 1, 18);
});

const topCap = (): THREE.CanvasTexture => cv(8, 8, (g) => { px(g, COAT[0], 0, 0, 8, 8); px(g, COAT[1], 1, 1, 6, 6); });

/** Pantalón de raya diplomática con rodillera, bajo blanquecino y deshilachado. */
const trousers = (): THREE.CanvasTexture => cv(8, 32, (g) => {
  px(g, '#2c2434', 0, 0, 8, 32);
  for (const x of [1, 4, 7]) px(g, '#4c3c5c', x, 0, 1, 28);
  px(g, '#241c2c', 1, 14, 6, 4); px(g, '#3a2e48', 2, 15, 4, 2); // rodillera
  px(g, INK, 0, 0, 1, 32); px(g, INK, 7, 0, 1, 32);
  px(g, BONE[1], 0, 28, 8, 3); px(g, BONE[0], 0, 30, 8, 1);
  for (let x = 0; x < 8; x += 2) px(g, INK, x, 31);
});

const shoeSide = (): THREE.CanvasTexture => cv(12, 8, (g) => {
  px(g, '#6a5240', 0, 0, 12, 6); px(g, '#948068', 1, 1, 6, 1); px(g, '#3a2418', 0, 4, 12, 2);
  px(g, INK, 0, 6, 12, 2); px(g, INK, 0, 0, 12, 1); px(g, '#c4a050', 9, 2, 1, 1);
});
const shoeTop = (): THREE.CanvasTexture => cv(8, 12, (g) => { px(g, '#5a4430', 0, 0, 8, 12); px(g, '#948068', 2, 8, 3, 1); px(g, INK, 0, 0, 8, 1); });

/** Manga de levita con puño blanco y botón dorado. */
const sleeve = (): THREE.CanvasTexture => cv(8, 32, (g) => {
  px(g, COAT[1], 0, 0, 8, 32); px(g, COAT[2], 1, 0, 2, 32); px(g, COAT[0], 6, 0, 2, 32);
  px(g, INK, 0, 0, 1, 32); px(g, INK, 7, 0, 1, 32);
  px(g, BONE[2], 0, 27, 8, 4); px(g, BONE[0], 0, 30, 8, 1); px(g, '#c4a050', 3, 25, 2, 1);
  px(g, '#26090e', 2, 10); px(g, '#26090e', 4, 11); px(g, MOSS[0], 5, 4);
});

/** Mano de hueso: palma con nudillos y un anillo de oro. */
const hand = (): THREE.CanvasTexture => cv(8, 16, (g) => {
  px(g, BONE[2], 0, 0, 8, 10); px(g, BONE[3], 1, 1, 2, 7); px(g, BONE[1], 6, 0, 2, 10);
  for (let x = 1; x < 8; x += 2) px(g, BONE[0], x, 9, 1, 2); // nudillos
  px(g, '#c4a050', 5, 4, 3, 1); px(g, '#e8d27a', 6, 4);
  px(g, INK, 0, 0, 1, 10); px(g, INK, 7, 0, 1, 10);
  px(g, BONE[2], 0, 10, 8, 3); px(g, BONE[0], 0, 12, 8, 1);
});

const finger = (): THREE.CanvasTexture => cv(4, 16, (g) => {
  px(g, BONE[2], 0, 0, 4, 16); px(g, BONE[3], 1, 0, 1, 16); px(g, BONE[1], 3, 0, 1, 16);
  px(g, BONE[0], 0, 5, 4, 1); px(g, BONE[0], 0, 10, 4, 1); px(g, INK, 1, 15, 2, 1);
});

const shadow = (): THREE.CanvasTexture => cv(16, 16, (g) => {
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.ellipse(8, 8, 7, 4, 0, 0, Math.PI * 2); g.fill();
});

/** Caja con una textura distinta en cada cara: [+x, -x, arriba, abajo, frente, espalda]. */
function pbox(w: number, h: number, d: number, faces: [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture], parent: THREE.Object3D, x = 0, y = 0, z = 0, glowK = 0.45): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), faces.map((t) => lit(t, glowK)));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/**
 * El Cobrador con cuerpo 3D de pixel art: levita con solapas, corbatín, botones y cadena de reloj, pantalones de raya,
 * zapatos y manos de hueso con anillo, todo con texturas dibujadas píxel a píxel. Se balancea al andar y lleva la
 * cabeza-moneda (siempre de cara a ti) sobre los hombros. Camina cuando tú caminas.
 */
export class CobradorWalker extends THREE.Group {
  private head: Cobrador3D;
  private rig = new THREE.Group();
  private legs: THREE.Group[] = [];
  private arms: THREE.Group[] = [];
  private phase = 0;
  private amp = 0;
  private facing = 0;
  private side = 1;

  constructor(private solids: Solid[], private bounds: Bounds) {
    super();
    const rig = this.rig;
    this.add(rig);
    const cf = coatFront(), cb = coatBack(), cs = coatSide(), cap = topCap();
    const tr = trousers(), sh = shoeSide(), st = shoeTop();
    const sl = sleeve(), hd = hand(), fg = finger();
    // pelvis y piernas con pivote en la cadera (se balancean en sentido contrario)
    pbox(0.52, 0.24, 0.3, [tr, tr, cap, cap, tr, tr], rig, 0, 1.05, 0);
    ([-1, 1] as const).forEach((s) => {
      const leg = new THREE.Group();
      leg.position.set(s * 0.14, 1.05, 0);
      pbox(0.19, 1.0, 0.19, [tr, tr, cap, cap, tr, tr], leg, 0, -0.5, 0);
      pbox(0.22, 0.14, 0.44, [sh, sh, st, st, sh, sh], leg, 0, -1.03, 0.09);
      rig.add(leg);
      this.legs.push(leg);
    });
    // torso con la levita; los faldones cuelgan por detrás
    pbox(0.66, 0.88, 0.34, [cs, cs, cap, cap, cf, cb], rig, 0, 1.56, 0);
    const tail = pbox(0.5, 0.6, 0.1, [cs, cs, cap, cap, cb, cb], rig, 0, 1.0, -0.19);
    tail.rotation.x = 0.14;
    // brazos: manga con puño y mano de hueso con tres dedos largos
    ([-1, 1] as const).forEach((s) => {
      const arm = new THREE.Group();
      arm.position.set(s * 0.42, 1.88, 0);
      pbox(0.14, 0.86, 0.14, [sl, sl, cap, cap, sl, sl], arm, 0, -0.43, 0);
      pbox(0.14, 0.34, 0.07, [hd, hd, hd, hd, hd, hd], arm, 0, -1.03, 0);
      for (let i = -1; i <= 1; i++) pbox(0.04, 0.22, 0.04, [fg, fg, fg, fg, fg, fg], arm, i * 0.045, -1.31, 0);
      rig.add(arm);
      this.arms.push(arm);
    });
    // sombra en el suelo
    const sd = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: shadow(), transparent: true, depthWrite: false }));
    sd.rotation.x = -Math.PI / 2;
    sd.position.y = 0.02;
    this.add(sd);
    // cabeza de pixel art, sin el cuerpo dibujado
    this.head = new Cobrador3D(0.02);
    this.head.bodyless = true;
    this.head.anchor(0, HEAD_Y, 0.1);
    this.add(this.head);
  }

  setMood(m: Mood, silent = false): this { this.head.setMood(m, silent); return this; }
  setGaze(x: number, y: number): void { this.head.setGaze(x, y); }
  get mood(): Mood { return this.head.mood; }

  private blocked(x: number, z: number): boolean {
    const b = this.bounds;
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return true;
    return this.solids.some((s) => Math.abs(x - s.x) < s.hx + RADIUS && Math.abs(z - s.z) < s.hz + RADIUS);
  }

  /** Avanza hacia (mx, mz); si hay un obstáculo prueba a rodearlo girando a un lado y otro. Devuelve el ángulo que siguió. */
  private steer(mx: number, mz: number, len: number): number {
    const base = Math.atan2(mx, mz);
    const inside = this.blocked(this.position.x, this.position.z); // arranca tras el mostrador: se le deja salir
    for (const k of [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1]) {
      const a = base + k * this.side;
      const x = this.position.x + Math.sin(a) * len, z = this.position.z + Math.cos(a) * len;
      if (inside || !this.blocked(x, z)) {
        this.position.x = x; this.position.z = z;
        if (k < 0) this.side = -this.side; // sigue rodeando por el lado que funcionó
        return a;
      }
    }
    return base;
  }

  /**
   * Un paso: solo anda cuando el jugador anda. En el pasillo se acerca sin pasar de ~3 m y retrocede si le
   * pisas; si estás en una sala lateral, espera en su puerta.
   */
  step(dt: number, player: THREE.Vector3, playerSpeed: number, doorTarget: { x: number; z: number } | null): void {
    const p = this.position;
    const dxp = player.x - p.x, dzp = player.z - p.z, dp = Math.hypot(dxp, dzp);
    let mx = 0, mz = 0, speed = 0;
    if (playerSpeed > 0.4) {
      let tx = player.x, tz = player.z, stop = 3.2;
      if (doorTarget) { tx = doorTarget.x; tz = doorTarget.z; stop = 0.35; }
      else if (p.z < -6.5 && Math.abs(p.x) < 2.9) { tx = (player.x < 0 ? -1 : 1) * 3.4; tz = -7.5; stop = 0.3; } // sale de detrás del mostrador
      const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      if (!doorTarget && dp < 2.0) { mx = -dxp / (dp || 1); mz = -dzp / (dp || 1); speed = 1.6; }
      else if (d > stop) { mx = dx / d; mz = dz / d; speed = 1.5; }
    }
    if (speed > 0) {
      const a = this.steer(mx, mz, speed * dt);
      this.facing = turn(this.facing, a, dt * 6);
    } else {
      this.facing = turn(this.facing, Math.atan2(dxp, dzp), dt * 1.5);
    }
    // balanceo de piernas y brazos proporcional a lo que anda
    this.amp += ((speed > 0 ? 1 : 0) - this.amp) * Math.min(1, dt * 6);
    this.phase += dt * 6.5 * this.amp;
    const sw = Math.sin(this.phase) * 0.65 * this.amp;
    this.legs[0]!.rotation.x = sw; this.legs[1]!.rotation.x = -sw;
    this.arms[0]!.rotation.x = -sw * 0.8; this.arms[1]!.rotation.x = sw * 0.8;
    this.rig.position.y = Math.abs(Math.sin(this.phase)) * 0.05 * this.amp;
    this.rig.rotation.y = this.facing;
    // la cabeza siempre mira a la cámara (los planos de arte no pueden verse de canto)
    this.head.rotation.y = Math.atan2(dxp, dzp);
    this.head.update(dt);
  }
}

/** Gira `a` hacia `b` por el camino corto. */
function turn(a: number, b: number, k: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, k);
}
