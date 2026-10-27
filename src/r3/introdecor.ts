import * as THREE from 'three';
import { box, cyl, glow, lam, mesh } from './models';
import { cv, lit, px } from './pixel';
import type { Solid } from './fps';

export type Anim = (dt: number, t: number) => void;
interface Ctx { scene: THREE.Scene; solids: Solid[]; anims: Anim[] }

const INK = '#0b0305';
/** Ruido determinista para que las texturas no cambien entre cargas. */
const rnd = (i: number, j = 0): number => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------- texturas ----------

/** Asfalto mojado: motas, grietas y manchas de aceite. */
export const asphaltTex = (): THREE.CanvasTexture => cv(32, 32, (g) => {
  px(g, '#26202c', 0, 0, 32, 32);
  for (let i = 0; i < 120; i++) px(g, rnd(i) > 0.5 ? '#322a3a' : '#1a1620', Math.floor(rnd(i, 1) * 32), Math.floor(rnd(i, 2) * 32));
  for (let i = 0; i < 12; i++) px(g, '#120e16', 6 + i, 8 + Math.floor(Math.sin(i * 0.9) * 2));
  g.fillStyle = 'rgba(14,16,32,0.55)'; g.beginPath(); g.ellipse(22, 22, 6, 4, 0.4, 0, Math.PI * 2); g.fill();
});

export const carpetTex = (): THREE.CanvasTexture => cv(32, 32, (g) => {
  px(g, '#3a0c14', 0, 0, 32, 32);
  for (let y = 0; y < 32; y += 16) for (let x = 0; x < 32; x += 16) {
    for (let k = 0; k < 8; k++) { px(g, '#8c7442', x + 8 - k, y + k); px(g, '#8c7442', x + 8 + k, y + k); px(g, '#8c7442', x + 8 - k, y + 15 - k); px(g, '#8c7442', x + 8 + k, y + 15 - k); }
    px(g, '#561a1a', x + 6, y + 6, 4, 4); px(g, '#c4a050', x + 7, y + 7, 2, 2);
  }
});

/** Fachada con hileras de ventanas: unas con luz cálida, otras apagadas o tapiadas. */
export const windowsTex = (): THREE.CanvasTexture => cv(64, 24, (g) => {
  g.clearRect(0, 0, 64, 24);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
    const x = 2 + c * 8, y = 2 + r * 8, k = rnd(r * 8 + c, 5);
    px(g, '#0b0305', x - 1, y - 1, 7, 7);
    if (k > 0.55) { px(g, '#e8b868', x, y, 5, 5); px(g, '#fff0c0', x, y, 5, 1); px(g, '#7a4a20', x + 2, y, 1, 5); }
    else if (k > 0.2) px(g, '#10141c', x, y, 5, 5);
    else { px(g, '#3a2418', x, y, 5, 5); px(g, '#1a0e0a', x, y + 2, 5, 1); } // tablones
  }
});

const fenceTex = (): THREE.CanvasTexture => cv(16, 16, (g) => {
  g.clearRect(0, 0, 16, 16);
  for (let i = 0; i < 16; i += 4) { px(g, '#6a6070', i, 0, 1, 16); px(g, '#6a6070', 0, i, 16, 1); }
});

const puddleTex = (): THREE.CanvasTexture => cv(16, 16, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 16); gr.addColorStop(0, '#2a3a5a'); gr.addColorStop(1, '#0e1220');
  g.fillStyle = gr; g.beginPath(); g.ellipse(8, 8, 7.5, 5.5, 0, 0, Math.PI * 2); g.fill();
  px(g, '#8aa0c0', 4, 5, 3, 1); px(g, '#8aa0c0', 9, 9, 2, 1);
});

// ---------- coches con texturas de pixel art ----------

const darker = (hex: number, k: number): string => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`;
const css = (hex: number): string => `#${new THREE.Color(hex).getHexString()}`;

