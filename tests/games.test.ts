import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { type DuelState, decide, newDuel, shoot, useItem } from '../src/games/duel';
import * as race from '../src/games/race';
import * as roulette from '../src/games/roulette';
import * as slots from '../src/games/slots';

describe('tragaperras', () => {
  it('pagos de tres iguales', () => {
    for (const [s, x] of Object.entries(slots.TRIPLE_PAY)) expect(slots.payoutFor([s, s, s] as slots.SlotSymbol[], 100)).toBe(100 * x);
  });
  it('cualquier pareja devuelve la apuesta; sin pareja no paga', () => {
    expect(slots.payoutFor(['ojo', 'diente', 'ojo'], 100)).toBe(100);
    expect(slots.payoutFor(['diente', 'diente', 'ojo'], 100)).toBe(100);
    expect(slots.payoutFor(['llave', 'ojo', 'llave'], 100)).toBe(100);
    expect(slots.payoutFor(['ojo', 'diente', 'llave'], 100)).toBe(0);
  });
  it('el retorno medio de la tragaperras ronda el 91 %', () => {
    const rng = new Rng(21), n = 200_000;
    let paid = 0;
    for (let i = 0; i < n; i++) paid += slots.spin(rng, 100).payout;
    expect(paid / (n * 100)).toBeGreaterThan(0.84);
    expect(paid / (n * 100)).toBeLessThan(0.98);
  });
  it('frecuencias de símbolos ≈ pesos', () => {
    const rng = new Rng(5), n = 90000, c: Record<string, number> = {};
    for (let i = 0; i < n; i++) for (const s of slots.spin(rng, 50).reels) c[s] = (c[s] ?? 0) + 1;
    for (const [s, w] of Object.entries(slots.WEIGHTS)) expect((c[s] ?? 0) / (n * 3)).toBeCloseTo(w / 18, 1);
  });
  it('la maldición alarga el tercer rodillo', () => {
    expect(slots.stopTimes([])).toEqual([900, 1400, 2100]);
    expect(slots.stopTimes(['slotReel3'])[2]).toBeGreaterThan(2100);
  });
  it('expresión del Cobrador', () => {
    expect(slots.moodAfter(true, 10, 0, 1000)).toBe('sonrisa');
    expect(slots.moodAfter(true, 3, 0, 1000)).toBe('cobra');
    expect(slots.moodAfter(true, 3, 2000, 1000)).toBe('sonrisa');
    expect(slots.moodAfter(false, 10, 0, 1000)).toBe('acecho');
  });
});

describe('ruleta', () => {
  it('la rueda europea tiene 37 casillas y 38 con el 00', () => {
    expect(new Set(roulette.EURO_WHEEL).size).toBe(37);
    expect(new Set(roulette.DOUBLE_ZERO_WHEEL).size).toBe(38);
    expect(roulette.wheelFor(['doubleZero'])).toHaveLength(38);
  });
  it('pagos', () => {
    expect(roulette.payoutFor({ kind: 'pleno', n: 17 }, 50, 17)).toBe(1800);
    expect(roulette.payoutFor({ kind: 'pleno', n: 17 }, 50, 18)).toBe(0);
    expect(roulette.payoutFor({ kind: 'rojo' }, 100, 1)).toBe(200);
    expect(roulette.payoutFor({ kind: 'negro' }, 100, 1)).toBe(0);
    expect(roulette.payoutFor({ kind: 'par' }, 100, 2)).toBe(200);
    expect(roulette.payoutFor({ kind: 'impar' }, 100, 2)).toBe(0);
    expect(roulette.payoutFor({ kind: 'bajo' }, 100, 18)).toBe(200);
    expect(roulette.payoutFor({ kind: 'alto' }, 100, 18)).toBe(0);
    expect(roulette.payoutFor({ kind: 'alto' }, 100, 36)).toBe(200);
  });
  it('el 0 y el 00 pierden las exteriores pero pagan el pleno', () => {
    for (const z of [0, roulette.DOUBLE_ZERO]) {
      for (const k of roulette.OUTSIDE_KINDS) expect(roulette.payoutFor({ kind: k }, 100, z)).toBe(50); // el cero devuelve la mitad
      expect(roulette.payoutFor({ kind: 'pleno', n: z }, 100, z)).toBe(3600);
    }
  });
  it('colores', () => {
    expect(roulette.colorOf(0)).toBe('verde');
    expect(roulette.colorOf(32)).toBe('rojo');
    expect(roulette.colorOf(15)).toBe('negro');
  });
  it('el ángulo final deja la casilla bajo el puntero', () => {
    const w = roulette.EURO_WHEEL, step = (Math.PI * 2) / 37;
    expect(roulette.finalAngle(w, 0, 4)).toBeCloseTo(4 * Math.PI * 2);
    const a = roulette.finalAngle(w, 15, 4);
    const under = (((-a / step) % 37) + 37) % 37;
    expect(w[Math.round(under) % 37]).toBe(15);
  });
  it('spin usa solo casillas de la rueda', () => {
    const rng = new Rng(2);
    for (let i = 0; i < 300; i++) expect(roulette.wheelFor(['doubleZero'])).toContain(roulette.spin(rng, ['doubleZero']));
  });
});

