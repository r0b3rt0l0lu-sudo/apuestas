import { describe, expect, it } from 'vitest';
import { canPlayAny } from '../src/core/economy';
import { ENDLESS, MORTGAGE_RATE, cursesFor, mortgageOffers, nightDef, rankFor, tollFor } from '../src/core/nights';
import { Rng } from '../src/core/rng';
import { DEFAULT_OPTIONS, clearRun, loadBest, loadOptions, loadRun, saveBest, saveRun } from '../src/core/save';
import { type RunState, apply, canMortgage, newRun, quotaMet, quotaOf } from '../src/core/state';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};
const play = (s: RunState, over: Partial<RunState> = {}): RunState => ({ ...apply(s, { type: 'enterTable' }), ...over });

describe('rng', () => {
  it('es reproducible por semilla', () => {
    const a = new Rng(42), b = new Rng(42);
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(Array.from({ length: 20 }, () => b.next()));
  });
  it('restaurar el estado continúa la misma secuencia', () => {
    const a = new Rng(7);
    a.next();
    const b = new Rng(a.state);
    expect(a.next()).toBe(b.next());
  });
  it('int respeta los límites y shuffle conserva elementos', () => {
    const r = new Rng(1);
    for (let i = 0; i < 500; i++) { const v = r.int(3, 8); expect(v).toBeGreaterThanOrEqual(3); expect(v).toBeLessThanOrEqual(8); }
    expect(r.shuffle([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4]);
  });
});

describe('noches', () => {
  it('tabla de cuotas y acciones', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((n) => nightDef(n).quota)).toEqual([1000, 2500, 5000, 9000, 15000, 25000, 50000]);
    expect([1, 2, 3, 4, 5, 6, 7].map((n) => nightDef(n).actions)).toEqual([20, 20, 18, 18, 16, 16, 14]);
  });
  it('las maldiciones se acumulan y la 7 las junta todas', () => {
    expect(cursesFor(2)).toEqual([]);
    expect(cursesFor(3)).toEqual(['slotReel3']);
    expect(cursesFor(5)).toEqual(['slotReel3', 'doubleZero', 'widowFast']);
    expect(cursesFor(7)).toHaveLength(4);
  });
});

