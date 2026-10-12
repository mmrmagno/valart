export const FILLED = '█';
export const EMPTY = '░';

export const MODES = { FHD: 26, Stretched: 27 } as const;
export type Mode = keyof typeof MODES;

export const MIN_HEIGHT = 1;
export const MAX_HEIGHT = 13;
export const DEFAULT_HEIGHT = 7;

export const NAME_MAX = 60;
export const NAME_PATTERN = /^[\p{Script=Latin}\p{N} _'.-]+$/u;
const HAS_ALNUM = /[\p{Script=Latin}\p{N}]/u;

export type Cells = ReadonlySet<string>;

export const cellKey = (row: number, col: number) => `${row},${col}`;

export function toAscii(cells: Cells, width: number, height: number): string {
  const lines: string[] = [];
  for (let r = 0; r < height; r++) {
    let line = '';
    for (let c = 0; c < width; c++) line += cells.has(cellKey(r, c)) ? FILLED : EMPTY;
    lines.push(line);
  }
  return lines.join('\n');
}

export function filledCount(cells: Cells, width: number, height: number): number {
  let n = 0;
  for (const key of cells) {
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