describe('carreras', () => {
  it('las probabilidades suman 1 (también con la maldición)', () => {
    expect(race.probsFor([]).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    const p = race.probsFor(['widowFast']);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(p[5]).toBe(0.1);
    expect(p[0]).toBe(0.26);
  });
  it('100.000 carreras reproducen las frecuencias (±1 %)', () => {
    const rng = new Rng(2024), n = 100_000, wins = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < n; i++) wins[race.run(rng, []).winner]!++;
    race.HORSES.forEach((h, i) => expect(Math.abs(wins[i]! / n - h.prob)).toBeLessThan(0.01));
  });
  it('con la maldición también', () => {
    const rng = new Rng(77), n = 100_000, wins = [0, 0, 0, 0, 0, 0], p = race.probsFor(['widowFast']);
    for (let i = 0; i < n; i++) wins[race.run(rng, ['widowFast']).winner]!++;
    p.forEach((q, i) => expect(Math.abs(wins[i]! / n - q)).toBeLessThan(0.01));
  });
  it('el retorno medio ronda el 96-99 % para cualquier caballo', () => {
    const rng = new Rng(9), n = 60_000;
    for (let pick = 0; pick < 6; pick++) {
      let paid = 0;
      for (let i = 0; i < n; i++) paid += race.run(rng, []).payout(pick, 100);
      expect(paid / (n * 100)).toBeGreaterThan(0.9);
      expect(paid / (n * 100)).toBeLessThan(1.06);
    }
  });
  it('los tiempos son coherentes con el orden de llegada', () => {
    const rng = new Rng(3);
    for (let i = 0; i < 200; i++) {
      const r = race.run(rng, []);
      expect(r.order[0]).toBe(r.winner);
      for (let k = 1; k < 6; k++) expect(r.times[r.order[k]!]!).toBeGreaterThan(r.times[r.order[k - 1]!]!);
    }
  });
  it('el progreso empieza en 0, termina en 1 y es creciente', () => {
    for (let i = 0; i < 6; i++) {
      expect(race.progress(i, 0, 9000)).toBe(0);
      expect(race.progress(i, 9000, 9000)).toBeCloseTo(1);
      let prev = 0;
      for (let t = 0; t <= 9000; t += 100) { const p = race.progress(i, t, 9000); expect(p).toBeGreaterThanOrEqual(prev - 1e-9); prev = p; }
    }
  });
});

const base = (over: Partial<DuelState> = {}): DuelState => ({ ...newDuel(new Rng(1), []), ...over });

