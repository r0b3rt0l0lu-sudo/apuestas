/** Todo el texto del juego. Las frases del Cobrador van entre comillas angulares. */
import { nightDef } from '../core/nights';

export const fmt = (n: number): string => n.toLocaleString('es-ES');

export const T = {
  title: 'LA ÚLTIMA FERIA',
  subtitle: 'Una noche más. Una cuota más.',
  warnTitle: 'AVISO',
  warnBody: [
    'Contenido solo para mayores de 18 años.',
    'Juego de terror psicológico: imágenes inquietantes, destellos, sonidos repentinos y temática de apuestas.',
    'Las fichas son ficticias. No hay dinero real, ni compras, ni nada que se pueda canjear.',
    'Puedes reducir destellos y temblores en Opciones.'
  ],
  warnOk: 'Soy mayor de edad. Entrar',
  newGame: 'Nueva partida',
  continue: 'Continuar',
  options: 'Opciones',
  back: 'Volver',
  close: 'Cerrar',
  confirmNew: 'Esto borrará la partida guardada. ¿Empezar de nuevo?',
  yes: 'Sí',
  no: 'No',
  keysHint: 'Flechas: moverse · Intro/Espacio: elegir · Esc: volver',

  opt: { volume: 'Volumen general', music: 'Música y ambiente', sfx: 'Efectos', reduceFlash: 'Reducir destellos y temblores', on: 'Sí', off: 'No' },

  hud: { night: 'NOCHE', quota: 'CUOTA', balance: 'SALDO', actions: 'ACCIONES' },

  hub: {
    title: 'El pasillo',
    slots: 'Tragaperras',
    roulette: 'Ruleta',
    race: 'Carreras de caballitos',
    cost: (c: number, min: number) => `${c} ${c === 1 ? 'acción' : 'acciones'} · apuesta mínima ${fmt(min)}`,
    sleep: 'Esperar al amanecer',
    unavailable: 'Sin acciones o fichas para esta mesa',
    quotaMet: '«La cuota está cubierta. Aún puedes tentar a la suerte.»'
  },

  tutorial: [
    '«Bienvenido a la feria. No hay salida. Hay cuota.»',
    '«Cada noche fijo una cantidad de fichas. Si al amanecer no la tienes, abro la puerta de Deudores.»',
    '«Tienes acciones limitadas. La tragaperras cuesta una, la ruleta dos y los caballitos tres.»',
    '«Si no pagas, tú y yo jugamos a otra cosa. Un trabuco. Cartuchos reales y de fogueo. Gana quien quede con velas.»',
    '«Siete noches. Empecemos.»'
  ],

  night: {
    intro: (n: number) => {
      const d = nightDef(n);
      return `«Noche ${n}. Cuota: ${fmt(d.quota)}. ${d.actions} acciones. Ni una más.»`;
    },
    curse: {
      slotReel3: 'Una bombilla de la tragaperras se ha fundido: el tercer rodillo tarda más.',
      doubleZero: 'El Ojo de la ruleta ve antes: ahora hay dos ceros (0 y 00).',
      widowFast: 'Viuda corre mejor. Ceniza, peor.',
      duelCandle: 'El Cobrador hace trampas: empieza el duelo con una vela de más.'
    },
    curseLine: (n: number) => {
      const own = nightDef(n).curse;
      if (n >= 7) return 'Todas las maldiciones, a la vez.';
      return own ? T.night.curse[own] : '';
    },
    nextWords: ['mil', 'dos mil quinientas', 'cinco mil', 'nueve mil', 'quince mil', 'veinticinco mil', 'cincuenta mil']
  },

  slots: {
    title: 'TRAGAPERRAS',
    pull: 'Tirar de la palanca',
    paytable: 'Tres iguales',
    twoEyes: 'Dos ojos: te devuelve la apuesta',
    names: { ojo: 'Ojo', diente: 'Diente', polilla: 'Polilla', llave: 'Llave', calavera: 'Calavera', siete: 'Siete' } as Record<string, string>,
    bet: 'Apuesta',
    back: 'Volver al pasillo'
  },

  roulette: {
    title: 'RULETA',
    spin: 'Girar la rueda',
    bet: 'Ficha',
    kinds: { rojo: 'Rojo', negro: 'Negro', par: 'Par', impar: 'Impar', bajo: '1–18', alto: '19–36' } as Record<string, string>,
    pleno: 'Pleno',
    plenoHelp: 'Pleno ×36 · exteriores ×2 · el 0 pierde',
    result: (label: string, color: string) => `Sale el ${label} ${color}`
  },

  race: {
    title: 'CARRERAS DE CABALLITOS',
    go: '¡Que corran!',
    pick: 'Elige caballito (1–6)',
    winner: (n: string) => `Gana ${n}`,
    bet: 'Apuesta'
  },

  duel: {
    title: 'ÚLTIMA OPORTUNIDAD',
    intro: ['«No llegaste.»', '«Se abre la puerta de Deudores.»', '«Un trabuco. Cuatro velas cada uno.»'],
    counts: (r: number, f: number) => `${r} real${r === 1 ? '' : 'es'} · ${f} fogueo`,
    hidden: 'Cartuchos ocultos',
    shootBoss: 'Disparar al Cobrador',
    shootSelf: 'Dispararte',
    yourTurn: 'Tu turno',
    bossTurn: 'Turno del Cobrador',
    click: 'Clic… era de fogueo.',
    bang: 'Cartucho real.',
    items: { monoculo: 'Monóculo', moneda: 'Moneda trucada', vela: 'Vela', reloj: 'Reloj de arena', polvora: 'Pólvora' } as Record<string, string>,
    itemHelp: {
      monoculo: 'Ves el cartucho cargado',
      moneda: 'Invierte el cartucho cargado',
      vela: '+1 vida',
      reloj: 'El rival pierde su próximo turno',
      polvora: 'Siguiente disparo: doble daño'
    } as Record<string, string>,
    seen: (s: string) => `El cartucho es ${s === 'real' ? 'REAL' : 'de fogueo'}.`,
    bossUses: (i: string) => `El Cobrador usa: ${i}`,
    bossShootsYou: 'El Cobrador te apunta.',
    bossShootsSelf: 'El Cobrador se apunta a sí mismo.',
    youShootBoss: 'Apuntas al Cobrador.',
    youShootSelf: 'Te apuntas a ti mismo.',
    skipped: 'Pierde su turno.',
    newRound: 'Nueva ronda. Se recarga el trabuco.',
    win: '«…Está bien. La deuda queda perdonada. Por hoy.»',
    lose: '«Qué pena.»'
  },

  dawn: {
    title: 'NOCHE SUPERADA',
    paid: (q: number) => `Cuota pagada: ${fmt(q)}`,
    forgiven: 'Deuda perdonada: el Cobrador pierde el duelo.',
    left: (b: number) => `Te quedan ${fmt(b)} fichas`,
    next: (words: string) => `«Mañana, ${words}.»`,
    go: 'Dormir hasta la noche siguiente',
    lastNext: '«Se acabó la feria.»'
  },

  death: {
    title: 'HAS MUERTO',
    sub: ['«Las deudas se pagan.»', 'La feria vuelve a abrir.'],
    again: 'Empezar de nuevo',
    nights: (n: number) => `Llegaste a la noche ${n}.`
  },

  ending: {
    title: 'AMANECE',
    lines: ['Siete noches. Siete cuotas.', 'La puerta de la feria se abre por primera vez.', '«…Volveré a cobrar. Siempre vuelvo.»'],
    again: 'Volver a la feria'
  },

  lines: {
    slotsWin: ['«La suerte de un principiante.»', '«Qué bonito sonido. Disfrútalo.»', '«Cógelas. Aún no se han ido.»', '«Algo se ha roto ahí dentro.»'],
    slotsLose: ['«Te tiemblan las manos.»', '«La máquina nunca olvida.»', '«Otra vez. Otra vez.»', '«Las monedas se acuerdan de mí.»'],
    rouletteWin: ['«El Ojo parpadeó. Te vio.»', '«Hoy te mira con cariño.»', '«No te acostumbres.»'],
    rouletteLose: ['«La bola siempre sabe.»', '«El cero te espera.»', '«Qué silencio, ¿verdad?»'],
    raceWin: ['«Un caballito agradecido.»', '«Galopan hacia donde les mando.»', '«Cobra. Mientras puedas.»'],
    raceLose: ['«Cerraron la apuesta. Y los ojos.»', '«El tiovivo no se detiene por ti.»', '«Mañana, otra vuelta.»'],
    low: ['«Quedan pocas acciones. Qué pena.»', '«El tiempo se acaba.»']
  }
};
