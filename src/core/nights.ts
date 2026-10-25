export type Curse = 'slotReel3' | 'doubleZero' | 'widowFast' | 'duelCandle';

export interface NightDef {
  night: number;
  quota: number;
  actions: number;
  /** Solo la noche 1 fija el saldo inicial. */
  startBalance?: number;
  /** Maldición que aparece esta noche (se acumulan, §5). */
  curse?: Curse;
}

export const NIGHTS: readonly NightDef[] = [
  { night: 1, quota: 1000, actions: 20, startBalance: 500 },
  { night: 2, quota: 2500, actions: 20 },
  { night: 3, quota: 5000, actions: 18, curse: 'slotReel3' },
  { night: 4, quota: 9000, actions: 18, curse: 'doubleZero' },
  { night: 5, quota: 15000, actions: 16, curse: 'widowFast' },
  { night: 6, quota: 25000, actions: 16, curse: 'duelCandle' },
  { night: 7, quota: 50000, actions: 14 }
];

export const LAST_NIGHT = NIGHTS.length;
export const MIN_CARRY = 300;

export function nightDef(night: number): NightDef {
  const def = NIGHTS[night - 1];
  if (!def) throw new Error(`Noche inexistente: ${night}`);
  return def;
}

/** Maldiciones activas: las de la noche y todas las anteriores; la 7 las junta todas. */
export function cursesFor(night: number): Curse[] {
  if (night >= LAST_NIGHT) return NIGHTS.flatMap((n) => (n.curse ? [n.curse] : []));
  return NIGHTS.slice(0, night).flatMap((n) => (n.curse ? [n.curse] : []));
}

/** Interés de la hipoteca: se devuelve lo prestado más este porcentaje, sumado a la cuota de esa noche. */
export const MORTGAGE_RATE = 0.3;
const MORTGAGE_SHARES = [0.2, 0.4, 0.6] as const;

export interface MortgageOffer {
  /** Fichas que recibes ahora. */
  amount: number;
  /** Fichas que se suman a la cuota de la noche. */
  owed: number;
}

/** Ofertas de la noche: un 20 %, 40 % y 60 % de la cuota, redondeadas a 50 fichas. */
export function mortgageOffers(night: number): MortgageOffer[] {
  const quota = nightDef(night).quota;
  return MORTGAGE_SHARES.map((sh) => {
    const amount = Math.max(50, Math.round((quota * sh) / 50) * 50);
    return { amount, owed: Math.ceil(amount * (1 + MORTGAGE_RATE)) };
  });
}

/** Modo infinito: sin cuota ni noches; la casa cobra cada pocas jugadas y gana quien llega más alto. */
export const ENDLESS = {
  /** Fichas iniciales. */
  start: 1000,
  /** Acciones «infinitas» (cabe en el guardado, a diferencia de Infinity). */
  actions: 9999,
  /** La casa cobra cada tantas jugadas resueltas. */
  tollEvery: 10,
  /** Porcentaje del saldo del primer cobro y cuánto sube con cada uno (hasta el máximo). */
  tollBase: 0.1,
  tollStep: 0.02,
  tollMax: 0.35,
  /** Cobro mínimo. */
  tollMin: 50,
  /** Romper la banca: llegar a este saldo es ganar. */
  bankBreak: 100_000
} as const;

/** Cobro de la casa: un porcentaje creciente del saldo (redondeado a 10), nunca más que el saldo. */
export function tollFor(tollsSoFar: number, balance: number): number {
  const pct = Math.min(ENDLESS.tollMax, ENDLESS.tollBase + ENDLESS.tollStep * tollsSoFar);
  const raw = Math.max(ENDLESS.tollMin, Math.round((balance * pct) / 10) * 10);
  return Math.min(balance, raw);
}

/** Rangos del modo infinito según el saldo máximo alcanzado. */
export const RANKS: ReadonlyArray<{ from: number; id: 'novato' | 'jugador' | 'tiburon' | 'leyenda' | 'banca' }> = [
  { from: 0, id: 'novato' },
  { from: 2_500, id: 'jugador' },
  { from: 10_000, id: 'tiburon' },
  { from: 40_000, id: 'leyenda' },
  { from: ENDLESS.bankBreak, id: 'banca' }
];

export const rankFor = (peak: number): (typeof RANKS)[number]['id'] =>
  [...RANKS].reverse().find((r) => peak >= r.from)?.id ?? 'novato';