describe('transiciones de estado', () => {
  it('noche 1: 500 fichas, 20 acciones, en el pasillo', () => {
    const s = newRun(1);
    expect(s).toMatchObject({ night: 1, balance: 500, actionsLeft: 20, phase: 'hub' });
  });
  it('resolve descuenta apuesta y acciones y suma el pago', () => {
    const s = apply(play(newRun(1)), { type: 'resolve', game: 'slots', bet: 100, payout: 300, rng: 5 });
    expect(s).toMatchObject({ balance: 700, actionsLeft: 19, rng: 5 });
    const r = apply(play(newRun(1)), { type: 'resolve', game: 'roulette', bet: 50, payout: 0, rng: 6 });
    expect(r).toMatchObject({ balance: 450, actionsLeft: 18 });
    const c = apply(play(newRun(1)), { type: 'resolve', game: 'race', bet: 100, payout: 0, rng: 6 });
    expect(c.actionsLeft).toBe(17);
  });
  it('rechaza apuestas ilegales o sin saldo/acciones', () => {
    const s = play(newRun(1));
    expect(apply(s, { type: 'resolve', game: 'slots', bet: 77, payout: 0, rng: 1 })).toBe(s);
    expect(apply(play(s, { balance: 40 }), { type: 'resolve', game: 'slots', bet: 50, payout: 0, rng: 1 }).balance).toBe(40);
    expect(apply(play(s, { actionsLeft: 2 }), { type: 'resolve', game: 'race', bet: 100, payout: 0, rng: 1 }).actionsLeft).toBe(2);
    expect(apply(newRun(1), { type: 'resolve', game: 'slots', bet: 50, payout: 0, rng: 1 }).balance).toBe(500); // fuera de mesa
  });
  it('sin acciones y sin cuota → duelo', () => {
    const s = apply(play(newRun(1), { actionsLeft: 1 }), { type: 'resolve', game: 'slots', bet: 50, payout: 0, rng: 1 });
    expect(s.phase).toBe('duel');
  });
  it('sin saldo para la apuesta mínima y sin cuota → duelo', () => {
    const s = apply(play(newRun(1), { balance: 90 }), { type: 'resolve', game: 'slots', bet: 50, payout: 0, rng: 1 });
    expect(s.balance).toBe(40);
    expect(s.phase).toBe('duel');
  });
  it('sin acciones pero con cuota → amanecer', () => {
    const s = apply(play(newRun(1), { actionsLeft: 1, balance: 1100 }), { type: 'resolve', game: 'slots', bet: 50, payout: 0, rng: 1 });
    expect(s.phase).toBe('dawn');
  });
  it('con cuota y acciones se puede seguir o dormir', () => {
    const s = play(newRun(1), { balance: 1200 });
    expect(quotaMet(s)).toBe(true);
    const r = apply(s, { type: 'resolve', game: 'slots', bet: 50, payout: 0, rng: 1 });
    expect(r.phase).toBe('playing');
    expect(apply(r, { type: 'sleep' }).phase).toBe('dawn');
    expect(apply(play(newRun(1)), { type: 'sleep' }).phase).toBe('playing'); // sin cuota no se duerme
  });
  it('al amanecer se descuenta la cuota y el resto pasa a la noche siguiente', () => {
    const dawn = { ...newRun(1), phase: 'dawn' as const, balance: 1700 };
    const n = apply(dawn, { type: 'nextNight' });
    expect(n).toMatchObject({ night: 2, balance: 700, actionsLeft: 20, phase: 'hub' });
    expect(n.history).toEqual([{ night: 1, quota: 1000, balance: 1700, outcome: 'paid' }]);
  });
  it('si el arrastre es menor de 300 se completa hasta 300', () => {
    const n = apply({ ...newRun(1), phase: 'dawn', balance: 1100 }, { type: 'nextNight' });
    expect(n.balance).toBe(300);
  });
  it('ganar el duelo perdona la cuota y conserva el saldo', () => {
    const duel = { ...newRun(1), phase: 'duel' as const, balance: 200 };
    const won = apply(duel, { type: 'duelResult', won: true });
    expect(won.phase).toBe('dawn');
    const n = apply(won, { type: 'nextNight' });
    expect(n.balance).toBe(300);
    const rich = apply(apply({ ...duel, balance: 800 }, { type: 'duelResult', won: true }), { type: 'nextNight' });
    expect(rich.balance).toBe(800);
    expect(rich.history[0]?.outcome).toBe('duel');
    expect(rich.forgiven).toBe(false);
  });
  it('perder el duelo es la muerte', () => {
    expect(apply({ ...newRun(1), phase: 'duel' }, { type: 'duelResult', won: false }).phase).toBe('dead');
  });
  it('superar la noche 7 es el final', () => {
    const s = apply({ ...newRun(1), night: 7, phase: 'dawn', balance: 60000 }, { type: 'nextNight' });
    expect(s).toMatchObject({ phase: 'ending', balance: 10000 });
  });
  it('flag y transiciones fuera de fase no hacen nada', () => {
    expect(apply(newRun(1), { type: 'flag', key: 'tutorial' }).flags.tutorial).toBe(true);
    const s = newRun(1);
    expect(apply(s, { type: 'nextNight' })).toBe(s);
    expect(apply(s, { type: 'duelResult', won: true })).toBe(s);
  });
  it('canPlayAny', () => {
    expect(canPlayAny(49, 20)).toBe(false);
    expect(canPlayAny(50, 0)).toBe(false);
    expect(canPlayAny(50, 1)).toBe(true);
  });
});

