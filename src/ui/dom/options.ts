import { session } from '../../core/session';
import { T } from '../../i18n/es';
import { btn, setBtnText } from './kit';
import { showOverlay } from './overlay';

/** Opciones: volumen general, música, efectos y reducir destellos (se guardan con la partida). */
export function openOptions(parent: HTMLElement, onClose?: () => void): void {
  const keys: Array<['volume' | 'music' | 'sfx', string]> = [['volume', T.opt.volume], ['music', T.opt.music], ['sfx', T.opt.sfx]];
  const ov = showOverlay(parent, T.options, [], [{ text: T.close, onClick: () => { ov.close(); onClose?.(); } }], {
    w: 800,
    onBack: () => { ov.close(); onClose?.(); },
    extra: (box) => {
      const col = document.createElement('div');
      col.style.cssText = 'display:flex;flex-direction:column;gap:8px;align-items:stretch';
      box.appendChild(col);
      for (const [key, title] of keys) {
        const text = () => `${title}: ${Math.round(session.options[key] * 100)} %`;
        const b = btn(col, text(), () => { session.setOptions({ [key]: Math.round(((session.options[key] * 10 + 1) % 11)) / 10 }); setBtnText(b, text()); });
      }
      const flash = () => `${T.opt.reduceFlash}: ${session.options.reduceFlash ? T.opt.on : T.opt.off}`;
      const f = btn(col, flash(), () => { session.setOptions({ reduceFlash: !session.options.reduceFlash }); setBtnText(f, flash()); });
    }
  });
}
