/** Todo el texto del juego. Las frases del Cobrador van entre comillas angulares. */
import { nightDef } from '../core/nights';

export const fmt = (n: number): string => n.toLocaleString('es-ES');

export const T = {
  title: 'LA ÚLTIMA FERIA',
  subtitle: 'Una noche más. Una cuota más.',
  titleQuotes: ['«Te estaba esperando.»', '«Siempre vuelven.»', '«La casa nunca duerme.»', '«Entra. La puerta ya está cerrada.»'],
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

  hud: {
    night: 'NOCHE', quota: 'CUOTA', balance: 'SALDO', actions: 'ACCIONES',
    endless: 'INFINITO', peak: 'MÁX', plays: 'JUGADAS',
    toll: (n: number) => `COBRO EN ${n}`,
    tollNow: (x: number) => `LA CASA COBRA −${fmt(x)}`
  },

  endless: {
    button: 'Modo infinito',
    best: (n: number) => `Récord: ${fmt(n)}`,
    confirm: 'Esto borrará la partida guardada. ¿Empezar el modo infinito?',
    house: 'La Casa',
    intro: [
      '«Aquí no hay noches ni cuota. Solo hay casa.»',
      `«Mil fichas. Cada diez jugadas, la casa cobra un poco más. Cuando no puedas apostar, se acabó.»`,
      '«Llega a cien mil y rompes la banca. Nadie lo ha hecho.»'
    ],
    hubLine: '«Juega. La casa espera.»',
    desk: (peak: number, best: number, rank: string, plays: number, toll: number) =>
      `«Máximo: ${fmt(peak)}. Récord: ${fmt(best)}. Rango: ${rank}. Jugadas: ${plays}. Próximo cobro: ${fmt(toll)}.»`,
    ranks: { novato: 'Novato', jugador: 'Jugador', tiburon: 'Tiburón', leyenda: 'Leyenda', banca: 'Rompebancas' } as Record<string, string>,
    deathSub: ['«La casa se queda con lo que queda.»'],
    score: (peak: number, rank: string) => `Máximo alcanzado: ${fmt(peak)} · Rango: ${rank}`,
    newBest: '¡Nuevo récord!',
    again: 'Otra partida infinita',
    winTitle: 'LA BANCA HA SALTADO',
    winLines: ['Cien mil fichas.', 'La casa no sabe qué hacer con tanta derrota.', '«…Esto no se había visto nunca. No se repetirá.»']
  },

  hub: {
    title: 'El pasillo',
    slots: 'Tragaperras',
    roulette: 'Ruleta',
    race: 'Carreras de caballitos',
    mortgage: 'Hipoteca',
    cost: (c: number, min: number) => `${c} ${c === 1 ? 'acción' : 'acciones'} · apuesta mínima ${fmt(min)}`,
    sleep: 'Esperar al amanecer',
    unavailable: 'Sin acciones o fichas para esta mesa',
    quotaMet: '«La cuota está cubierta. Aún puedes tentar a la suerte.»',
    controls: 'WASD o flechas: moverte · clic en la sala: mirar con el ratón (Esc lo suelta) · F o Intro: usar · E: fumar · 1, 2, 3: mesas · 4: hipoteca',
    use: (name: string) => `[F] ${name}`,
    smoke: ['«Fuma. Te queda poco tiempo y mucho humo.»', '«Esa tos no es del tabaco.»', '«Todo se consume, igual que tu cuota.»']
  },

  intro: {
    sign: ['CASINO', 'ABIERTO · 24 H'],
    goal: 'Entra en el casino.',
    inside: 'Está demasiado silencioso…',
    controls: 'WASD o flechas: moverte · clic en la escena: mirar con el ratón (Esc lo suelta) · E: fumar',
    skip: 'Saltar',
    hello: '¿Hola?',
    late: '«Llegas tarde.»',
    abducted: ['…', '«Bienvenido a la última feria.»', '«Llegas justo a tiempo para pagar.»']
  },

  eggs: {
    examine: (label: string) => `[F] ${label}`,
    rooms: { mirrors: 'SALA DE LOS ESPEJOS', storage: 'ALMACÉN', archive: 'ARCHIVO DE DEUDAS' } as Record<string, string>,
    names: {
      coin: 'Moneda', ouija: 'Tablero', jukebox: 'Gramola', tv: 'Televisor', slot777: 'Tragaperras rota', mannequin: 'Maniquí',
      doll: 'Muñeca', jars: 'Frascos', mirror: 'Espejo', ledger: 'Libro de deudas', portraits: 'Retratos', emptyFrame: 'Marco vacío',
      lockedDoor: 'Puerta', exit: 'Salida', phone: 'Teléfono', poster: 'Cartel', tarot: 'Cartas', clock: 'Reloj'
    } as Record<string, string>,
    coin: '«Una moneda con la cara de alguien que conoces.» Te la guardas: +100 fichas.',
    coinDone: 'Solo queda el hueco donde estaba la moneda.',
    ouija: ['La plancheta se mueve sola: S… A… L… I… R.', 'Debajo, tachado con uñas: S… I… E… M… P… R… E.'],
    jukebox: 'Suena el organillo del tiovivo, desafinado a propósito. Nadie ha metido ninguna moneda.',
    tv: ['Entre la nieve, un pasillo. Una figura de espaldas, fumando.', 'Se vuelve. Eres tú. La pantalla se apaga.'],
    slot777: '7… 7… 7… La palanca cede sola y caen setenta y siete fichas.',
    slot777Done: 'Los tres sietes te miran. Ya no queda nada.',
    mannequin: ['No te quita ojo. No se lo quites tú.', 'Cada vez que miras, está en otro sitio.'],
    doll: ['Muñeca de porcelana. Su sonrisa estaba más cerrada antes.', 'Giró la cabeza. Seguro que fue una corriente.'],
    jars: ['Frascos con ojos. Uno guiña.', 'Una etiqueta: «Los que miraron de más».'],
    mirror: ['Tu reflejo llega un segundo tarde.', 'Detrás de ti, el cristal enseña una chistera.'],
    ledger: (nights: number, mode: 'campaign' | 'endless', tolls: number) =>
      mode === 'endless' ? `Una página con tu nombre. Cobros de la casa: ${tolls}. Ninguno devuelto.` : `Noches saldadas: ${nights}. Todas con tu letra. Ninguna con tu permiso.`,
    portraits: ['Todos jugaron. Todos pagaron.', 'Los ojos de los retratos te siguen. Los de uno ya no están.'],
    emptyFrame: 'Un marco vacío. La placa dice: «TÚ».',
    lockedDoor: 'DEUDORES. Cerrada. Se abrirá cuando no puedas pagar.',
    exit: '«No hay salida. Hay cuota.» La puerta ni siquiera tiene picaporte.',
    exitEndless: 'Aquí no se sale. Solo se acumula.',
    phone: ['…respiración. Luego: «No es para ti.»', '…alguien cuelga primero. No fuiste tú.', '«Tu turno llega pronto.» Click.'],
    poster: '«ÚLTIMA VUELTA.» El payaso del cartel no está. Solo queda el globo.',
    tarot: 'La Torre. La Rueda. El Colgado. Tres cartas, ninguna buena.',
    clock: 'El reloj marca las 12:00. Lleva así desde la primera noche.',
    whispers: ['«Siete noches…»', '«No mires atrás.»', '«Cobra. Cobra. Cobra.»', '«Sigues aquí.»', '«Te oigo respirar.»'],
    ring: 'Suena un teléfono lejano. Nadie lo coge.',
    knock: 'Tres golpes. Vienen de dentro de la pared.'
  },

  mortgage: {
    title: 'LA HIPOTECA',
    body: [
      '«¿Cortos de fichas? Firma aquí. Te adelanto lo que pidas.»',
      'Recibes las fichas ahora y devuelves lo prestado más un 30 %, sumado a la cuota de esta noche. Solo una vez por noche. Si ganas el duelo, la deuda se perdona.'
    ],
    option: (amount: number, owed: number) => `Pedir ${fmt(amount)} · devolver ${fmt(owed)}`,
    cancel: 'Mejor no',
    hint: 'pide fichas prestadas',
    done: 'Ya hipotecaste esta noche',
    refuse: '«Ya firmaste esta noche. Una deuda a la vez.»',
    signed: (amount: number, owed: number) => `«Firmado. ${fmt(amount)} fichas tuyas. ${fmt(owed)} mías.»`
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
    twoEyes: 'Dos iguales: te devuelve la apuesta',
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
    plenoHelp: 'Pleno ×36 · exteriores ×2 · el 0 devuelve la mitad',
    partage: (x: number) => `«El cero se queda con la mitad.» Te devuelve ${fmt(x)}.`,
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