describe('hipoteca', () => {
  it('las ofertas son el 20, 40 y 60 % de la cuota, con interés', () => {
    expect(mortgageOffers(1)).toEqual([{ amount: 200, owed: 260 }, { amount: 400, owed: 520 }, { amount: 600, owed: 780 }]);
    expect(MORTGAGE_RATE).toBe(0.3);
  });
  it('da las fichas ahora y suma lo adeudado a la cuota de la noche', () => {
    const s = apply(newRun(1), { type: 'mortgage', amount: 400 });
    expect(s).toMatchObject({ balance: 900, debt: 520, mortgaged: true });
    expect(quotaOf(s)).toBe(1520);
    expect(quotaMet({ ...s, balance: 1519 })).toBe(false);
    expect(quotaMet({ ...s, balance: 1520 })).toBe(true);
  });
  it('solo una por noche, solo en el pasillo y solo con cantidades ofrecidas', () => {
    const s = apply(newRun(1), { type: 'mortgage', amount: 200 });
    expect(canMortgage(s)).toBe(false);
    expect(apply(s, { type: 'mortgage', amount: 200 })).toBe(s);
    expect(apply(newRun(1), { type: 'mortgage', amount: 123 }).mortgaged).toBe(false);
    expect(apply(play(newRun(1)), { type: 'mortgage', amount: 200 }).mortgaged).toBe(false);
  });
  it('al amanecer se paga la cuota con la deuda y la noche siguiente empieza limpia', () => {
    const s = { ...apply(newRun(1), { type: 'mortgage', amount: 200 }), phase: 'dawn' as const, balance: 1500 };
    const n = apply(s, { type: 'nextNight' });
    expect(n).toMatchObject({ night: 2, balance: 300, debt: 0, mortgaged: false }); // 1500 - 1260 = 240, completado hasta 300
    expect(n.history[0]).toMatchObject({ quota: 1260, outcome: 'paid' });
  });
  it('ganar el duelo perdona también la deuda', () => {
    const s = { ...apply(newRun(1), { type: 'mortgage', amount: 600 }), phase: 'duel' as const };
    const n = apply(apply(s, { type: 'duelResult', won: true }), { type: 'nextNight' });
    expect(n).toMatchObject({ night: 2, balance: 1100, debt: 0 });
  });
});

describe('modo infinito', () => {
  const endless = (over: Partial<RunState> = {}): RunState => ({ ...newRun(1, 'endless'), phase: 'playing', ...over });
  const bet = (s: RunState, payout = 0, bet = 50): RunState => apply(s, { type: 'resolve', game: 'slots', bet, payout, rng: s.rng });

  it('empieza con fichas fijas, sin cuota ni noches y sin intro', () => {
    const s = newRun(5, 'endless');
    expect(s).toMatchObject({ mode: 'endless', balance: ENDLESS.start, peak: ENDLESS.start, actionsLeft: ENDLESS.actions, phase: 'hub' });
    expect(quotaOf(s)).toBe(0);
    expect(s.flags).toMatchObject({ casino: true, tutorial: true });
  });
  it('no hay hipoteca ni dormir', () => {
    const s = newRun(5, 'endless');
    expect(canMortgage(s)).toBe(false);
    expect(apply(s, { type: 'mortgage', amount: 200 })).toBe(s);
    expect(apply(s, { type: 'sleep' }).phase).toBe('hub');
  });
  it('anota jugadas y el saldo máximo', () => {
    let s = bet(endless(), 500); // +450
    expect(s).toMatchObject({ plays: 1, balance: 1450, peak: 1450 });
    s = bet(s, 0, 250);
    expect(s).toMatchObject({ plays: 2, balance: 1200, peak: 1450 });
  });
  it('la casa cobra cada 10 jugadas, un porcentaje creciente', () => {
    let s = endless();
    for (let i = 0; i < 9; i++) s = bet(s, 50); // se devuelve la apuesta: saldo estable
    expect(s).toMatchObject({ plays: 9, tolls: 0, balance: 1000 });
    s = bet(s, 50);
    expect(s).toMatchObject({ plays: 10, tolls: 1, lastToll: 100, balance: 900 });
    for (let i = 0; i < 10; i++) s = bet(s, 50);
    expect(s.tolls).toBe(2);
    expect(s.lastToll).toBe(tollFor(1, 900));
    expect(tollFor(1, 900)).toBeGreaterThan(tollFor(0, 900) * 1.1);
  });
  it('el cobro tiene mínimo, máximo y nunca supera el saldo', () => {
    expect(tollFor(0, 100)).toBe(50);
    expect(tollFor(0, 30)).toBe(30);
    expect(tollFor(50, 10_000)).toBe(3500);
  });
  it('sin fichas para la apuesta mínima se pierde', () => {
    const s = bet(endless({ balance: 80 }), 0, 50);
    expect(s.balance).toBe(30);
    expect(s.phase).toBe('dead');
  });
  it('romper la banca es ganar', () => {
    const s = bet(endless({ balance: 90_000 }), 50 * 50, 50); // +2450: no llega
    expect(s.phase).toBe('playing');
    const w = bet(endless({ balance: 99_900 }), 50 * 50, 50);
    expect(w.peak).toBeGreaterThanOrEqual(ENDLESS.bankBreak);
    expect(w.phase).toBe('ending');
  });
  it('rangos por saldo máximo', () => {
    expect([0, 3000, 12_000, 50_000, 100_000].map(rankFor)).toEqual(['novato', 'jugador', 'tiburon', 'leyenda', 'banca']);
  });
  it('el récord solo sube', () => {
    const m = mem();
    expect(loadBest(m)).toBe(0);
    expect(saveBest(5000, m)).toBe(5000);
    expect(saveBest(3000, m)).toBe(5000);
    expect(loadBest(m)).toBe(5000);
  });
  it('un guardado antiguo se carga como campaña', () => {
    const m = mem();
    const old: Partial<RunState> = { ...newRun(3) };
    delete old.mode; delete old.peak; delete old.plays;
    m.setItem('ultima-feria.run', JSON.stringify(old));
    expect(loadRun(m)).toMatchObject({ mode: 'campaign', plays: 0 });
  });
});

