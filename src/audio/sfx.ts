/**
 * Audio sintetizado con WebAudio. No hay archivos de sonido: cada efecto y cada
 * ambiente son marcadores de posición generados por código (ver CLAUDE.md §8).
 */
import { session } from '../core/session';

type Ambience = 'none' | 'hub' | 'slots' | 'roulette' | 'race' | 'duel';

class Sfx {
  private ac: AudioContext | null = null;
  private amb: { stop: () => void } | null = null;
  private ambKind: Ambience = 'none';
  private duck = 1;

  private ctx(): AudioContext | null {
    try {
      this.ac = this.ac ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      if (this.ac.state === 'suspended') void this.ac.resume();
      return this.ac;
    } catch {
      return null;
    }
  }

  private get vSfx(): number { return session.options.volume * session.options.sfx; }
  private get vMusic(): number { return session.options.volume * session.options.music * this.duck; }

  private tone(f: number, dur: number, type: OscillatorType, vol: number, when = 0, slide = 0): void {
    const ac = this.ctx();
    if (!ac || vol <= 0) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    const t = ac.currentTime + when;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, freq: number, when = 0, q = 0.7, type: BiquadFilterType = 'lowpass'): void {
    const ac = this.ctx();
    if (!ac || vol <= 0) return;
    const buf = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * dur)), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    const t = ac.currentTime + when;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(ac.destination);
    src.start(t);
  }

  click(): void { this.tone(900, 0.04, 'square', 0.04 * this.vSfx * 4); }
  lever(): void { this.tone(110, 0.25, 'sawtooth', 0.12 * this.vSfx, 0, -60); this.noise(0.12, 0.12 * this.vSfx, 800, 0.2); }
  reelStop(): void { this.tone(220, 0.09, 'square', 0.1 * this.vSfx); this.noise(0.05, 0.08 * this.vSfx, 1500); }
  reelTick(): void { this.tone(600, 0.02, 'square', 0.025 * this.vSfx); }
  /** Premio: un acorde roto. */
  prize(): void { [262, 311, 392, 466].forEach((f, i) => this.tone(f * (i % 2 ? 1.012 : 1), 0.5, 'triangle', 0.08 * this.vSfx, i * 0.07)); }
  lose(): void { [196, 175, 147].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.1 * this.vSfx, i * 0.14)); }
  blank(): void { this.tone(1500, 0.03, 'square', 0.1 * this.vSfx); this.noise(0.04, 0.06 * this.vSfx, 3000, 0, 1, 'highpass'); }
  shot(): void { this.noise(0.5, 0.5 * this.vSfx, 1200); this.tone(70, 0.45, 'sawtooth', 0.3 * this.vSfx, 0, -40); }
  aim(): void { this.tone(300, 0.2, 'sawtooth', 0.06 * this.vSfx, 0, 120); }
  whisper(): void { for (let i = 0; i < 3; i++) this.noise(0.5, 0.05 * this.vSfx, 2500 + i * 700, i * 0.3, 4, 'bandpass'); }
  ballTick(): void { this.tone(1800 + Math.random() * 300, 0.012, 'square', 0.03 * this.vSfx); }
  /** Grito del susto: dos dientes de sierra desafinados que suben, ruido áspero y un golpe grave. */
  scream(): void {
    const v = this.vSfx;
    this.tone(520, 1.1, 'sawtooth', 0.22 * v, 0, 900);
    this.tone(557, 1.1, 'sawtooth', 0.2 * v, 0, 1000);
    this.tone(1180, 0.9, 'square', 0.08 * v, 0.05, -500);
    this.noise(0.9, 0.35 * v, 2600, 0, 0.8, 'highpass');
    this.tone(55, 0.7, 'sine', 0.4 * v, 0, -20);
  }
  /** Golpe seco (agarrón, caída). */
  thud(): void { this.tone(70, 0.35, 'sine', 0.35 * this.vSfx, 0, -35); this.noise(0.25, 0.18 * this.vSfx, 500); }
  lighter(): void { this.tone(2600, 0.03, 'square', 0.06 * this.vSfx); this.noise(0.3, 0.08 * this.vSfx, 3200, 0.06, 1, 'highpass'); }
  drag(): void {
    this.noise(1.1, 0.1 * this.vSfx, 1800, 0, 0.8, 'bandpass');
    for (let i = 0; i < 7; i++) this.noise(0.02, 0.05 * this.vSfx, 5000 + i * 300, 0.1 + i * 0.13, 1, 'highpass');
  }
  exhale(): void { this.noise(1.8, 0.09 * this.vSfx, 900, 0, 0.6); }
  glitch(): void { this.noise(0.12, 0.05 * this.vSfx, 4000, 0, 1, 'highpass'); }

  setDuck(v: number): void { this.duck = v; }

  /** Ambiente en bucle por escena (generado, sin archivos). */
  ambience(kind: Ambience): void {
    if (kind === this.ambKind) return;
    this.amb?.stop();
    this.amb = null;
    this.ambKind = kind;
    const ac = kind === 'none' ? null : this.ctx();
    if (!ac) return;
    const nodes: Array<{ stop: () => void }> = [];
    const drone = (f: number, vol: number, type: OscillatorType = 'sawtooth') => {
      const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
      o.type = type; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 300; g.gain.value = 0;
      o.connect(lp).connect(g).connect(ac.destination); o.start();
      const upd = window.setInterval(() => { g.gain.value = vol * this.vMusic * 0.25; }, 200);
      nodes.push({ stop: () => { window.clearInterval(upd); try { o.stop(); } catch { /* ya parado */ } } });
    };
    const timers: number[] = [];
    nodes.push({ stop: () => timers.forEach((t) => window.clearInterval(t)) });
    if (kind === 'hub') { drone(50, 0.5); drone(100.7, 0.2, 'square'); timers.push(window.setInterval(() => this.tone(1400, 0.05, 'sine', 0.04 * this.vMusic, 0, -500), 4300)); }
    if (kind === 'slots') { drone(55, 0.4); timers.push(window.setInterval(() => this.noise(0.1, 0.05 * this.vMusic, 600), 1700)); }
    if (kind === 'roulette') { drone(45, 0.4, 'sine'); timers.push(window.setInterval(() => this.noise(1.2, 0.04 * this.vMusic, 400, 0, 0.5), 5200)); }
    if (kind === 'duel') { drone(41, 0.6); drone(41.6, 0.5); }
    if (kind === 'race') this.organ(timers);
    this.amb = { stop: () => nodes.forEach((n) => n.stop()) };
  }

  /** Organillo de tiovivo desafinado; se ralentiza con `slowdown`. */
  private slow = 1;
  slowOrgan(v: number): void { this.slow = v; }
  private organ(timers: number[]): void {
    const tune = [392, 440, 494, 392, 330, 349, 392, 294];
    let i = 0;
    const step = () => {
      const f = (tune[i % tune.length] as number) * (i % 3 === 0 ? 0.97 : 1.02) / this.slow;
      this.tone(f, 0.28 * this.slow, 'square', 0.05 * this.vMusic);
      this.tone(f / 2 * 1.01, 0.28 * this.slow, 'triangle', 0.05 * this.vMusic);
      i++;
    };
    this.slow = 1;
    timers.push(window.setInterval(step, 320));
  }
}

export const sfx = new Sfx();
