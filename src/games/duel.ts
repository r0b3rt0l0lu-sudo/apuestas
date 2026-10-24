import type { Curse } from '../core/nights';
import type { Rng } from '../core/rng';

export type Who = 'player' | 'boss';
export type Shell = 'real' | 'fogueo';
export type Item = 'monoculo' | 'moneda' | 'vela' | 'reloj' | 'polvora';
export const ITEMS: readonly Item[] = ['monoculo', 'moneda', 'vela', 'reloj', 'polvora'];

export const BASE_CANDLES = 4;
export const MAX_ITEMS = 6;

export interface DuelState {
  hp: Record<Who, number>;
  maxHp: Record<Who, number>;
  chamber: Shell[];
  /** Recuento inicial de la ronda (se enseña 3 s y se oculta). */
  loaded: { real: number; fogueo: number };
  items: Record<Who, Item[]>;
  /** El cartucho cargado, si ese bando lo conoce (monóculo). */
  known: Record<Who, Shell | null>;
  skip: Record<Who, boolean>;
  powder: Record<Who, boolean>;
  turn: Who;
  round: number;
  winner: Who | null;
}

export type DuelAction = { kind: 'shoot'; target: 'self' | 'other' } | { kind: 'use'; item: Item };

export interface ShotEvent {
  shooter: Who;
  target: Who;
  shell: Shell;
  damage: number;
  extraTurn: boolean;
}

const opp = (w: Who): Who => (w === 'player' ? 'boss' : 'player');

function loadRound(s: DuelState, rng: Rng): void {
  const total = rng.int(3, 8);
  const real = rng.int(1, total - 1);
  const shells: Shell[] = [];
  for (let i = 0; i < total; i++) shells.push(i < real ? 'real' : 'fogueo');
  s.chamber = rng.shuffle(shells);
  s.loaded = { real, fogueo: total - real };
  s.known = { player: null, boss: null };
  s.round += 1;
  for (const who of ['player', 'boss'] as const) {
    for (let i = 0; i < 2 && s.items[who].length < MAX_ITEMS; i++) s.items[who].push(rng.pick(ITEMS));
  }
}

export function newDuel(rng: Rng, curses: readonly Curse[]): DuelState {
  const bossHp = BASE_CANDLES + (curses.includes('duelCandle') ? 1 : 0);
  const s: DuelState = {
    hp: { player: BASE_CANDLES, boss: bossHp },
    maxHp: { player: BASE_CANDLES, boss: bossHp },
    chamber: [],
    loaded: { real: 0, fogueo: 0 },
    items: { player: [], boss: [] },
    known: { player: null, boss: null },
    skip: { player: false, boss: false },
    powder: { player: false, boss: false },
    turn: 'player',
    round: 0,
    winner: null
  };
  loadRound(s, rng);
  return s;
}

const clone = (s: DuelState): DuelState => structuredClone(s);

export function liveRatio(s: DuelState): number {
  const real = s.chamber.filter((c) => c === 'real').length;
  return s.chamber.length === 0 ? 0 : real / s.chamber.length;
}

/** Dispara. Devuelve el nuevo estado y qué ha pasado, para animarlo. */
export function shoot(state: DuelState, rng: Rng, target: 'self' | 'other'): { state: DuelState; event: ShotEvent } {
  const s = clone(state);
  const shooter = s.turn;
  const victim = target === 'self' ? shooter : opp(shooter);
  const shell = s.chamber.shift();
  if (!shell) throw new Error('Cámara vacía');
  s.known = { player: null, boss: null };
  const damage = shell === 'real' ? (s.powder[shooter] ? 2 : 1) : 0;
  s.powder[shooter] = false;
  s.hp[victim] = Math.max(0, s.hp[victim] - damage);

  const extraTurn = target === 'self' && shell === 'fogueo';
  if (s.hp[victim] === 0) {
    s.winner = victim === 'boss' ? 'player' : 'boss';
  } else if (!extraTurn) {
    const next = opp(shooter);
    if (s.skip[next]) {
      s.skip[next] = false; // pierde el turno: repite el que disparó
    } else {
      s.turn = next;
    }
  }
  if (s.winner === null && s.chamber.length === 0) loadRound(s, rng);
  return { state: s, event: { shooter, target: victim, shell, damage, extraTurn } };
}

export function useItem(state: DuelState, item: Item): DuelState {
  const s = clone(state);
  const who = s.turn;
  const idx = s.items[who].indexOf(item);
  if (idx < 0) throw new Error(`No tienes ${item}`);
  s.items[who].splice(idx, 1);
  const flip = (c: Shell): Shell => (c === 'real' ? 'fogueo' : 'real');
  switch (item) {
    case 'monoculo': s.known[who] = s.chamber[0] ?? null; break;
    case 'moneda': {
      const c = s.chamber[0];
      if (c) s.chamber[0] = flip(c);
      for (const w of ['player', 'boss'] as const) {
        if (s.known[w]) s.known[w] = s.chamber[0] ?? null;
      }
      break;
    }
    case 'vela': s.hp[who] = Math.min(s.maxHp[who], s.hp[who] + 1); break;
    case 'reloj': s.skip[opp(who)] = true; break;
    case 'polvora': s.powder[who] = true; break;
  }
  return s;
}

/** IA del Cobrador (§6), función pura. */
export function decide(s: DuelState, rng: Rng): DuelAction {
  const items = s.items.boss;
  const has = (i: Item) => items.includes(i);
  if (has('reloj') && !s.skip.player) return { kind: 'use', item: 'reloj' };
  if (has('vela') && s.hp.boss < s.maxHp.boss) return { kind: 'use', item: 'vela' };
  if (has('monoculo') && s.known.boss === null) return { kind: 'use', item: 'monoculo' };
  if (s.known.boss === 'fogueo' && has('moneda')) return { kind: 'use', item: 'moneda' };

  let target: 'self' | 'other';
  let likelyReal: boolean;
  if (s.known.boss) {
    target = s.known.boss === 'real' ? 'other' : 'self';
    likelyReal = s.known.boss === 'real';
  } else {
    const ratio = liveRatio(s);
    target = ratio > 0.5 ? 'other' : ratio < 0.5 ? 'self' : rng.chance(0.5) ? 'other' : 'self';
    likelyReal = ratio >= 0.6;
  }
  if (target === 'other' && likelyReal && has('polvora') && !s.powder.boss) return { kind: 'use', item: 'polvora' };
  return { kind: 'shoot', target };
}
