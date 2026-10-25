import * as THREE from 'three';
import { brickTex, cobbleTex, curtainTex, dueltableTex, feltTex, metalTex, noiseTex, paperTex, skyTex, stripeTex, woodTex } from '../art/tex3d';
import { tex } from './tex';

/** Material con luz difusa. */
export const lam = (color: number | string, map?: THREE.Texture | null, o: Partial<THREE.MeshLambertMaterialParameters> = {}): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ color, map: map ?? null, ...o });

/** Material que brilla por sí mismo (bombillas, llamas). */
export const glow = (color: number | string): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color, fog: false });

export function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, parent?: THREE.Object3D): THREE.Mesh {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent?.add(o);
  return o;
}

export const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0, p?: THREE.Object3D) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, p);
export const cyl = (rt: number, rb: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, p?: THREE.Object3D, seg = 16) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, p);

const T = {
  wood: (c = '#5a3a22', r: [number, number] = [1, 1]) => tex(`wood${c}`, () => woodTex(c), r),
  cobble: () => tex('cobble', () => cobbleTex('#1a0e1c'), [10, 20]),
  felt: () => tex('felt', () => feltTex('#566a38'), [3, 3]),
  brick: () => tex('brick', () => brickTex('#3a1018'), [4, 2]),
  metal: () => tex('metal', () => metalTex('#6a6070')),
  curtain: () => tex('curtain', () => curtainTex('#8a1e28'), [3, 1]),
  paper: () => tex('paper', () => paperTex())
};
export const textures = T;

export function ground(w: number, d: number, repeatX = 10, repeatY = 20): THREE.Mesh {
  const t = tex(`cobble${repeatX}x${repeatY}`, () => cobbleTex('#241228'), [repeatX, repeatY]);
  const g = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam(0xffffff, t));
  g.rotation.x = -Math.PI / 2;
  g.receiveShadow = true;
  return g;
}

/** Cielo: esfera interior con estrellas y una luna. */
export function sky(): THREE.Group {
  const g = new THREE.Group();
  const t = tex('sky', () => skyTex(256, 128));
  mesh(new THREE.SphereGeometry(95, 24, 12), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false }), 0, 0, 0, g).castShadow = false;
  const moon = mesh(new THREE.CircleGeometry(5, 20), new THREE.MeshBasicMaterial({ color: 0xc4b494, fog: false }), 28, 38, -80, g);
  moon.lookAt(0, 1.6, 8);
  moon.castShadow = false;
  return g;
}

export function tent(a: number, b: number, radius = 3, wall = 1.4, roof = 2.6, seed = 0): THREE.Group {
  const g = new THREE.Group();
  const st = tex(`stripes${a}${b}`, () => stripeTex(`#${a.toString(16).padStart(6, '0')}`, `#${b.toString(16).padStart(6, '0')}`), [10, 1]);
  mesh(new THREE.CylinderGeometry(radius, radius, wall, 20, 1, true), lam(0xffffff, st, { side: THREE.DoubleSide }), 0, wall / 2, 0, g);
  mesh(new THREE.ConeGeometry(radius * 1.12, roof, 20, 1, true), lam(0xffffff, st, { side: THREE.DoubleSide }), 0, wall + roof / 2, 0, g);
  cyl(0.05, 0.05, 1.4, lam(0x120c18), 0, wall + roof + 0.5, 0, g, 6);
  const flag = mesh(new THREE.PlaneGeometry(0.7, 0.4), lam(a, null, { side: THREE.DoubleSide }), 0.35, wall + roof + 1, 0, g);
  flag.userData.flag = true;
  box(1.3, wall * 0.95, 0.1, lam(0x000000), 0, wall * 0.48, radius - 0.02, g); // puerta
  g.rotation.y = seed;
  return g;
}

