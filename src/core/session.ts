import { type Options, clearRun, loadBest, loadOptions, loadRun, saveBest, saveOptions, saveRun } from './save';
import { type Action, type RunState, apply, newRun, quotaOf } from './state';
import { freshSeed } from './rng';

type Listener = () => void;

/** Estado de partida único y compartido por todas las escenas. */
class Session {
  run: RunState = newRun(1);
  options: Options = loadOptions();
  private listeners = new Set<Listener>();

  /** Récord del modo infinito. */
  best(): number {
    return loadBest();
  }

  hasSave(): boolean {
    return loadRun() !== null;
  }

  continueRun(): boolean {
    const r = loadRun();
    if (!r) return false;
    this.run = r;
    this.emit();
    return true;
  }

  startNew(seed: number = freshSeed(), mode: 'campaign' | 'endless' = 'campaign'): void {
    clearRun();
    this.run = newRun(seed, mode);
    saveRun(this.run);
    this.emit();
  }

  /** Aplica una acción, guarda tras resolverla y avisa a la interfaz. */
  dispatch(a: Action): RunState {
    this.run = apply(this.run, a);
    if (this.run.mode === 'endless' && (this.run.phase === 'dead' || this.run.phase === 'ending')) saveBest(this.run.peak);
    if (this.run.phase === 'dead' || this.run.phase === 'ending') clearRun();
    else saveRun(this.run);
    this.emit();
    return this.run;
  }

  setOptions(patch: Partial<Options>): void {
    this.options = { ...this.options, ...patch };
    saveOptions(this.options);
    this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }
}

export const session = new Session();

/** Escena que corresponde a cada fase de la partida. */
export function sceneForPhase(phase: RunState['phase']): string {
  switch (phase) {
    case 'duel': return 'Duel';
    case 'dawn': return 'Dawn';
    case 'dead': return 'Death';
    case 'ending': return 'Ending';
    default: return 'Hub';
  }
}

export const quotaOfRun = (r: RunState): number => quotaOf(r);
