import type Phaser from 'phaser';
import { sfx } from '../audio/sfx';

/** Escribe un texto letra a mano; se puede saltar. */
export class Typewriter {
  private ev: Phaser.Time.TimerEvent | null = null;
  private full = '';
  private done: (() => void) | null = null;
  busy = false;

  constructor(private scene: Phaser.Scene, private target: Phaser.GameObjects.Text, private cps = 42) {}

  say(s: string, whisper = false): Promise<void> {
    this.stop();
    this.full = s;
    this.busy = true;
    this.target.setText('');
    if (whisper) sfx.whisper();
    return new Promise((res) => {
      this.done = res;
      let i = 0;
      this.ev = this.scene.time.addEvent({
        delay: 1000 / this.cps,
        repeat: s.length - 1,
        callback: () => {
          i++;
          this.target.setText(s.slice(0, i));
          if (i >= s.length) this.finish();
        }
      });
    });
  }

  /** Si está escribiendo, completa el texto; devuelve true si había algo que saltar. */
  skip(): boolean {
    if (!this.busy) return false;
    this.ev?.remove();
    this.target.setText(this.full);
    this.finish();
    return true;
  }

  private finish(): void {
    this.busy = false;
    const d = this.done;
    this.done = null;
    d?.();
  }

  stop(): void {
    this.ev?.remove();
    this.ev = null;
    if (this.busy) this.finish();
  }
}