function carSide(color: number): THREE.CanvasTexture {
  const c = css(color), d = darker(color, 0.6), l = darker(color, 1.35);
  return cv(40, 14, (g) => {
    px(g, d, 0, 0, 40, 14); px(g, c, 0, 1, 40, 8); px(g, l, 0, 1, 40, 1);
    px(g, '#4a4250', 0, 9, 40, 2); // zócalo
    px(g, INK, 0, 11, 40, 3);
    for (const wx of [8, 31]) { g.fillStyle = INK; g.beginPath(); g.arc(wx, 11, 5, 0, Math.PI * 2); g.fill(); px(g, '#6a6070', wx - 1, 10, 3, 3); px(g, INK, wx, 11); }
    px(g, d, 19, 1, 1, 8); px(g, '#c4b494', 16, 4, 2, 1); px(g, '#c4b494', 23, 4, 2, 1); // puertas y manijas
  });
}
function carCabin(color: number): THREE.CanvasTexture {
  const c = css(color);
  return cv(32, 10, (g) => {
    px(g, c, 0, 0, 32, 10); px(g, '#10202c', 2, 1, 12, 7); px(g, '#10202c', 17, 1, 13, 7); px(g, c, 14, 0, 3, 10);
    px(g, '#4a6a8a', 3, 2, 4, 1); px(g, '#4a6a8a', 18, 2, 3, 1); px(g, INK, 0, 0, 32, 1);
  });
}
function carEnd(color: number, front: boolean, lights: boolean): THREE.CanvasTexture {
  const c = css(color), d = darker(color, 0.6);
  return cv(24, 12, (g) => {
    px(g, c, 0, 0, 24, 12); px(g, '#10202c', 3, 0, 18, 4); px(g, d, 0, 8, 24, 4);
    px(g, '#4a4250', 0, 9, 24, 2); px(g, INK, 0, 11, 24, 1);
    if (front) {
      px(g, lights ? '#fff0c0' : '#3a3440', 1, 5, 5, 3); px(g, lights ? '#fff0c0' : '#3a3440', 18, 5, 5, 3);
      for (let x = 8; x < 16; x += 2) px(g, '#1a1620', x, 6, 1, 3); // parrilla
    } else { px(g, '#9c1c20', 1, 5, 6, 3); px(g, '#9c1c20', 17, 5, 6, 3); }
    px(g, '#d6cbae', 9, 9, 6, 2); px(g, INK, 10, 10, 1, 1); px(g, INK, 12, 10, 1, 1); // matrícula
  });
}
function carTop(color: number): THREE.CanvasTexture {
  const c = css(color), l = darker(color, 1.25);
  return cv(16, 24, (g) => { px(g, c, 0, 0, 16, 24); px(g, l, 2, 2, 12, 20); px(g, '#10202c', 1, 0, 14, 3); px(g, '#10202c', 1, 21, 14, 3); });
}

/** Coche de cajas con una textura de pixel art en cada cara (laterales, parabrisas, faros, matrícula, techo). */
export function buildCar(ctx: Ctx, color: number, x: number, z: number, lights = false, ry = 0): THREE.Group {
  const g = new THREE.Group();
  const side = carSide(color), cab = carCabin(color), fr = carEnd(color, true, lights), bk = carEnd(color, false, false), top = carTop(color);
  const m = (t: THREE.Texture, k = 0.35) => lit(t, k);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.78, 4.1), [m(side), m(side), m(top), m(top), m(fr), m(bk)]);
  body.position.set(0, 0.5, 0);
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.6, 2.1), [m(cab), m(cab), m(top), m(top), m(fr), m(bk)]);
  cabin.position.set(0, 1.18, -0.2);
  g.add(cabin);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  ctx.scene.add(g);
  ctx.solids.push({ x, z, hx: 1.05, hz: 2.2 });
  return g;
}

// ---------- accesorios del aparcamiento ----------

export function cone(ctx: Ctx, x: number, z: number): void {
  mesh(new THREE.ConeGeometry(0.2, 0.6, 8), lam(0xe0701e, null, { emissive: 0x301408 }), x, 0.3, z, ctx.scene);
  cyl(0.205, 0.17, 0.1, lam(0xece0c0, null, { emissive: 0x302820 }), x, 0.32, z, ctx.scene, 8);
}

