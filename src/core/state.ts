import { type Game, TABLES, canPlay, canPlayAny } from './economy';
import { ENDLESS, LAST_NIGHT, MIN_CARRY, mortgageOffers, nightDef, tollFor } from './nights';
import { Rng } from './rng';

export type Phase = 'hub' | 'playing' | 'duel' | 'dawn' | 'dead' | 'ending';

export interface NightResult {
  night: number;
  quota: number;
  /** Saldo al cerrar la noche (antes de pagar). */
  balance: number;
  outcome: 'paid' | 'duel';
}

export type Mode = 'campaign' | 'endless';

/** Estadísticas de la partida: para el resumen al morir y el manual. */
export interface RunStats {
  plays: number;
  /** Jugadas en las que cobraste más de lo apostado. */
  wins: number;
  /** Mayor ganancia neta en una jugada. */
  biggestWin: number;
  wagered: number;
  returned: number;
}

export const emptyStats = (): RunStats => ({ plays: 0, wins: 0, biggestWin: 0, wagered: 0, returned: 0 });

export interface RunState {
  version: 1;
  /** Campaña de 7 noches o modo infinito. */
  mode: Mode;
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
  /** Estadísticas de toda la partida. */
  stats: RunStats;
  /** Modo infinito: jugadas resueltas, saldo máximo alcanzado, cobros de la casa y el último importe. */
  plays: number;
  peak: number;
  tolls: number;
  lastToll: number;
  flags: Record<string, boolean>;
}

export type Action =
  | { type: 'enterTable' }
  | { type: 'leaveTable' }
  | { type: 'resolve'; game: Game; bet: number; payout: number; rng: number }
  | { type: 'mortgage'; amount: number }
  | { type: 'find'; key: string; chips: number }
  | { type: 'sleep' }
  | { type: 'duelResult'; won: boolean }
  | { type: 'nextNight' }
  | { type: 'flag'; key: string };

export const SAVE_VERSION = 1 as const;

export function newRun(seed: number, mode: Mode = 'campaign'): RunState {
  const def = nightDef(1);
  const endless = mode === 'endless';
  const start = endless ? ENDLESS.start : (def.startBalance ?? MIN_CARRY);
  return {
    version: SAVE_VERSION,
    mode,
    seed: seed >>> 0,
    rng: new Rng(seed ^ 0x9e3779b9).state,
    night: 1,
    balance: start,
    actionsLeft: endless ? ENDLESS.actions : def.actions,
    history: [],
    phase: 'hub',
    forgiven: false,
    debt: 0,
    mortgaged: false,
    stats: emptyStats(),
    plays: 0,
    peak: start,
    tolls: 0,
    lastToll: 0,
    flags: endless ? { casino: true, tutorial: true, 'intro-1': true } : {}
  };
}

/** Cuota de la noche más la hipoteca pedida. */
export const quotaOf = (s: RunState): number => (s.mode === 'endless' ? 0 : nightDef(s.night).quota + s.debt);
export const canMortgage = (s: RunState): boolean => s.mode === 'campaign' && s.phase === 'hub' && !s.mortgaged;
export const quotaMet = (s: RunState): boolean => s.balance >= quotaOf(s);
export const rngOf = (s: RunState): Rng => new Rng(s.rng);

/** Cierra la noche si ya no se puede seguir jugando. */
function settle(s: RunState): RunState {
  if (s.phase !== 'hub' && s.phase !== 'playing') return s;
  if (s.mode === 'endless') {
    // romper la banca es ganar; quedarse sin fichas para la apuesta mínima es perder
    if (s.peak >= ENDLESS.bankBreak) return { ...s, phase: 'ending' };
    return canPlayAny(s.balance, s.actionsLeft) ? s : { ...s, phase: 'dead' };
  }
  if (canPlayAny(s.balance, s.actionsLeft)) return s;
  return { ...s, phase: quotaMet(s) ? 'dawn' : 'duel' };
}

function record(s: RunState, outcome: NightResult['outcome']): NightResult[] {
  return [...s.history, { night: s.night, quota: quotaOf(s), balance: s.balance, outcome }];
}

/** Modo infinito: cuenta la jugada, anota el máximo y, cada pocas jugadas, la casa cobra. */
function endlessTurn(s: RunState): RunState {
  const plays = s.plays + 1;
  const peak = Math.max(s.peak, s.balance);
  if (plays % ENDLESS.tollEvery !== 0) return { ...s, plays, peak };
  const toll = tollFor(s.tolls, s.balance);
  return { ...s, plays, peak, balance: s.balance - toll, tolls: s.tolls + 1, lastToll: toll };
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
      const played: RunState = {
        ...s,
        rng: a.rng,
        balance: s.balance - a.bet + Math.max(0, a.payout),
        actionsLeft: s.actionsLeft - TABLES[a.game].cost,
        peak: Math.max(s.peak, s.balance - a.bet + Math.max(0, a.payout)),
        stats: {
          plays: s.stats.plays + 1,
          wins: s.stats.wins + (a.payout > a.bet ? 1 : 0),
          biggestWin: Math.max(s.stats.biggestWin, a.payout - a.bet),
          wagered: s.stats.wagered + a.bet,
          returned: s.stats.returned + Math.max(0, a.payout)
        }
      };
      return settle(s.mode === 'endless' ? endlessTurn(played) : played);
    }
    case 'mortgage': {
      if (!canMortgage(s)) return s;
      const offer = mortgageOffers(s.night).find((o) => o.amount === a.amount);
      if (!offer) return s;
      return { ...s, balance: s.balance + offer.amount, debt: s.debt + offer.owed, mortgaged: true };
    }
    case 'find':
      // un hallazgo del pasillo solo cuenta una vez por partida
      if (s.flags[a.key]) return s;
      return { ...s, flags: { ...s.flags, [a.key]: true }, balance: s.balance + Math.max(0, a.chips), peak: Math.max(s.peak, s.balance + Math.max(0, a.chips)) };
    case 'sleep':
      // Esperar al amanecer solo si se llega a la cuota.
      if (s.mode === 'campaign' && (s.phase === 'hub' || s.phase === 'playing') && quotaMet(s)) {
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
