/** RNG con semilla (mulberry32). Toda la aleatoriedad de la lógica pasa por aquí. */
export class Rng {
  /** Estado interno de 32 bits; se guarda con la partida para poder reanudar. */
  state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Float en [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Entero en [min, max], ambos incluidos. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick: lista vacía');
    return items[this.int(0, items.length - 1)] as T;
  }

  /** Índice elegido con probabilidad proporcional a su peso. */
  weighted(weights: readonly number[]): number {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i] ?? 0;
      if (r < 0) return i;
    }
    return weights.length - 1;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [a[i], a[j]] = [a[j] as T, a[i] as T];
    }
    return a;
  }
}

/** Semilla nueva para una partida (única fuente de entropía externa, fuera de la lógica). */
export function freshSeed(): number {
  return (Date.now() ^ (performance.now() * 1000)) >>> 0;
}