export function bin(ctx: Ctx, x: number, z: number): void {
  cyl(0.38, 0.32, 0.9, lam(0x4a5a50, null, { emissive: 0x101a14 }), x, 0.45, z, ctx.scene, 8);
  cyl(0.4, 0.4, 0.08, lam(0x2a3a30), x, 0.94, z, ctx.scene, 8);
  ctx.solids.push({ x, z, hx: 0.45, hz: 0.45 });
}

export function vending(ctx: Ctx, x: number, z: number, ry = 0): void {
  const front = cv(16, 28, (g) => {
    px(g, '#1a2030', 0, 0, 16, 28); px(g, '#e0503c', 1, 1, 14, 3);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) px(g, [ '#e8d27a', '#76895a', '#c24a3a', '#8aa0c0'][(r + c) % 4] ?? '#e8d27a', 2 + c * 4, 6 + r * 4, 3, 3);
    px(g, '#0b0305', 3, 23, 10, 3); px(g, '#e8d27a', 12, 7, 2, 1);
  });
  const g = new THREE.Group();
  box(1.0, 1.9, 0.8, lam(0x1a2030), 0, 0.95, 0, g);
  mesh(new THREE.PlaneGeometry(0.9, 1.7), new THREE.MeshBasicMaterial({ map: front }), 0, 1.0, 0.41, g);
  g.position.set(x, 0, z); g.rotation.y = ry;
  ctx.scene.add(g);
  ctx.solids.push({ x, z, hx: 0.6, hz: 0.5 });
  const l = new THREE.PointLight(0x8aa0e0, 5, 5, 1.5);
  l.position.set(x, 1.6, z + Math.cos(ry) * 1.2);
  ctx.scene.add(l);
}

/** Barrera de entrada: poste con brazo a rayas rojas y blancas, y la garita del vigilante con luz. */
export function barrier(ctx: Ctx, x: number, z: number): void {
  box(0.3, 1.1, 0.3, lam(0x4a4250), x, 0.55, z, ctx.scene);
  const arm = new THREE.Group();
  arm.position.set(x, 1.0, z);
  for (let i = 0; i < 8; i++) box(0.5, 0.12, 0.1, lam(i % 2 ? 0xece0c0 : 0xc24a3a, null, { emissive: 0x201410 }), 0.3 + i * 0.5, 0, 0, arm);
  arm.rotation.z = 1.1; // levantada: ya está abierta
  ctx.scene.add(arm);
  ctx.solids.push({ x, z, hx: 0.25, hz: 0.25 });
  box(1.4, 1.9, 1.2, lam(0x3a2a30, null, { emissive: 0x140c10 }), x - 2.4, 0.95, z, ctx.scene);
  box(0.9, 0.6, 0.05, glow(0xe8b868), x - 2.4, 1.3, z + 0.62, ctx.scene);
  ctx.solids.push({ x: x - 2.4, z, hx: 0.8, hz: 0.7 });
}

/** Árbol de pixel art: tronco y copa de conos, oscuro contra el cielo. */
export function tree(ctx: Ctx, x: number, z: number, s = 1): void {
  cyl(0.15 * s, 0.2 * s, 1.6 * s, lam(0x2a1a12), x, 0.8 * s, z, ctx.scene, 5);
  for (let i = 0; i < 3; i++) mesh(new THREE.ConeGeometry((1.3 - i * 0.3) * s, 1.6 * s, 6), lam(0x14241a, null, { emissive: 0x08100a }), x, (2.0 + i * 0.9) * s, z, ctx.scene);
}

export function fence(ctx: Ctx, x: number, z0: number, z1: number): void {
  const len = Math.abs(z1 - z0);
  const t = fenceTex();
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(len / 1.2, 2);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.4), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, opacity: 0.7 }));
  m.rotation.y = Math.PI / 2; m.position.set(x, 1.2, (z0 + z1) / 2);
  ctx.scene.add(m);
  for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z += 4) cyl(0.05, 0.05, 2.5, lam(0x4a4250), x, 1.25, z, ctx.scene, 4);
}

