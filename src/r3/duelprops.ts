import * as THREE from 'three';
import type { Item } from '../games/duel';
import { box, cyl, glow, lam, mesh } from './models';

/** Trabuco: cañón con boca acampanada, culata de madera y guardamonte. Apunta hacia -z. */
export function blunderbuss(): THREE.Group {
  const g = new THREE.Group();
  const steel = lam(0x6a6070), brass = lam(0xa88a4a), wood = lam(0x6a3a20);
  const barrel = cyl(0.045, 0.05, 1.0, steel, 0, 0, -0.45, g, 10);
  barrel.rotation.x = Math.PI / 2;
  const flare = mesh(new THREE.CylinderGeometry(0.16, 0.05, 0.28, 12, 1, true), lam(0xa88a4a, null, { side: THREE.DoubleSide }), 0, 0, -1.08, g);
  flare.rotation.x = Math.PI / 2;
  [-0.2, -0.6].forEach((z) => { const b = cyl(0.06, 0.06, 0.05, brass, 0, 0, z, g, 10); b.rotation.x = Math.PI / 2; });
  box(0.1, 0.12, 0.34, brass, 0, 0, 0.05, g);
  const stock = box(0.1, 0.16, 0.7, wood, 0, -0.04, 0.55, g);
  stock.rotation.x = -0.12;
  box(0.1, 0.22, 0.2, wood, 0, -0.16, 0.9, g);
  const guard = mesh(new THREE.TorusGeometry(0.06, 0.012, 4, 10, Math.PI), brass, 0, -0.1, 0.12, g);
  guard.rotation.z = Math.PI;
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

export function candle(): { group: THREE.Group; flame: THREE.Mesh; setLit: (on: boolean) => void } {
  const g = new THREE.Group();
  cyl(0.075, 0.075, 0.3, lam(0xe4dcc0), 0, 0.15, 0, g, 8);
  cyl(0.1, 0.1, 0.04, lam(0xa88a4a), 0, 0.02, 0, g, 8);
  const flame = mesh(new THREE.ConeGeometry(0.05, 0.16, 6), glow(0xf0a030), 0, 0.38, 0, g);
  flame.castShadow = false;
  const smoke = mesh(new THREE.CylinderGeometry(0.01, 0.025, 0.25, 4), new THREE.MeshBasicMaterial({ color: 0x5a5268, transparent: true, opacity: 0.55 }), 0, 0.45, 0, g);
  smoke.visible = false;
  return { group: g, flame, setLit: (on: boolean) => { flame.visible = on; smoke.visible = !on; } };
}

/** Objetos del duelo en miniatura 3D. */
export function itemMesh(item: Item): THREE.Group {
  const g = new THREE.Group();
  const gold = lam(0xc4a050), brass = lam(0xa88a4a);
  switch (item) {
    case 'monoculo': {
      const ring = mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 18), gold, 0, 0.03, 0, g);
      ring.rotation.x = Math.PI / 2;
      const glass = mesh(new THREE.CircleGeometry(0.14, 16), new THREE.MeshBasicMaterial({ color: 0xc4d0c8 }), 0, 0.03, 0, g);
      glass.rotation.x = -Math.PI / 2;
      for (let i = 0; i < 6; i++) mesh(new THREE.SphereGeometry(0.018, 5, 4), gold, 0.18 + i * 0.045, 0.02, 0.04 * Math.sin(i), g);
      break;
    }
    case 'moneda': cyl(0.17, 0.17, 0.035, gold, 0, 0.02, 0, g, 16); mesh(new THREE.BoxGeometry(0.02, 0.01, 0.2), lam(0x5a4a20), 0, 0.04, 0, g); break;
    case 'vela': { const c = candle(); g.add(c.group); break; }
    case 'reloj': {
      cyl(0.15, 0.15, 0.03, brass, 0, 0.015, 0, g, 12); cyl(0.15, 0.15, 0.03, brass, 0, 0.5, 0, g, 12);
      mesh(new THREE.ConeGeometry(0.12, 0.22, 10), lam(0xe4dcc0), 0, 0.16, 0, g);
      mesh(new THREE.ConeGeometry(0.12, 0.22, 10), lam(0xe4dcc0), 0, 0.38, 0, g).rotation.x = Math.PI;
      for (const [x, z] of [[-0.13, 0], [0.13, 0], [0, -0.13], [0, 0.13]] as const) cyl(0.012, 0.012, 0.48, brass, x, 0.26, z, g, 4);
      break;
    }
    case 'polvora': {
      cyl(0.17, 0.17, 0.34, lam(0x7a4a2a), 0, 0.17, 0, g, 12);
      [0.06, 0.28].forEach((y) => cyl(0.18, 0.18, 0.025, brass, 0, y, 0, g, 12));
      cyl(0.015, 0.015, 0.12, lam(0x120c18), 0, 0.4, 0, g, 4);
      break;
    }
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

/** Cartucho de escopeta. */
export function shell(real: boolean): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 10), lam(real ? 0x9c3c28 : 0x7a7068));
  m.rotation.z = Math.PI / 2;
  m.castShadow = true;
  const cap = mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.06, 10), lam(0xc4a050), 0, -0.12, 0, m);
  void cap;
  return m;
}

/** Foco de teatro colgado: lata con compuertas, cable y cristal que brilla. */
export function spotCan(): THREE.Group {
  const g = new THREE.Group();
  const dark = lam(0x201820), mid = lam(0x3a2c34);
  const can = cyl(0.26, 0.2, 0.6, dark, 0, 0, 0, g, 12);
  can.rotation.x = Math.PI / 2;
  const lens = mesh(new THREE.CircleGeometry(0.24, 14), glow(0xf0e0b0), 0, 0, -0.31, g);
  lens.castShadow = false;
  [[0, 0.3], [0, -0.3], [0.3, 0], [-0.3, 0]].forEach(([x, y], i) => {
    const d = box(i < 2 ? 0.5 : 0.04, i < 2 ? 0.04 : 0.5, 0.34, mid, x, y, -0.45, g);
    d.rotation.x = i === 0 ? -0.5 : i === 1 ? 0.5 : 0;
    d.rotation.y = i === 2 ? 0.5 : i === 3 ? -0.5 : 0;
  });
  cyl(0.015, 0.015, 3, lam(0x120c18), 0, 1.6, 0.1, g, 4);
  return g;
}
