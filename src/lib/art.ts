import groups from './palette.json';

export const FILLED = '█';
export const EMPTY = '░';

export const PALETTE = groups.map((g) => ({ label: g.label, chars: [...g.chars] }));
export const LETTER = /^[A-Za-z0-9]$/;
export const ALLOWED: ReadonlySet<string> = new Set(PALETTE.flatMap((g) => g.chars));
export const isAllowed = (ch: string) => ALLOWED.has(ch) || LETTER.test(ch);
export const BACKGROUNDS = ['░', '▒', '─'] as const;

export const INVERSE: Readonly<Record<string, string>> = Object.fromEntries(
  ['▀▄', '▌▐', '▖▜', '▗▛', '▘▟', '▝▙', '▚▞', '░▓'].flatMap(([a, b]) => [
    [a, b],
    [b, a],
  ]),
);

export const isBoxGlyph = (ch: string) => ch >= '\u2500' && ch <= '\u259f';

export const CHAR_NAMES: Readonly<Record<string, string>> = {
  '█': 'full block',
  '▓': 'dark shade',
  '▒': 'medium shade',
  '░': 'light shade',
  '■': 'small square',
  '▀': 'upper half',
  '▄': 'lower half',
  '▌': 'left half',
  '▐': 'right half',
  '▖': 'lower left quarter',
  '▗': 'lower right quarter',
  '▘': 'upper left quarter',
  '▝': 'upper right quarter',
  '▙': 'all but upper right',
  '▛': 'all but lower right',
  '▜': 'all but lower left',
  '▟': 'all but upper left',
  '▚': 'diagonal down',
  '▞': 'diagonal up',
};
export const charName = (ch: string) => CHAR_NAMES[ch] ?? (isBoxGlyph(ch) ? `line ${ch}` : ch);

export const MODES = { FHD: 26, Stretched: 27 } as const;
export type Mode = keyof typeof MODES;

export const MIN_HEIGHT = 1;
export const MAX_HEIGHT = 13;
export const DEFAULT_HEIGHT = 7;

export const NAME_MAX = 60;
export const NAME_PATTERN = /^[\p{Script=Latin}\p{N} _'.-]+$/u;
const HAS_ALNUM = /[\p{Script=Latin}\p{N}]/u;

export type Cells = ReadonlyMap<string, string>;

export const cellKey = (row: number, col: number) => `${row},${col}`;

export function toAscii(cells: Cells, width: number, height: number, background: string = EMPTY): string {
  const lines: string[] = [];
  for (let r = 0; r < height; r++) {
    let line = '';
    for (let c = 0; c < width; c++) line += cells.get(cellKey(r, c)) ?? background;
    lines.push(line);
  }
  return lines.join('\n');
}

export function filledCount(cells: Cells, width: number, height: number): number {
  let n = 0;
  for (const key of cells.keys()) {
    const [r, c] = key.split(',').map(Number);
    if (r < height && c < width) n++;
  }
  return n;
}

export function validName(value: string): string | null {
  const v = value.trim();
  if (!v) return 'required';
  if ([...v].length > NAME_MAX) return `at most ${NAME_MAX} characters`;
  if (!NAME_PATTERN.test(v) || !HAS_ALNUM.test(v)) return "Latin letters, digits, spaces and _ ' . - only";
  return null;
}

export function slugify(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'art'
  );
}
