import { type RunState, SAVE_VERSION } from './state';

const RUN_KEY = 'ultima-feria.run';
const OPT_KEY = 'ultima-feria.options';

export interface Options {
  volume: number;
  music: number;
  sfx: number;
  /** Reduce destellos y temblores: los sustituye por fundidos suaves. */
  reduceFlash: boolean;
}

export const DEFAULT_OPTIONS: Options = { volume: 0.8, music: 0.7, sfx: 0.9, reduceFlash: false };

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
    return data as RunState;
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
