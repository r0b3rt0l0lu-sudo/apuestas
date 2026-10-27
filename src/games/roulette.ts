import type { Curse } from '../core/nights';
import type { Rng } from '../core/rng';

/** El 00 se guarda como 37. */
export const DOUBLE_ZERO = 37;
export type Pocket = number;

/** Orden real de la rueda europea (37 casillas). */
export const EURO_WHEEL: readonly Pocket[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];
/** Con la maldición de la noche 4 se añade el 00 (orden de la rueda americana). */
export const DOUBLE_ZERO_WHEEL: readonly Pocket[] = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, DOUBLE_ZERO, 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2
];

export const wheelFor = (curses: readonly Curse[]): readonly Pocket[] =>
  curses.includes('doubleZero') ? DOUBLE_ZERO_WHEEL : EURO_WHEEL;

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export type PocketColor = 'rojo' | 'negro' | 'verde';

export const colorOf = (p: Pocket): PocketColor => (p === 0 || p === DOUBLE_ZERO ? 'verde' : RED.has(p) ? 'rojo' : 'negro');
export const labelOf = (p: Pocket): string => (p === DOUBLE_ZERO ? '00' : String(p));

export type RouletteBet =
  | { kind: 'pleno'; n: Pocket }
  | { kind: 'rojo' | 'negro' | 'par' | 'impar' | 'bajo' | 'alto' };

export const OUTSIDE_KINDS = ['rojo', 'negro', 'par', 'impar', 'bajo', 'alto'] as const;

function wins(bet: RouletteBet, p: Pocket): boolean {
  if (bet.kind === 'pleno') return bet.n === p;
  if (p === 0 || p === DOUBLE_ZERO) return false; // el 0 no gana ninguna exterior (devuelven la mitad, ver payoutFor)
  switch (bet.kind) {
    case 'rojo': return colorOf(p) === 'rojo';
    case 'negro': return colorOf(p) === 'negro';
    case 'par': return p % 2 === 0;
    case 'impar': return p % 2 === 1;
    case 'bajo': return p >= 1 && p <= 18;
    case 'alto': return p >= 19 && p <= 36;
  }
}

/** Total devuelto (incluye lo apostado): pleno ×36, exteriores ×2; el 0 (y el 00) devuelve la mitad de las exteriores. */
export function payoutFor(bet: RouletteBet, chip: number, p: Pocket): number {
  if (bet.kind !== 'pleno' && (p === 0 || p === DOUBLE_ZERO)) return chip / 2;
  if (!wins(bet, p)) return 0;
  return chip * (bet.kind === 'pleno' ? 36 : 2);
}

export function spin(rng: Rng, curses: readonly Curse[]): Pocket {
  return rng.pick(wheelFor(curses));
}

/**
 * Ángulo final (rad, en sentido horario desde arriba) de la rueda para que
 * `pocket` quede bajo el puntero tras `turns` vueltas completas.
 */
export function finalAngle(wheel: readonly Pocket[], pocket: Pocket, turns: number): number {
  const i = wheel.indexOf(pocket);
  if (i < 0) throw new Error('Casilla fuera de la rueda');
  const step = (Math.PI * 2) / wheel.length;
  return turns * Math.PI * 2 - i * step;
}

/** Retorno medio de la ruleta: un pleno, o una apuesta exterior (con la mitad devuelta si sale el 0 / 00). */
export function rouletteRtp(kind: 'pleno' | 'exterior', doubleZero: boolean): number {
  const n = doubleZero ? 38 : 37;
  return kind === 'pleno' ? 36 / n : (18 * 2 + (doubleZero ? 2 : 1) * 0.5) / n;
}