describe('estadísticas', () => {
  const res = (s: RunState, bet: number, payout: number): RunState => apply(s, { type: 'resolve', game: 'slots', bet, payout, rng: s.rng });
  it('cuentan jugadas, victorias, mayor ganancia y fichas movidas', () => {
    let s = play(newRun(1));
    s = res(s, 50, 0);
    s = res(s, 100, 100); // devolver la apuesta no es ganar
    s = res(s, 50, 500);
    expect(s.stats).toEqual({ plays: 3, wins: 1, biggestWin: 450, wagered: 200, returned: 600 });
    expect(s.peak).toBe(900); // 500 → 450 → 450 → 900 en la campaña también
  });
  it('un guardado anterior se carga con las estadísticas a cero', () => {
    const m = mem();
    const old: Partial<RunState> = { ...newRun(3) };
    delete old.stats;
    m.setItem('ultima-feria.run', JSON.stringify(old));
    expect(loadRun(m)?.stats).toEqual({ plays: 0, wins: 0, biggestWin: 0, wagered: 0, returned: 0 });
  });
  it('las opciones nuevas tienen valores por defecto', () => {
    expect(DEFAULT_OPTIONS).toMatchObject({ sensitivity: 1, hints: true, minimap: true });
  });
});

describe('hallazgos', () => {
  it('dan fichas una sola vez por partida', () => {
    const a = apply(newRun(1), { type: 'find', key: 'egg-coin', chips: 100 });
    expect(a.balance).toBe(600);
    expect(a.flags['egg-coin']).toBe(true);
    expect(apply(a, { type: 'find', key: 'egg-coin', chips: 100 })).toBe(a);
  });
});

describe('guardado', () => {
  it('un guardado anterior a la hipoteca se completa sin romper', () => {
    const m = mem();
    const old: Partial<RunState> = { ...newRun(3) };
    delete old.debt;
    delete old.mortgaged;
    m.setItem('ultima-feria.run', JSON.stringify(old));
    expect(loadRun(m)).toMatchObject({ debt: 0, mortgaged: false });
  });
  it('guarda y recarga', () => {
    const m = mem();
    const s = newRun(3);
    saveRun(s, m);
    expect(loadRun(m)).toEqual(s);
    clearRun(m);
    expect(loadRun(m)).toBeNull();
  });
  it('descarta versiones distintas o datos rotos sin lanzar', () => {
    const m = mem();
    m.setItem('ultima-feria.run', JSON.stringify({ version: 99, balance: 1 }));
    expect(loadRun(m)).toBeNull();
    m.setItem('ultima-feria.run', '{no es json');
    expect(loadRun(m)).toBeNull();
  });
  it('opciones por defecto', () => {
    expect(loadOptions(mem())).toEqual(DEFAULT_OPTIONS);
  });
});

describe('reproducibilidad por semilla', () => {
  it('la misma semilla y las mismas acciones dan la misma partida', async () => {
    const { spin } = await import('../src/games/slots');
    const run = () => {
      let s = apply(newRun(99), { type: 'enterTable' });
      for (let i = 0; i < 10; i++) {
        const rng = new Rng(s.rng);
        const r = spin(rng, 50);
        s = apply(s, { type: 'resolve', game: 'slots', bet: 50, payout: r.payout, rng: rng.state });
      }
      return s;
    };
    expect(run()).toEqual(run());
  });
});
