import { type Game, TABLES, canPlay, canPlayAny } from './economy';
import { LAST_NIGHT, MIN_CARRY, mortgageOffers, nightDef } from './nights';
import { Rng } from './rng';

export type Phase = 'hub' | 'playing' | 'duel' | 'dawn' | 'dead' | 'ending';

export interface NightResult {
  night: number;
  quota: number;
  /** Saldo al cerrar la noche (antes de pagar). */
  balance: number;
  outcome: 'paid' | 'duel';
}

export interface RunState {
  version: 1;
  seed: number;
  /** Estado del RNG: la misma partida se reproduce exacta tras recargar. */
  rng: number;
  night: number;
  balance: number;
  actionsLeft: number;
  history: NightResult[];
  phase: Phase;
  /** El duelo ganado perdona la cuota de esta noche (y la hipoteca). */
  forgiven: boolean;
  /** Fichas que la hipoteca de esta noche suma a la cuota. */
  debt: number;
  /** Ya se pidió la hipoteca de esta noche (solo una por noche). */
  mortgaged: boolean;
  flags: Record<string, boolean>;
}

export type Action =
  | { type: 'enterTable' }
  | { type: 'leaveTable' }
  | { type: 'resolve'; game: Game; bet: number; payout: number; rng: number }
  | { type: 'mortgage'; amount: number }
  | { type: 'sleep' }
  | { type: 'duelResult'; won: boolean }
  | { type: 'nextNight' }
  | { type: 'flag'; key: string };

export const SAVE_VERSION = 1 as const;

export function newRun(seed: number): RunState {
  const def = nightDef(1);
  return {
    version: SAVE_VERSION,
    seed: seed >>> 0,
    rng: new Rng(seed ^ 0x9e3779b9).state,
    night: 1,
    balance: def.startBalance ?? MIN_CARRY,
    actionsLeft: def.actions,
    history: [],
    phase: 'hub',
    forgiven: false,
    debt: 0,
    mortgaged: false,
    flags: {}
  };
}

/** Cuota de la noche más la hipoteca pedida. */
export const quotaOf = (s: RunState): number => nightDef(s.night).quota + s.debt;
export const canMortgage = (s: RunState): boolean => s.phase === 'hub' && !s.mortgaged;
export const quotaMet = (s: RunState): boolean => s.balance >= quotaOf(s);
export const rngOf = (s: RunState): Rng => new Rng(s.rng);

/** Cierra la noche si ya no se puede seguir jugando. */
function settle(s: RunState): RunState {
  if (s.phase !== 'hub' && s.phase !== 'playing') return s;
  if (canPlayAny(s.balance, s.actionsLeft)) return s;
  return { ...s, phase: quotaMet(s) ? 'dawn' : 'duel' };
}

function record(s: RunState, outcome: NightResult['outcome']): NightResult[] {
  return [...s.history, { night: s.night, quota: quotaOf(s), balance: s.balance, outcome }];
}

/** Transiciones puras del estado de la partida. */
export function apply(s: RunState, a: Action): RunState {
  switch (a.type) {
    case 'enterTable':
      return s.phase === 'hub' ? { ...s, phase: 'playing' } : s;
    case 'leaveTable':
      return s.phase === 'playing' ? { ...s, phase: 'hub' } : s;
    case 'resolve': {
      if (s.phase !== 'playing') return s;
      if (!TABLES[a.game].bets.includes(a.bet)) return s;
      if (!canPlay(a.game, s.balance, s.actionsLeft) || a.bet > s.balance) return s;
      return settle({
        ...s,
        rng: a.rng,
        balance: s.balance - a.bet + Math.max(0, a.payout),
        actionsLeft: s.actionsLeft - TABLES[a.game].cost
      });
    }
    case 'mortgage': {
      if (!canMortgage(s)) return s;
      const offer = mortgageOffers(s.night).find((o) => o.amount === a.amount);
      if (!offer) return s;
      return { ...s, balance: s.balance + offer.amount, debt: s.debt + offer.owed, mortgaged: true };
    }
    case 'sleep':
      // Esperar al amanecer solo si se llega a la cuota.
      if ((s.phase === 'hub' || s.phase === 'playing') && quotaMet(s)) {
        return { ...s, phase: 'dawn' };
      }
      return s;
    case 'duelResult':
      if (s.phase !== 'duel') return s;
      return a.won
        ? { ...s, phase: 'dawn', forgiven: true, history: record(s, 'duel') }
        : { ...s, phase: 'dead' };
    case 'nextNight': {
      if (s.phase !== 'dawn') return s;
      const history = s.forgiven ? s.history : record(s, 'paid');
      const paid = s.forgiven ? s.balance : s.balance - quotaOf(s);
      if (s.night >= LAST_NIGHT) return { ...s, history, balance: paid, phase: 'ending' };
      const next = nightDef(s.night + 1);
      return {
        ...s,
        history,
        night: next.night,
        balance: Math.max(paid, MIN_CARRY),
        actionsLeft: next.actions,
        forgiven: false,
        debt: 0,
        mortgaged: false,
        phase: 'hub'
      };
    }
    case 'flag':
      return { ...s, flags: { ...s.flags, [a.key]: true } };
  }
}
