export const W = 1280;
export const H = 800;

export const C = {
  bg: '#0D0A0E', panel: '#141012', panel2: '#120E10', wood: '#2E2418',
  text: '#D9CFB0', textDim: '#9C9278', textBright: '#EDE4C6',
  lamp: '#E8D27A', danger: '#C24A3A', dangerText: '#E88C7A', eyeRed: '#E0503C',
  blood: '#7A1E1E', felt: '#1B2620', brass: '#8C7442', gold: '#B8973A',
  bone: '#CFC6A8', rust: '#6E4A2E', patina: '#4E5A40'
} as const;

/** Mismos tokens como número para Phaser. */
export const hex = (c: string): number => parseInt(c.slice(1), 16);

export const FONT_UI = 'VT323';
export const FONT_TITLE = 'Special Elite';
