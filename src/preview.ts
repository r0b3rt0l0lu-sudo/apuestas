// Herramienta de desarrollo: muestra los sprites y fondos a escala entera (vite dev → /preview.html?set=fair).
import { Painter } from './art/painter';
import * as sc from './art/scenery';

const out = document.getElementById('o') as HTMLElement;
const set = new URLSearchParams(location.search).get('set') ?? 'fair';

function show(p: Painter, scale: number, layers: Painter[] = [], bg = '#000'): void {
  const c = document.createElement('canvas');
  c.width = p.w * scale; c.height = p.h * scale;
  const x = c.getContext('2d') as CanvasRenderingContext2D;
  x.imageSmoothingEnabled = false;
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
  [p, ...layers].forEach((l) => x.drawImage(l.canvas, 0, 0, c.width, c.height));
  out.appendChild(c);
}

if (set === 'fair') {
  const f = sc.drawFairNight();
  const base = new Painter(sc.SW, sc.SH).blit(f.bg).blit(f.stars[1] as Painter).blit(f.bulbs[0] as Painter);
  const w = sc.drawWheelFrame(0, 48);
  base.ctx.drawImage(w.canvas, 232 - 64, 92 - 64);
  base.ctx.globalAlpha = 1;
  base.ctx.drawImage(f.fog.canvas, 0, 130);
  show(base, 4);
}
if (set === 'booth') {
  const b = sc.drawBooth(), c = sc.drawCabinet();
  const base = new Painter(sc.SW, sc.SH).blit(b.bg).blit(b.glow).blit(c.body).blit(c.bulbs[0] as Painter);
  base.ctx.drawImage((c.lever[0] as Painter).canvas, 244, 40);
  show(base, 4);
}
if (set === 'felt') { const f = sc.drawFeltRoom(); show(new Painter(sc.SW, sc.SH).blit(f.bg).blit(f.flames[0] as Painter), 4); }
if (set === 'arena') { const a = sc.drawArena(); show(new Painter(sc.SW, sc.SH).blit(a.bg).blit(a.bulbs[0] as Painter).blit(a.crowd[0] as Painter), 4); }
if (set === 'duel') { const d = sc.drawDuelRoom(); show(new Painter(sc.SW, sc.SH).blit(d.bg).blit(d.beam), 4); }
if (set === 'dawn') { const d = sc.drawDawnSky(); const base = new Painter(sc.SW, sc.SH).blit(d.bg); base.ctx.drawImage(d.sun.canvas, 120, 70); show(base, 4); }

if (set === 'cb') {
  const cb = await import('./art/cobrador');
  for (const m of cb.MOODS) show(cb.composeStill(m).grade(), 6, [], '#000');
  show(cb.drawGlitch('sonrisa', false).grade(), 6, [], '#000');
}

if (set === 'horse') {
  const h = await import('./art/horse');
  const race = await import('./games/race');
  race.HORSES.forEach((d, i) => {
    const look = { skin: d.skin, body: d.body, mane: d.mane, num: d.num };
    const a = new Painter(48, 40).blit(h.drawHorse(look, 0)).blit(h.drawPole()), b = new Painter(48, 40).blit(h.drawHorse(look, 1)).blit(h.drawPole());
    show(a, 8, [], '#241a20'); show(b, 8, [], '#241a20');
    if (i === 5) show(new Painter(48, 40).blit(h.drawHorse(look, 0, true)).blit(h.drawPole()), 8, [], '#241a20');
  });
}

if (set === 'props') {
  const pr = await import('./art/props');
  [pr.drawEyeSymbol('abierto'), pr.drawEyeSymbol('izq'), pr.drawEyeSymbol('cerrado'), pr.drawTooth(), pr.drawMoth(), pr.drawKey(), pr.drawSkull(), pr.drawSeven(0), pr.drawSeven(1)].forEach((p) => show(p, 8, [], '#241a20'));
  (['monoculo', 'moneda', 'vela', 'reloj', 'polvora'] as const).forEach((i) => show(pr.drawItem(i), 8, [], '#241a20'));
  show(pr.drawCandle(true, 0), 8, [], '#241a20'); show(pr.drawCandle(true, 1), 8, [], '#241a20'); show(pr.drawCandle(false, 0), 8, [], '#241a20');
  show(pr.drawBlunderbuss(), 8, [], '#241a20');
}