describe('duelo', () => {
  it('estado inicial: 4 velas, 3-8 cartuchos con al menos uno de cada, 2 objetos', () => {
    for (let seed = 0; seed < 100; seed++) {
      const d = newDuel(new Rng(seed), []);
      expect(d.hp).toEqual({ player: 4, boss: 4 });
      expect(d.chamber.length).toBeGreaterThanOrEqual(3);
      expect(d.chamber.length).toBeLessThanOrEqual(8);
      expect(d.loaded.real).toBeGreaterThanOrEqual(1);
      expect(d.loaded.fogueo).toBeGreaterThanOrEqual(1);
      expect(d.items.player).toHaveLength(2);
    }
  });
  it('la maldición da +1 vela al Cobrador', () => {
    expect(newDuel(new Rng(1), ['duelCandle']).hp.boss).toBe(5);
  });
  it('disparar al rival con real quita una vela y pasa el turno', () => {
    const d = base({ chamber: ['real', 'fogueo'] });
    const { state, event } = shoot(d, new Rng(1), 'other');
    expect(state.hp.boss).toBe(3);
    expect(state.turn).toBe('boss');
    expect(event).toMatchObject({ damage: 1, extraTurn: false });
  });
  it('dispararte con fogueo repite turno; con real te cuesta una vela', () => {
    const f = shoot(base({ chamber: ['fogueo', 'real'] }), new Rng(1), 'self');
    expect(f.state.turn).toBe('player');
    expect(f.state.hp.player).toBe(4);
    const r = shoot(base({ chamber: ['real', 'fogueo'] }), new Rng(1), 'self');
    expect(r.state.hp.player).toBe(3);
    expect(r.state.turn).toBe('boss');
  });
  it('la pólvora dobla el daño una sola vez', () => {
    const d = useItem(base({ chamber: ['real', 'real', 'fogueo'], items: { player: ['polvora'], boss: [] } }), 'polvora');
    const a = shoot(d, new Rng(1), 'other');
    expect(a.state.hp.boss).toBe(2);
    expect(a.state.powder.player).toBe(false);
  });
  it('el reloj de arena hace perder el siguiente turno al rival', () => {
    const d = useItem(base({ chamber: ['fogueo', 'real', 'real'], items: { player: ['reloj'], boss: [] } }), 'reloj');
    const a = shoot(d, new Rng(1), 'other');
    expect(a.state.turn).toBe('player');
    expect(a.state.skip.boss).toBe(false);
  });
  it('monóculo y moneda', () => {
    let d = useItem(base({ chamber: ['real', 'fogueo'], items: { player: ['monoculo', 'moneda'], boss: [] } }), 'monoculo');
    expect(d.known.player).toBe('real');
    d = useItem(d, 'moneda');
    expect(d.chamber[0]).toBe('fogueo');
    expect(d.known.player).toBe('fogueo');
  });
  it('la vela cura hasta el máximo', () => {
    const d = useItem(base({ hp: { player: 4, boss: 4 }, items: { player: ['vela'], boss: [] } }), 'vela');
    expect(d.hp.player).toBe(4);
    const e = useItem(base({ hp: { player: 2, boss: 4 }, items: { player: ['vela'], boss: [] } }), 'vela');
    expect(e.hp.player).toBe(3);
  });
  it('gana quien deja al otro sin velas', () => {
    const d = base({ chamber: ['real', 'fogueo'], hp: { player: 4, boss: 1 } });
    expect(shoot(d, new Rng(1), 'other').state.winner).toBe('player');
  });
  it('al vaciarse la cámara se recarga y se reparten objetos (máx. 6)', () => {
    const d = base({ chamber: ['fogueo'], items: { player: ['vela', 'vela', 'vela', 'vela', 'vela'], boss: [] } });
    const { state } = shoot(d, new Rng(5), 'self');
    expect(state.round).toBe(d.round + 1);
    expect(state.chamber.length).toBeGreaterThanOrEqual(3);
    expect(state.items.player).toHaveLength(6);
    expect(state.items.boss).toHaveLength(2);
  });
  describe('IA del Cobrador', () => {
    const boss = (over: Partial<DuelState>) => base({ turn: 'boss', items: { player: [], boss: [] }, ...over });
    it('1) usa el reloj si puede', () => {
      expect(decide(boss({ items: { player: [], boss: ['reloj', 'vela'] } }), new Rng(1))).toEqual({ kind: 'use', item: 'reloj' });
    });
    it('1) no repite el reloj si el jugador ya pierde turno', () => {
      expect(decide(boss({ skip: { player: true, boss: false }, items: { player: [], boss: ['reloj'] } }), new Rng(1)).kind).toBe('shoot');
    });
    it('2) usa vela si le falta una', () => {
      expect(decide(boss({ hp: { player: 4, boss: 2 }, items: { player: [], boss: ['vela'] } }), new Rng(1))).toEqual({ kind: 'use', item: 'vela' });
    });
    it('2) no gasta vela con las velas llenas', () => {
      expect(decide(boss({ chamber: ['real', 'real', 'fogueo'], items: { player: [], boss: ['vela'] } }), new Rng(1)).kind).toBe('shoot');
    });
    it('3) usa el monóculo si no sabe el cartucho', () => {
      expect(decide(boss({ items: { player: [], boss: ['monoculo'] } }), new Rng(1))).toEqual({ kind: 'use', item: 'monoculo' });
    });
    it('4) si sabe que es fogueo y tiene moneda, lo convierte en real', () => {
      expect(decide(boss({ chamber: ['fogueo', 'real'], known: { player: null, boss: 'fogueo' }, items: { player: [], boss: ['moneda'] } }), new Rng(1)))
        .toEqual({ kind: 'use', item: 'moneda' });
    });
    it('5) con cartucho conocido: real → jugador, fogueo → a sí mismo', () => {
      expect(decide(boss({ chamber: ['real'], known: { player: null, boss: 'real' } }), new Rng(1))).toEqual({ kind: 'shoot', target: 'other' });
      expect(decide(boss({ chamber: ['fogueo', 'real'], known: { player: null, boss: 'fogueo' } }), new Rng(1))).toEqual({ kind: 'shoot', target: 'self' });
    });
    it('5) sin saber: por proporción', () => {
      expect(decide(boss({ chamber: ['real', 'real', 'fogueo'] }), new Rng(1))).toEqual({ kind: 'shoot', target: 'other' });
      expect(decide(boss({ chamber: ['fogueo', 'fogueo', 'real'] }), new Rng(1))).toEqual({ kind: 'shoot', target: 'self' });
    });
    it('5) con 0,5 tira cara o cruz', () => {
      const seen = new Set<string>();
      for (let i = 0; i < 40; i++) { const a = decide(boss({ chamber: ['real', 'fogueo'] }), new Rng(i)); if (a.kind === 'shoot') seen.add(a.target); }
      expect(seen.size).toBe(2);
    });
    it('6) usa la pólvora antes de disparar al jugador con alta probabilidad de real', () => {
      expect(decide(boss({ chamber: ['real', 'real', 'real', 'fogueo'], items: { player: [], boss: ['polvora'] } }), new Rng(1)))
        .toEqual({ kind: 'use', item: 'polvora' });
      expect(decide(boss({ chamber: ['real', 'real', 'real', 'fogueo'], powder: { player: false, boss: true }, items: { player: [], boss: ['polvora'] } }), new Rng(1)).kind).toBe('shoot');
    });
    it('un duelo IA contra IA siempre termina', () => {
      for (let seed = 0; seed < 50; seed++) {
        const rng = new Rng(seed);
        let d = newDuel(rng, []);
        let guard = 0;
        while (!d.winner && guard++ < 500) {
          // el jugador usa la misma IA, espejada
          const mirror: DuelState = structuredClone(d);
          const swap = <T,>(r: Record<'player' | 'boss', T>): Record<'player' | 'boss', T> => ({ player: r.boss, boss: r.player });
          if (d.turn === 'player') {
            Object.assign(mirror, { hp: swap(d.hp), maxHp: swap(d.maxHp), items: swap(d.items), known: swap(d.known), skip: swap(d.skip), powder: swap(d.powder), turn: 'boss' });
          }
          const act = decide(d.turn === 'player' ? mirror : d, rng);
          d = act.kind === 'use' ? useItem(d, act.item) : shoot(d, rng, act.target).state;
        }
        expect(d.winner).not.toBeNull();
      }
    });
  });
});

