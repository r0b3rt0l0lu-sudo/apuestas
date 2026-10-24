export type Game = 'slots' | 'roulette' | 'race';

export interface TableRules {
  /** Acciones que consume una jugada. */
  cost: number;
  bets: readonly number[];
}

export const TABLES: Record<Game, TableRules> = {
  slots: { cost: 1, bets: [50, 100, 250] },
  roulette: { cost: 2, bets: [50, 100, 250, 500] },
  race: { cost: 3, bets: [100, 250, 500] }
};

export const GAMES: readonly Game[] = ['slots', 'roulette', 'race'];

export const minBet = (g: Game): number => TABLES[g].bets[0] as number;

/** ¿Se puede jugar esta mesa con lo que queda? */
export function canPlay(g: Game, balance: number, actionsLeft: number): boolean {
  return actionsLeft >= TABLES[g].cost && balance >= minBet(g);
}

export const canPlayAny = (balance: number, actionsLeft: number): boolean =>
  GAMES.some((g) => canPlay(g, balance, actionsLeft));
