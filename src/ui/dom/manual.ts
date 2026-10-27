import { RANKS, mortgageOffers } from '../../core/nights';
import { session } from '../../core/session';
import { HORSES, probsFor } from '../../games/race';
import { rouletteRtp } from '../../games/roulette';
import { SYMBOLS, TRIPLE_PAY, WEIGHTS, slotsRtp } from '../../games/slots';
import { T, fmt } from '../../i18n/es';
import { el } from './kit';
import { showOverlay } from './overlay';

type Page = { title: string; render: (box: HTMLElement) => void };

const lines = (box: HTMLElement, ls: readonly string[]): void => { ls.forEach((l) => el('p', '', l, box)); };

function table(box: HTMLElement, head: readonly string[] | null, rows: ReadonlyArray<readonly string[]>): void {
  const t = el('table', 'mtab', '', box);
  if (head) { const r = el('tr', '', '', t); head.forEach((h) => el('th', '', h, r)); }
  rows.forEach((row) => { const r = el('tr', '', '', t); row.forEach((c) => el('td', '', c, r)); });
}

/** Las páginas se construyen con las constantes reales del juego: si cambian los pagos, el manual cambia solo. */
function pages(): Page[] {
  const P = T.manual.pages;
  const tipsLines = T.manual.tips;
  return [
    { title: P.welcome.title, render: (b) => lines(b, P.welcome.lines) },
    { title: P.rules.title, render: (b) => lines(b, P.rules.lines) },
    { title: P.controls.title, render: (b) => table(b, null, P.controls.rows) },
    {
      title: P.tables.title,
      render: (b) => {
        el('p', '', T.manual.tables.slots, b);
        table(b, T.manual.tables.slotsCols, SYMBOLS.map((s) => [T.slots.names[s] ?? s, String(WEIGHTS[s]), `×${TRIPLE_PAY[s]}`]));
        el('p', '', T.manual.tables.roulette, b);
        el('p', '', T.manual.tables.race, b);
        const probs = probsFor([]);
        table(b, T.manual.tables.raceCols, HORSES.map((h, i) => [`${h.num} ${h.name}`, `×${String(h.pays).replace('.', ',')}`, `${Math.round((probs[i] ?? 0) * 100)} %`]));
        const rt = HORSES.map((h, i) => (probs[i] ?? 0) * h.pays);
        el('p', '', T.manual.tables.blackjack, b);
        el('p', 'mrtp', T.manual.tables.rtp(slotsRtp(), rouletteRtp('exterior', false), Math.min(...rt), Math.max(...rt)), b);
      }
    },
    { title: P.duel.title, render: (b) => lines(b, P.duel.lines) },
    {
      title: P.money.title,
      render: (b) => {
        lines(b, P.money.lines);
        const offers = mortgageOffers(Math.max(1, session.run.night), session.run.difficulty);
        table(b, null, [
          ...offers.map((o) => [T.mortgage.option(o.amount, o.owed), '']),
          ...RANKS.map((r) => [T.endless.ranks[r.id] ?? r.id, `${fmt(r.from)}+`])
        ]);
      }
    },
    { title: P.hall.title, render: (b) => lines(b, P.hall.lines) },
    { title: T.manual.pages.tips.title, render: (b) => lines(b, tipsLines.map((t) => `• ${t}`)) },
    {
      title: P.run.title,
      render: (b) => {
        const r = session.run, s = r.stats;
        if (s.plays === 0) { el('p', '', T.manual.run.empty, b); } else {
          table(b, null, [
            [T.stats.plays, String(s.plays)],
            [T.stats.wins, String(s.wins)],
            [T.stats.biggest, fmt(s.biggestWin)],
            [T.stats.wagered, fmt(s.wagered)],
            [T.stats.returned, fmt(s.returned)],
            [T.stats.net, `${s.returned - s.wagered >= 0 ? '+' : '−'}${fmt(Math.abs(s.returned - s.wagered))}`]
          ]);
        }
        const endless = r.mode === 'endless';
        el('p', '', T.manual.run.mode(endless ? T.manual.run.endless : T.manual.run.campaign), b);
        if (!endless) el('p', '', T.manual.run.night(r.night), b);
        el('p', '', T.manual.run.peak(r.peak), b);
        if (session.best() > 0) el('p', '', T.manual.run.best(session.best()), b);
      }
    }
  ];
}

/** Manual del juego: reglas, controles, tablas de pagos reales, consejos y las estadísticas de tu partida. */
export function openManual(parent: HTMLElement, onClose?: () => void): void {
  const all = pages();
  let page = 0;
  let body!: HTMLElement;
  let label!: HTMLElement;
  const scroll = (e: KeyboardEvent): void => {
    if (e.key === 'PageDown') { body.scrollBy(0, 300); e.preventDefault(); }
    else if (e.key === 'PageUp') { body.scrollBy(0, -300); e.preventDefault(); }
  };
  window.addEventListener('keydown', scroll);
  const close = (): void => { window.removeEventListener('keydown', scroll); ov.close(); onClose?.(); };
  const show = (): void => {
    const pg = all[page];
    if (!pg) return;
    body.textContent = '';
    el('h3', '', pg.title, body);
    pg.render(body);
    body.scrollTop = 0;
    label.textContent = `${T.manual.page(page + 1, all.length)} · ${T.manual.hint}`;
  };
  const go = (d: number): void => { page = (page + d + all.length) % all.length; show(); };
  const ov = showOverlay(parent, T.manual.title, [], [
    { text: T.manual.prev, onClick: () => go(-1), cls: 'hk-left' },
    { text: T.manual.next, onClick: () => go(1), cls: 'hk-right' },
    { text: T.close, onClick: close }
  ], {
    w: 1060,
    onBack: close,
    extra: (box) => {
      label = el('div', 'mlabel', '', box);
      body = el('div', 'manual-body', '', box);
    }
  });
  ov.root.querySelector('button.hk-left')?.setAttribute('data-hotkey', 'arrowleft');
  ov.root.querySelector('button.hk-right')?.setAttribute('data-hotkey', 'arrowright');
  show();
}
