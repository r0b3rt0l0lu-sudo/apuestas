import { sfx } from '../../audio/sfx';

/** Escribe un texto letra a letra; se puede saltar y se detiene al cerrar la pantalla. */
export class Typewriter {
  private timer = 0;
  private full = '';
  private done: (() => void) | null = null;
  busy = false;

  constructor(private target: HTMLElement, private cps = 42) {}

  say(s: string, whisper = false): Promise<void> {
    this.stop();
    this.full = s;
    this.busy = true;
    this.target.textContent = '';
    if (whisper) sfx.whisper();
    return new Promise((res) => {
      this.done = res;
      let i = 0;
      this.timer = window.setInterval(() => {
        i++;
        this.target.textContent = s.slice(0, i);
        if (i >= s.length) this.finish();
      }, 1000 / this.cps);
    });
  }

  skip(): boolean {
    if (!this.busy) return false;
    this.target.textContent = this.full;
    this.finish();
    return true;
  }

  private finish(): void {
    window.clearInterval(this.timer);
    this.busy = false;
    const d = this.done;
    this.done = null;
    d?.();
  }

  stop(): void {
    window.clearInterval(this.timer);
    if (this.busy) this.finish();
  }
}
