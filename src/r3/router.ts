import type { Game } from '../core/economy';
import { session } from '../core/session';
import { engine } from './engine';
import { Dawn3D } from './stages/Dawn3D';
import { Death3D } from './stages/Death3D';
import { Duel3D } from './stages/Duel3D';
import { Ending3D } from './stages/Ending3D';
import { Hub3D } from './stages/Hub3D';
import { Race3D } from './stages/Race3D';
import { Roulette3D } from './stages/Roulette3D';
import { Slots3D } from './stages/Slots3D';
import { Title3D } from './stages/Title3D';

/** Pantalla que corresponde a la fase de la partida. */
export function goPhase(): void {
  switch (session.run.phase) {
    case 'duel': void engine.go(() => new Duel3D()); break;
    case 'dawn': void engine.go(() => new Dawn3D()); break;
    case 'dead': void engine.go(() => new Death3D()); break;
    case 'ending': void engine.go(() => new Ending3D()); break;
    default: void engine.go(() => new Hub3D());
  }
}

export function goTable(g: Game): void {
  void engine.go(() => (g === 'slots' ? new Slots3D() : g === 'roulette' ? new Roulette3D() : new Race3D()));
}

export function goTitle(): void {
  void engine.go(() => new Title3D());
}

export function goHub(): void {
  void engine.go(() => new Hub3D());
}