/** Noria: el aro gira; las góndolas cuelgan siempre rectas. Una está rota. */
export function ferris(radius = 6): { group: THREE.Group; wheel: THREE.Group; update: (dt: number) => void } {
  const group = new THREE.Group(), wheel = new THREE.Group();
  const dark = lam(0x2a1a34), mid = lam(0x3c2848);
  group.add(wheel);
  wheel.position.y = radius + 1.4;
  for (const z of [-0.5, 0.5]) mesh(new THREE.TorusGeometry(radius, 0.1, 6, 36), dark, 0, 0, z, wheel);
  mesh(new THREE.TorusGeometry(radius * 0.55, 0.07, 6, 28), dark, 0, 0, 0.5, wheel);
  const gcols = [0x7a2a30, 0x948068, 0x3a5a52, 0x6a5240];
  const gondolas: THREE.Object3D[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = Math.cos(a) * radius, y = Math.sin(a) * radius;
    const spoke = mesh(new THREE.BoxGeometry(radius, 0.08, 0.08), dark, x / 2, y / 2, 0, wheel);
    spoke.rotation.z = a;
    const gon = new THREE.Group();
    gon.position.set(x, y, 0);
    cyl(0.03, 0.03, 0.6, dark, 0, -0.3, 0, gon, 4);
    if (i !== 5) box(0.9, 0.7, 0.9, lam(gcols[i % 4] as number), 0, -0.9, 0, gon);
    else box(0.9, 0.12, 0.9, mid, 0.1, -0.7, 0, gon);
    wheel.add(gon);
    gondolas.push(gon);
  }
  cyl(0.3, 0.3, 1.4, dark, 0, 0, 0, wheel, 10).rotation.x = Math.PI / 2;
  for (const dx of [-1, 1]) {
    const leg = box(0.25, radius * 1.6, 0.25, dark, dx * radius * 0.45, radius * 0.8, 0, group);
    leg.rotation.z = -dx * 0.28;
  }
  return {
    group, wheel,
    update: (dt: number) => { wheel.rotation.z += dt * 0.12; gondolas.forEach((g) => { g.rotation.z = -wheel.rotation.z; }); }
  };
}

export function lampPost(color = 0xe8c070, intensity = 14, dist = 18): { group: THREE.Group; light: THREE.PointLight; head: THREE.Mesh } {
  const group = new THREE.Group();
  cyl(0.08, 0.1, 4.2, lam(0x120c18), 0, 2.1, 0, group, 6);
  cyl(0.2, 0.2, 0.12, lam(0x120c18), 0, 0.06, 0, group, 8);
  const head = mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), glow(color), 0, 4.45, 0, group);
  head.castShadow = false;
  box(0.7, 0.12, 0.7, lam(0x120c18), 0, 4.78, 0, group);
  const light = new THREE.PointLight(color, intensity, dist, 1.6);
  light.position.set(0, 4.3, 0);
  group.add(light);
  return { group, light, head };
}

/** Guirnalda de bombillas entre dos puntos. */
export function bulbString(a: THREE.Vector3, b: THREE.Vector3, n = 14, sag = 1.1): { group: THREE.Group; update: (t: number) => void } {
  const group = new THREE.Group();
  const bulbs: THREE.Mesh[] = [];
  const cols = [0xe8c070, 0x9c3c28, 0xe8c070, 0x76895a];
  const geo = new THREE.BoxGeometry(0.2, 0.26, 0.2);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    pts.push(p);
    if (i > 0 && i < n) { const m = new THREE.Mesh(geo, glow(cols[i % 4] as number)); m.position.copy(p).add(new THREE.Vector3(0, -0.2, 0)); group.add(m); bulbs.push(m); }
  }
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x120c18 })));
  return { group, update: (t: number) => { bulbs.forEach((m, i) => { m.visible = (Math.floor(t * 2.2) + i) % 3 !== 0; }); } };
}

/** Tambor de la tragaperras con una cara por símbolo. */
export function reelDrum(strip: THREE.Texture, r = 0.33, w = 0.34): THREE.Mesh {
  const g = new THREE.CylinderGeometry(r, r, w, 36, 1, true);
  g.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: strip, emissive: 0x302018, emissiveMap: strip, side: THREE.DoubleSide }));
  return m;
}

/** Máquina tragaperras (cuerpo, marquesina, tres ventanas, bandeja y palanca). */
export function slotMachine(): { group: THREE.Group; lever: THREE.Group; bulbs: THREE.Mesh[]; reelAnchors: THREE.Group[] } {
  const g = new THREE.Group();
  const red = lam(0x6a1822, tex('lacquer', () => noiseTex('#6a1822', 0.15)));
  const gold = lam(0xc4a050, tex('goldm', () => metalTex('#c4a050')));
  const dark = lam(0x07040a);
  // cuerpo hueco con ventana
  box(1.7, 0.5, 1.0, red, 0, 0.25, 0, g); // zócalo
  box(0.14, 1.5, 1.0, red, -0.78, 1.25, 0, g); box(0.14, 1.5, 1.0, red, 0.78, 1.25, 0, g);
  box(1.7, 0.42, 1.0, red, 0, 0.71, 0.0, g); // bajo la ventana
  box(1.7, 0.55, 1.0, red, 0, 2.25, 0, g); // marquesina
  box(1.5, 0.38, 0.9, dark, 0, 2.25, 0.08, g);
  box(1.46, 0.1, 0.1, gold, 0, 1.92, 0.5, g);
  box(1.46, 0.08, 0.1, gold, 0, 0.93, 0.5, g);
  box(1.5, 1.2, 0.1, dark, 0, 1.42, -0.42, g); // fondo
  box(1.7, 0.1, 0.34, gold, 0, 0.9, 0.58, g); // bandeja
  const reelAnchors: THREE.Group[] = [];
  [-0.5, 0, 0.5].forEach((x) => {
    const a = new THREE.Group();
    a.position.set(x, 1.42, 0.05);
    g.add(a);
    reelAnchors.push(a);
    box(0.04, 1.0, 0.9, gold, x + 0.25, 1.42, 0.0, g);
  });
  // bombillas de la marquesina
  const bulbs: THREE.Mesh[] = [];
  for (let i = 0; i < 12; i++) { const b = mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), glow(0xe8d090), -0.77 + i * 0.14, 2.5, 0.52, g); b.castShadow = false; bulbs.push(b); }
  // palanca
  const lever = new THREE.Group();
  lever.position.set(0.95, 1.1, 0.1);
  cyl(0.06, 0.06, 0.9, lam(0xa0a0b0), 0, 0.45, 0, lever, 6);
  mesh(new THREE.SphereGeometry(0.15, 10, 8), lam(0xb13e53), 0, 0.95, 0, lever);
  g.add(lever);
  box(0.2, 0.3, 0.3, lam(0x3a3248), 0.9, 1.0, 0.1, g);
  return { group: g, lever, bulbs, reelAnchors };
}

