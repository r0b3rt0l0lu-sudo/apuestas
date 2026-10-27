import type { Curse } from '../core/nights';
import type { Rng } from '../core/rng';

export type Skin = 'clasico' | 'esqueleto' | 'quemado' | 'ahogado' | 'luto' | 'porcelana' | 'trapo';

export interface HorseDef {
  num: number;
  name: string;
  skin: Skin;
  body: string;
  mane: string;
  pays: number;
  prob: number;
}

export const HORSES: readonly HorseDef[] = [
  { num: 1, name: 'Ceniza', skin: 'clasico', body: '#A8A4B4', mane: '#2E2A3C', pays: 3.4, prob: 0.29 },
  { num: 2, name: 'Óxido', skin: 'clasico', body: '#B0602E', mane: '#2A140A', pays: 4.5, prob: 0.22 },
  { num: 3, name: 'Hueso', skin: 'esqueleto', body: '#E8E0C8', mane: '#9C9278', pays: 5.7, prob: 0.17 },
  { num: 4, name: 'Brasa', skin: 'quemado', body: '#3A302A', mane: '#241C18', pays: 6.9, prob: 0.14 },
  { num: 5, name: 'Ahogada', skin: 'ahogado', body: '#5E7A72', mane: '#2E4A3A', pays: 9, prob: 0.11 },
  { num: 6, name: 'Viuda', skin: 'luto', body: '#2E2834', mane: '#0D0A0E', pays: 13.7, prob: 0.07 }
];

/** Probabilidades de victoria; la maldición de la noche 5 favorece a Viuda y castiga a Ceniza. */
export function probsFor(curses: readonly Curse[]): number[] {
  const p = HORSES.map((h) => h.prob);
  if (curses.includes('widowFast')) {
    p[5] = 0.1;
    p[0] = 0.26;
  }
  return p;
}

export interface RaceResult {
  winner: number;
  /** Orden de llegada (índices de caballo, primero = ganador). */
  order: number[];
  /** Tiempo en ms de cada caballo hasta la meta. */
  times: number[];
  /** Total devuelto para una apuesta al caballo `pick`. */
  payout: (pick: number, bet: number) => number;
}

/** Primero se sortea el ganador; después se generan tiempos coherentes con ese orden. */
export function run(rng: Rng, curses: readonly Curse[]): RaceResult {
  const probs = probsFor(curses);
  const winner = rng.weighted(probs);
  const rest = HORSES.map((_, i) => i).filter((i) => i !== winner);
  const order = [winner];
  const pool = rest.slice();
  const w = (i: number) => probs[i] ?? 0;
  while (pool.length > 0) {
    const k = rng.weighted(pool.map(w));
    order.push(pool.splice(k, 1)[0] as number);
  }
  const times: number[] = new Array<number>(HORSES.length).fill(0);
  let t = 9000 + rng.int(-500, 500);
  order.forEach((horse, place) => {
    if (place > 0) t += rng.int(250, 700); // distancia entre llegadas
    times[horse] = t;
  });
  return {
    winner,
    order,
    times,
    payout: (pick, bet) => (pick === winner ? Math.round(bet * (HORSES[pick]?.pays ?? 0)) : 0)
  };
}

/** Parámetros de la curva de velocidad de cada caballo (distintos para que haya adelantamientos). */
const CURVES = HORSES.map((_, i) => ({ amp: 0.035 + (i % 3) * 0.012, k: 2 + (i % 3), phase: i * 1.3 }));

/**
 * Progreso 0..1 del caballo `i` en el instante `t` (ms) si llega a meta en `finish`.
 * Siempre sale en 0 y llega a 1 exactamente a `finish`.
 */
export function progress(i: number, t: number, finish: number): number {
  const u = Math.min(1, Math.max(0, t / finish));
  const c = CURVES[i] ?? { amp: 0.04, k: 2, phase: 0 };
  const wobble = c.amp * Math.sin(Math.PI * c.k * u + c.phase) - c.amp * Math.sin(c.phase) * (1 - u);
  return Math.min(1, Math.max(0, u + wobble * Math.sin(Math.PI * u)));
}
