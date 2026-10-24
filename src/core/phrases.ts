import type { Rng } from './rng';

/** Elige frases con el RNG sin repetir la última de cada lista. */
export function phraseCycle(rng: Rng): <T>(list: readonly T[]) => T {
  const last = new Map<readonly unknown[], number>();
  return <T>(list: readonly T[]): T => {
    if (list.length === 0) throw new Error('Lista de frases vacía');
    if (list.length === 1) return list[0] as T;
    const prev = last.get(list);
    let i = rng.int(0, list.length - 1);
    if (i === prev) i = (i + 1 + rng.int(0, list.length - 2)) % list.length;
    last.set(list, i);
    return list[i] as T;
  };
}