import { cubicBezier, easeOutBack, wheelEase } from '../src/fx/ease';
import { phraseCycle } from '../src/core/phrases';

describe('curvas', () => {
  it('la curva de la rueda va de 0 a 1 de forma monótona', () => {
    expect(wheelEase(0)).toBe(0);
    expect(wheelEase(1)).toBe(1);
    let prev = 0;
    for (let i = 1; i <= 100; i++) { const v = wheelEase(i / 100); expect(v).toBeGreaterThanOrEqual(prev); prev = v; }
    expect(wheelEase(0.3)).toBeGreaterThan(0.6); // sale rápido y frena
  });
  it('cubicBezier lineal', () => {
    expect(cubicBezier(0, 0, 1, 1)(0.5)).toBeCloseTo(0.5, 3);
  });
  it('easeOutBack se pasa de 1 y vuelve', () => {
    expect(Math.max(...Array.from({ length: 50 }, (_, i) => easeOutBack(i / 49)))).toBeGreaterThan(1);
    expect(easeOutBack(1)).toBeCloseTo(1);
  });
});

describe('frases', () => {
  it('no repiten la última', () => {
    const pick = phraseCycle(new Rng(4));
    const list = ['a', 'b', 'c'];
    let last = '';
    for (let i = 0; i < 100; i++) { const s = pick(list); expect(s).not.toBe(last); last = s; }
  });
});