/** Mesa de ruleta con la rueda en un cuenco. */
export function rouletteTable(wheelTex: THREE.Texture): { group: THREE.Group; disk: THREE.Group; ball: THREE.Mesh; pointer: THREE.Mesh } {
  const g = new THREE.Group();
  const wood = lam(0x5a3a22, T.wood('#5a3a22'));
  const felt = lam(0x566a38, T.felt());
  box(4.6, 0.9, 3.0, wood, 0, 0.45, 0, g);
  box(4.4, 0.08, 2.8, felt, 0, 0.94, 0, g);
  box(4.6, 0.12, 0.12, lam(0xc4a050), 0, 0.97, 1.5, g); box(4.6, 0.12, 0.12, lam(0xc4a050), 0, 0.97, -1.5, g);
  // cuenco
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.1, 0.25, 36), lam(0x3a2418, T.wood('#3a2418')));
  bowl.position.set(-1.0, 1.02, 0); bowl.castShadow = bowl.receiveShadow = true; g.add(bowl);
  mesh(new THREE.TorusGeometry(1.3, 0.06, 6, 36), lam(0xc4a050), -1.0, 1.15, 0, g).rotation.x = Math.PI / 2;
  const disk = new THREE.Group();
  disk.position.set(-1.0, 1.16, 0);
  const face = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), new THREE.MeshLambertMaterial({ map: wheelTex, emissive: 0x201010, emissiveMap: wheelTex }));
  face.rotation.x = -Math.PI / 2;
  face.receiveShadow = true;
  disk.add(face);
  const hub = mesh(new THREE.ConeGeometry(0.28, 0.3, 14), lam(0xc4a050), 0, 0.12, 0, disk);
  hub.castShadow = false;
  g.add(disk);
  const ball = mesh(new THREE.SphereGeometry(0.06, 8, 6), glow(0xece0c0), -1.0, 1.3, 1.1, g);
  ball.castShadow = false;
  const pointer = mesh(new THREE.ConeGeometry(0.1, 0.22, 4), glow(0xe8d27a), -1.0, 1.38, 1.38, g);
  pointer.rotation.x = Math.PI;
  return { group: g, disk, ball, pointer };
}

/** Tiovivo: plataforma, techo a rayas y postes (los caballitos se añaden aparte). */
export function carousel(r = 2.4): { group: THREE.Group; spin: THREE.Group } {
  const g = new THREE.Group(), spin = new THREE.Group();
  g.add(spin);
  cyl(r + 0.2, r + 0.3, 0.3, lam(0x3a2418, T.wood('#3a2418')), 0, 0.15, 0, g, 24);
  cyl(r, r, 0.12, lam(0x7a2a20, T.wood('#7a2a20')), 0, 0.36, 0, spin, 24);
  cyl(0.25, 0.25, 3.2, lam(0xc4a050), 0, 1.9, 0, spin, 10);
  const st = tex('carstripes', () => stripeTex('#7a1428', '#c4b494'), [12, 1]);
  mesh(new THREE.ConeGeometry(r * 1.15, 1.2, 24, 1, true), lam(0xffffff, st, { side: THREE.DoubleSide }), 0, 3.9, 0, spin);
  mesh(new THREE.CylinderGeometry(r * 1.15, r * 1.15, 0.35, 24, 1, true), lam(0xffffff, st, { side: THREE.DoubleSide }), 0, 3.15, 0, spin);
  return { group: g, spin };
}

export { paperTex, curtainTex, dueltableTex, brickTex, woodTex, feltTex };