export function puddle(ctx: Ctx, x: number, z: number, s = 1.4): void {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(s * 2, s * 1.4), new THREE.MeshBasicMaterial({ map: puddleTex(), transparent: true, opacity: 0.85, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z);
  ctx.scene.add(m);
}

/** Cartel de aparcamiento: una P blanca sobre azul, en un poste. */
export function parkingSign(ctx: Ctx, x: number, z: number): void {
  cyl(0.05, 0.05, 2.6, lam(0x4a4250), x, 1.3, z, ctx.scene, 5);
  const t = cv(12, 12, (g) => { px(g, '#1c3a8a', 0, 0, 12, 12); px(g, '#ece0c0', 1, 1, 10, 10); px(g, '#1c3a8a', 2, 2, 8, 8); px(g, '#ece0c0', 4, 3, 2, 6); px(g, '#ece0c0', 4, 3, 4, 1); px(g, '#ece0c0', 7, 4, 1, 2); px(g, '#ece0c0', 4, 6, 4, 1); });
  mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: t }), x, 2.5, z + 0.06, ctx.scene);
}

/** Lluvia de píxeles: rayitas que caen y se reciclan. */
export function rain(ctx: Ctx, n = 500): void {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (rnd(i, 1) - 0.5) * 30; pos[i * 3 + 1] = rnd(i, 2) * 12; pos[i * 3 + 2] = rnd(i, 3) * 24 - 8; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9aacc8, size: 2, sizeAttenuation: false, transparent: true, opacity: 0.55, fog: false }));
  ctx.scene.add(pts);
  ctx.anims.push((dt) => {
    const a = geo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < n; i++) { let y = a.getY(i) - dt * 13; if (y < 0) y += 12; a.setY(i, y); }
    a.needsUpdate = true;
  });
}

/** Rótulo de neón rectangular con bombillas que se persiguen alrededor. */
export function bulbFrame(ctx: Ctx, cx: number, cy: number, cz: number, w: number, h: number, col = 0xe8d27a): void {
  const bulbs: THREE.Mesh[] = [];
  const add = (x: number, y: number): void => { bulbs.push(mesh(new THREE.BoxGeometry(0.12, 0.12, 0.06), glow(col), cx + x, cy + y, cz, ctx.scene)); };
  for (let x = -w / 2; x <= w / 2 + 0.01; x += 0.5) { add(x, h / 2); add(x, -h / 2); }
  for (let y = -h / 2 + 0.5; y < h / 2 - 0.01; y += 0.5) { add(-w / 2, y); add(w / 2, y); }
  ctx.anims.push((_dt, t) => { bulbs.forEach((b, i) => { b.visible = (Math.floor(t * 6) + i) % 3 !== 0; }); });
}

// ---------- vestíbulo ----------

/** Lámpara de araña: aro con bombillas, cadena y brazos. */
export function chandelier(ctx: Ctx, x: number, y: number, z: number): void {
  cyl(0.02, 0.02, 1.2, lam(0xc4a050), x, y + 0.6, z, ctx.scene, 3);
  mesh(new THREE.TorusGeometry(0.7, 0.05, 5, 16), lam(0xc4a050, null, { emissive: 0x302408 }), x, y, z, ctx.scene).rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.35, 0.04, 5, 12), lam(0xc4a050, null, { emissive: 0x302408 }), x, y - 0.18, z, ctx.scene).rotation.x = Math.PI / 2;
  const bulbs: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; bulbs.push(mesh(new THREE.SphereGeometry(0.07, 6, 5), glow(0xfff0c0), x + Math.cos(a) * 0.7, y + 0.1, z + Math.sin(a) * 0.7, ctx.scene)); }
  ctx.anims.push((_dt, t) => { bulbs.forEach((b, i) => { b.visible = Math.sin(t * 5 + i * 1.9 + x) > -0.95; }); });
}

export function stool(ctx: Ctx, x: number, z: number, col = 0x7a1428): void {
  cyl(0.04, 0.04, 0.5, lam(0xc4a050), x, 0.25, z, ctx.scene, 4);
  cyl(0.2, 0.2, 0.1, lam(col, null, { emissive: 0x200810 }), x, 0.55, z, ctx.scene, 8);
}

