import { session } from '../core/session';
import { el } from '../ui/dom/kit';

const S = 6;
const X0 = -16.6, Z0 = -17.9;
const W = 208, H = 152;
const ROOMS: Array<{ id: string; x0: number; x1: number; z0: number; z1: number }> = [
  { id: 'main', x0: -6.8, x1: 6.8, z0: -8.6, z1: 6.6 },
  { id: 'mirrors', x0: -16, x1: -6.8, z0: -4.6, z1: 1.6 },
  { id: 'storage', x0: 6.8, x1: 17, z0: -3.6, z1: 7 },
  { id: 'archive', x0: -9.6, x1: -0.8, z0: -17.6, z1: -8.6 }
];
const DOORS = [[-6.8, -1.5, false], [6.8, 1.8, false], [-5.2, -8.6, true], [0, 6.6, true]] as const;
const MARKS = [['#e8d27a', -5.9, 1.0], ['#c24a3a', -1.1, -4.0], ['#76895a', 4.4, -3.4], ['#ece0c0', 0, -7.5]] as const;

const cx = (x: number): number => Math.round((x - X0) * S);
const cz = (z: number): number => Math.round((z - Z0) * S);

/** Plano del pasillo: las salas se dibujan al visitarlas; marca tu posición, hacia dónde miras y a El Cobrador. */
export class Minimap {
  readonly canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D | null;
  private visited = new Set<string>(['main']);
  private acc = 0;

  constructor(parent: HTMLElement) {
    this.canvas = el('canvas', 'minimap', '', parent);
    this.canvas.width = W;
    this.canvas.height = H;
    this.g = this.canvas.getContext('2d');
  }

  update(dt: number, room: string | null, px: number, pz: number, yaw: number, cobX: number, cobZ: number): void {
    this.visited.add(room ?? 'main');
    const on = session.options.minimap;
    this.canvas.style.display = on ? 'block' : 'none';
    this.acc += dt;
    if (!on || this.acc < 0.1 || !this.g) return;
    this.acc = 0;
    const g = this.g;
    g.clearRect(0, 0, W, H);
    for (const r of ROOMS) {
      const seen = this.visited.has(r.id);
      g.fillStyle = seen ? '#26090e' : '#120508';
      g.fillRect(cx(r.x0), cz(r.z0), cx(r.x1) - cx(r.x0), cz(r.z1) - cz(r.z0));
      g.strokeStyle = seen ? '#948068' : '#3c0f14';
      g.lineWidth = 2;
      g.strokeRect(cx(r.x0) + 1, cz(r.z0) + 1, cx(r.x1) - cx(r.x0) - 2, cz(r.z1) - cz(r.z0) - 2);
      if (!seen) { g.fillStyle = '#561a1a'; g.font = '28px VT323, monospace'; g.textAlign = 'center'; g.fillText('?', (cx(r.x0) + cx(r.x1)) / 2, (cz(r.z0) + cz(r.z1)) / 2 + 8); }
    }
    for (const [x, z, red] of DOORS) { g.fillStyle = red ? '#c24a3a' : '#c4b494'; g.fillRect(cx(x) - (red ? 6 : 2), cz(z) - (red ? 2 : 6), red ? 12 : 4, red ? 4 : 12); }
    for (const [col, x, z] of MARKS) { g.fillStyle = col; g.fillRect(cx(x) - 3, cz(z) - 3, 6, 6); }
    // El Cobrador (parpadea) y tú
    g.fillStyle = Math.floor(performance.now() / 400) % 2 ? '#e0503c' : '#7a1e1e';
    g.fillRect(cx(cobX) - 3, cz(cobZ) - 3, 6, 6);
    g.strokeStyle = '#ece0c0'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx(px), cz(pz)); g.lineTo(cx(px) - Math.sin(yaw) * 14, cz(pz) - Math.cos(yaw) * 14); g.stroke();
    g.fillStyle = '#ece0c0'; g.fillRect(cx(px) - 3, cz(pz) - 3, 6, 6);
  }
}
