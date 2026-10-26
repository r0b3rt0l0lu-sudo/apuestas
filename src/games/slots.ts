import type { Curse } from '../core/nights';
import type { Rng } from '../core/rng';

export const SYMBOLS = ['ojo', 'diente', 'polilla', 'llave', 'calavera', 'siete'] as const;
export type SlotSymbol = (typeof SYMBOLS)[number];

export const WEIGHTS: Record<SlotSymbol, number> = { ojo: 5, diente: 4, polilla: 3, llave: 3, calavera: 2, siete: 1 };
export const TRIPLE_PAY: Record<SlotSymbol, number> = { ojo: 5, diente: 8, polilla: 15, llave: 25, calavera: 40, siete: 100 };

export interface SlotResult {
  reels: [SlotSymbol, SlotSymbol, SlotSymbol];
  /** Total devuelto (incluye lo apostado). 0 si pierdes. */
  payout: number;
}

export function payoutFor(reels: readonly SlotSymbol[], bet: number): number {
  const [a, b, c] = reels;
  if (a !== undefined && a === b && b === c) return bet * TRIPLE_PAY[a];
  // dos iguales (cualquier símbolo): te devuelve la apuesta
  if (a === b || a === c || b === c) return bet;
  return 0;
}

export function spin(rng: Rng, bet: number): SlotResult {
  const w = SYMBOLS.map((s) => WEIGHTS[s]);
  const pick = () => SYMBOLS[rng.weighted(w)] as SlotSymbol;
  const reels: SlotResult['reels'] = [pick(), pick(), pick()];
  return { reels, payout: payoutFor(reels, bet) };
}

/** Milisegundos a los que paran los rodillos; la maldición alarga el tercero. */
export function stopTimes(curses: readonly Curse[]): [number, number, number] {
  return [900, 1400, curses.includes('slotReel3') ? 3000 : 2100];
}

export type CobradorMood = 'acecho' | 'sonrisa' | 'cobra';

export function moodAfter(lost: boolean, actionsLeft: number, balance: number, quota: number): CobradorMood {
  if (actionsLeft <= 3 && balance < quota) return 'cobra';
  return lost ? 'sonrisa' : 'acecho';
}
