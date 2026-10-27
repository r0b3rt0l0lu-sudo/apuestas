import { type RunState, SAVE_VERSION } from './state';

const RUN_KEY = 'ultima-feria.run';
const OPT_KEY = 'ultima-feria.options';
const BEST_KEY = 'ultima-feria.best';

export interface Options {
  volume: number;
  music: number;
  sfx: number;
  /** Reduce destellos y temblores: los sustituye por fundidos suaves. */
  reduceFlash: boolean;
  /** Sensibilidad del ratón al mirar (1 = normal). */
  sensitivity: number;
  /** Muestra la línea de controles en pantalla. */
  hints: boolean;
  /** Muestra el minimapa del pasillo. */
  minimap: boolean;
}

export const DEFAULT_OPTIONS: Options = { volume: 0.8, music: 0.7, sfx: 0.9, reduceFlash: false, sensitivity: 1, hints: true, minimap: true };

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function store(): Store | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadRun(s: Store | null = store()): RunState | null {
  try {
    const raw = s?.getItem(RUN_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<RunState>;
    // Si la versión no coincide se descarta sin romper nada.
    if (data.version !== SAVE_VERSION || typeof data.balance !== 'number') return null;
    // Guardados anteriores a la hipoteca: se completan los campos nuevos.
    return {
      ...data,
      mode: data.mode ?? 'campaign',
      debt: data.debt ?? 0,
      mortgaged: data.mortgaged ?? false,
      forgiven: data.forgiven ?? false,
      stats: data.stats ?? { plays: 0, wins: 0, biggestWin: 0, wagered: 0, returned: 0 },
      plays: data.plays ?? 0,
      peak: data.peak ?? data.balance,
      tolls: data.tolls ?? 0,
      lastToll: data.lastToll ?? 0
    } as RunState;
  } catch {
    return null;
  }
}

export function saveRun(run: RunState, s: Store | null = store()): void {
  try {
    s?.setItem(RUN_KEY, JSON.stringify(run));
  } catch {
    /* sin almacenamiento */
  }
}

export function clearRun(s: Store | null = store()): void {
  try {
    s?.removeItem(RUN_KEY);
  } catch {
    /* sin almacenamiento */
  }
}

export function loadOptions(s: Store | null = store()): Options {
  try {
    const raw = s?.getItem(OPT_KEY);
    return raw ? { ...DEFAULT_OPTIONS, ...(JSON.parse(raw) as Partial<Options>) } : { ...DEFAULT_OPTIONS };
  } catch {
    return { ...DEFAULT_OPTIONS };
  }
}

export function saveOptions(o: Options, s: Store | null = store()): void {
  try {
    s?.setItem(OPT_KEY, JSON.stringify(o));
  } catch {
    /* sin almacenamiento */
  }
}

/** Mejor saldo máximo del modo infinito (récord personal). */
export function loadBest(s: Store | null = store()): number {
  try {
    const n = Number(s?.getItem(BEST_KEY));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveBest(v: number, s: Store | null = store()): number {
  const best = Math.max(loadBest(s), v);
  try {
    s?.setItem(BEST_KEY, String(best));
  } catch {
    /* sin almacenamiento */
  }
  return best;
}