export function plant(ctx: Ctx, x: number, z: number): void {
  cyl(0.3, 0.22, 0.5, lam(0x5a3a22), x, 0.25, z, ctx.scene, 8);
  for (let i = 0; i < 5; i++) mesh(new THREE.ConeGeometry(0.12, 0.9, 4), lam(0x1c3a22, null, { emissive: 0x08140a }), x + (i - 2) * 0.09, 0.9, z + ((i * 7) % 3 - 1) * 0.1, ctx.scene).rotation.z = (i - 2) * 0.25;
  ctx.solids.push({ x, z, hx: 0.35, hz: 0.35 });
}

/** Cuerda de terciopelo entre dos postes dorados. */
export function rope(ctx: Ctx, x0: number, x1: number, z: number): void {
  for (const x of [x0, x1]) { cyl(0.04, 0.05, 0.95, lam(0xc4a050, null, { emissive: 0x302408 }), x, 0.48, z, ctx.scene, 5); mesh(new THREE.SphereGeometry(0.07, 6, 5), lam(0xc4a050), x, 1.0, z, ctx.scene); }
  box(Math.abs(x1 - x0), 0.06, 0.06, lam(0x7a1428), (x0 + x1) / 2, 0.85, z, ctx.scene);
}

/** Cámara de seguridad con un led rojo que parpadea. */
export function camera(ctx: Ctx, x: number, y: number, z: number, ry: number): void {
  const g = new THREE.Group();
  box(0.5, 0.18, 0.18, lam(0x2a2a30), 0, 0, 0, g);
  box(0.12, 0.12, 0.2, lam(0x0b0305), 0.3, -0.02, 0, g);
  const led = mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), glow(0xe0503c), -0.2, 0.1, 0.1, g);
  g.position.set(x, y, z); g.rotation.y = ry;
  ctx.scene.add(g);
  ctx.anims.push((_dt, t) => { led.visible = Math.floor(t * 1.5) % 2 === 0; });
}

/** Mostrador de la caja con rejas doradas. */
export function cage(ctx: Ctx, x: number, z: number): void {
  box(3.0, 1.1, 0.8, lam(0x3a2418), x, 0.55, z, ctx.scene);
  for (let i = 0; i < 12; i++) cyl(0.025, 0.025, 1.3, lam(0xc4a050, null, { emissive: 0x302408 }), x - 1.4 + i * 0.255, 1.75, z, ctx.scene, 4);
  box(3.0, 0.08, 0.1, lam(0xc4a050), x, 2.42, z, ctx.scene);
  ctx.solids.push({ x, z, hx: 1.6, hz: 0.5 });
}

/** Barra con botellas de colores sobre un estante iluminado y taburetes. */
export function bar(ctx: Ctx, x: number, z0: number, z1: number): void {
  const cz = (z0 + z1) / 2, len = Math.abs(z1 - z0);
  box(0.9, 1.1, len, lam(0x3a1810), x, 0.55, cz, ctx.scene);
  box(1.1, 0.08, len + 0.1, lam(0xc4a050), x, 1.12, cz, ctx.scene);
  box(0.3, 2.2, len, lam(0x2a1810), x + 1.3, 1.2, cz, ctx.scene);
  for (let r = 0; r < 3; r++) for (let i = 0; i < Math.floor(len / 0.4); i++) cyl(0.07, 0.07, 0.3, lam([0x3a8a6a, 0xc4a050, 0x7a1e1e, 0x3a6ab0][(i + r) % 4] ?? 0x7a1e1e, null, { emissive: 0x201810 }), x + 1.1, 0.6 + r * 0.55, z0 + 0.3 + i * 0.4 * Math.sign(z1 - z0), ctx.scene, 6);
  ctx.solids.push({ x, z: cz, hx: 0.6, hz: len / 2 });
  for (let i = 0; i < 4; i++) stool(ctx, x - 0.9, z0 + (i + 0.5) * (z1 - z0) / 4);
}
