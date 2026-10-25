import { phraseCycle } from '../core/phrases';
import { Rng } from '../core/rng';
import { session } from '../core/session';
import { T } from '../i18n/es';

let pick: ((l: readonly string[]) => string) | null = null;
let seed = -1;

/** Frase del Cobrador elegida con el RNG de la partida, sin repetir la última. */
export function phrase(list: readonly string[]): string {
  if (!pick || seed !== session.run.seed) { seed = session.run.seed; pick = phraseCycle(new Rng(session.run.seed ^ 0xc0b4)) as (l: readonly string[]) => string; }
  return pick(list);
}

export function phraseFor(game: 'slots' | 'roulette' | 'race', lost: boolean, actionsLeft: number, balance: number, quota: number): string {
  if (lost && actionsLeft <= 3 && balance < quota) return phrase(T.lines.low);
  const l = T.lines;
  const list = game === 'slots' ? (lost ? l.slotsLose : l.slotsWin) : game === 'roulette' ? (lost ? l.rouletteLose : l.rouletteWin) : (lost ? l.raceLose : l.raceWin);
  return phrase(list);
}
