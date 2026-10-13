import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, SubmitEvent } from 'react';
import {
  BACKGROUNDS,
  DEFAULT_HEIGHT,
  EMPTY,
  FILLED,
  MAX_HEIGHT,
  MIN_HEIGHT,
  MODES,
  INVERSE,
  LETTER,
  NAME_MAX,
  PALETTE,
  cellKey,
  charName,
  isAllowed,
  isBoxGlyph,
  filledCount,
  toAscii,
  validName,
  type Mode,
} from '@/lib/art';
import './Creator.css';

interface Props {
  turnstileSiteKey: string;
}

interface Turnstile {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

type Cells = Map<string, string>;
interface History {
  past: Cells[];
  present: Cells;
  future: Cells[];
}
type SubmitState = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done' } | { kind: 'error'; message: string };

const DRAFT_KEY = 'valart:draft';
const HISTORY_LIMIT = 100;

interface Draft {
  mode: Mode;
  height: number;
  cells: [string, string][];
  brush: string;
  background: string;
}

function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Draft> & { cells?: unknown[] };
    if (!d.mode || !Object.hasOwn(MODES, d.mode) || !Array.isArray(d.cells)) return null;
    const cells = d.cells
      .map((c): [string, string] | null =>
        typeof c === 'string' ? [c, FILLED] : Array.isArray(c) && typeof c[0] === 'string' && typeof c[1] === 'string' && isAllowed(c[1]) ? [c[0], c[1]] : null,
      )
      .filter((c) => c !== null);
    return {
      mode: d.mode,
      height: Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Number(d.height) || DEFAULT_HEIGHT)),
      cells,
      brush: d.brush && isAllowed(d.brush) ? d.brush : FILLED,
      background: d.background && (BACKGROUNDS as readonly string[]).includes(d.background) ? d.background : EMPTY,
    };
  } catch {
    return null;
  }
}

function Glyph({ ch }: { ch: string }) {
  return <span className={isBoxGlyph(ch) ? 'fit' : 'letter'}>{ch}</span>;
}

interface TileProps {
  group: string;
  ch: string;
  checked: boolean;
  onPick: (ch: string) => void;
}

function Tile({ group, ch, checked, onPick }: TileProps) {
  return (
    <label className={checked ? 'tile active' : 'tile'} title={charName(ch)}>
      <input type="radio" name={group} value={ch} checked={checked} onChange={() => onPick(ch)} aria-label={charName(ch)} />
      <Glyph ch={ch} />
    </label>
  );
}
export default function Creator({ turnstileSiteKey }: Props) {
  const draft = useMemo(loadDraft, []);
  const [mode, setMode] = useState<Mode>(draft?.mode ?? 'FHD');
  const [height, setHeight] = useState(draft?.height ?? DEFAULT_HEIGHT);
  const [brush, setBrush] = useState(draft?.brush ?? FILLED);
  const [background, setBackground] = useState(draft?.background ?? EMPTY);
  const [hist, setHist] = useState<History>(() => ({ past: [], present: new Map(draft?.cells ?? []), future: [] }));
  const cells = hist.present;
  const [cursor, setCursorState] = useState({ row: 0, col: 0 });
  const cursorRef = useRef(cursor);
  const setCursor = useCallback((next: { row: number; col: number } | ((c: { row: number; col: number }) => { row: number; col: number })) => {
    const value = typeof next === 'function' ? next(cursorRef.current) : next;
    cursorRef.current = value;
    setCursorState(value);
  }, []);
  const [confirmClear, setConfirmClear] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const clearTimer = useRef<number | undefined>(undefined);

  const width = MODES[mode];
  const ascii = useMemo(() => toAscii(cells, width, height, background), [cells, width, height, background]);
  const count = useMemo(() => filledCount(cells, width, height), [cells, width, height]);
  const blank = useMemo(() => new Set(ascii.replace(/\n/g, '')).size < 2, [ascii]);

  const stroke = useRef<{ paint: boolean; char: string; pointerId: number } | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);

  const flash = useCallback((text: string, ok = true) => {
    setNotice({ text, ok });
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2500);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(noticeTimer.current);
      window.clearTimeout(clearTimer.current);
    },
    [],
  );

  useEffect(() => {
    const end = () => {
      stroke.current = null;
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ mode, height, cells: [...cells], brush, background } satisfies Draft));
    } catch {
      // storage unavailable (private mode): drafts are a convenience only
    }
  }, [mode, height, cells, brush, background]);

  const commit = useCallback((change: (draft: Cells) => void) => {
    setHist((h) => {
      const next = new Map(h.present);
      change(next);
      return { past: [...h.past.slice(-(HISTORY_LIMIT - 1)), h.present], present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setHist((h) =>
      h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h,
    );
  }, []);

  const redo = useCallback(() => {
    setHist((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h));
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea')) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const setCell = (map: Cells, row: number, col: number, char: string | null) => {
    const key = cellKey(row, col);
    if (char) map.set(key, char);
    else map.delete(key);
  };

  const cellFromPoint = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const cell = el?.closest<HTMLElement>('[data-row]');
    if (!cell) return null;
    return { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const hit = cellFromPoint(e.clientX, e.clientY);
    if (!hit) return;
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // capture is an optimisation; strokes still work through pointermove on the grid
    }
    const paint = cells.get(cellKey(hit.row, hit.col)) !== brush;
    stroke.current = { paint, char: brush, pointerId: e.pointerId };
    setCursor(hit);
    commit((next) => setCell(next, hit.row, hit.col, paint ? brush : null));
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = stroke.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const hit = cellFromPoint(e.clientX, e.clientY);
    if (!hit) return;
    const key = cellKey(hit.row, hit.col);
    const want = s.paint ? s.char : undefined;
    setHist((h) => {
      if (h.present.get(key) === want) return h;
      const next = new Map(h.present);
      setCell(next, hit.row, hit.col, want ?? null);
      return { ...h, present: next };
    });
  };

  const endStroke = (e: PointerEvent<HTMLDivElement>) => {
    if (stroke.current?.pointerId === e.pointerId) stroke.current = null;
  };

  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (e.key in moves) {
      e.preventDefault();
      const [dr, dc] = moves[e.key];
      setCursor((c) => {
        const next = { row: Math.min(height - 1, Math.max(0, c.row + dr)), col: Math.min(width - 1, Math.max(0, c.col + dc)) };
        const char = cells.get(cellKey(next.row, next.col));
        setAnnouncement(`Row ${next.row + 1}, column ${next.col + 1}, ${char ? charName(char) : 'empty'}`);
        return next;
      });
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const { row, col } = cursorRef.current;
      const willFill = cells.get(cellKey(row, col)) !== brush;
      commit((next) => setCell(next, row, col, willFill ? brush : null));
      setAnnouncement(`Row ${row + 1}, column ${col + 1}, ${willFill ? charName(brush) : 'empty'}`);
    } else if (LETTER.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const { row, col } = cursorRef.current;
      commit((next) => setCell(next, row, col, e.key));
      const last = row === height - 1 && col === width - 1;
      setCursor(last ? { row, col } : col + 1 < width ? { row, col: col + 1 } : { row: row + 1, col: 0 });
      setAnnouncement(`Row ${row + 1}, column ${col + 1}, ${e.key}`);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      let { row, col } = cursorRef.current;
      if (e.key === 'Backspace') {
        if (col > 0) col -= 1;
        else if (row > 0) [row, col] = [row - 1, width - 1];
        setCursor({ row, col });
      }
      commit((next) => setCell(next, row, col, null));
      setAnnouncement(`Row ${row + 1}, column ${col + 1}, empty`);
    }
  };

  useEffect(() => {
    setCursor((c) => ({ row: Math.min(c.row, height - 1), col: Math.min(c.col, width - 1) }));
  }, [height, width, setCursor]);

  const invert = () => {
    commit((next) => {
      for (let r = 0; r < height; r++)
        for (let c = 0; c < width; c++) {
          const key = cellKey(r, c);
          const char = next.get(key);
          if (!char) next.set(key, FILLED);
          else if (char === FILLED) next.delete(key);
          else if (INVERSE[char]) next.set(key, INVERSE[char]);
        }
    });
  };

  const clear = () => {
    window.clearTimeout(clearTimer.current);
    if (!confirmClear) {
      setConfirmClear(true);
      clearTimer.current = window.setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    commit((next) => next.clear());
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ascii);
      flash('Copied, paste it into Valorant chat');
    } catch {
      flash('Copy failed, select the art below and copy it by hand', false);
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([ascii], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'valart.txt';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const rows = useMemo(() => Array.from({ length: height }, (_, r) => r), [height]);
  const cols = useMemo(() => Array.from({ length: width }, (_, c) => c), [width]);

  return (
    <div className="creator">
      <section className="panel controls" aria-label="Canvas settings">
        <fieldset>
          <legend>Chat width</legend>
          {(Object.keys(MODES) as Mode[]).map((m) => (
            <label key={m} className={m === mode ? 'chip active' : 'chip'}>
              <input type="radio" name="mode" value={m} checked={m === mode} onChange={() => setMode(m)} />
              {m} <span>{MODES[m]} cols</span>
            </label>
          ))}
        </fieldset>
        <div className="height">
          <label htmlFor="height">
            Lines <strong>{height}</strong>
          </label>
          <input
            id="height"
            type="range"
            min={MIN_HEIGHT}
            max={MAX_HEIGHT}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
          />
        </div>
        <div className="brushes">
          <div className="brush-head">
            <span className="tile big" aria-hidden="true">
              <Glyph ch={brush} />
            </span>
            <p>
              <span className="group-label">Brush</span>
              <strong>{charName(brush)}</strong>
            </p>
            <fieldset className="background">
              <legend className="group-label">Background</legend>
              <div className="tiles">
                {BACKGROUNDS.map((ch) => (
                  <Tile key={ch} group="background" ch={ch} checked={ch === background} onPick={setBackground} />
                ))}
              </div>
            </fieldset>
          </div>
          <fieldset className="palette">
            <legend className="sr-only">Brush</legend>
            {PALETTE.map((group) => (
              <div key={group.label} className="tile-group" role="group" aria-label={group.label}>
                <span className="group-label" aria-hidden="true">
                  {group.label}
                </span>
                <div className="tiles">
                  {group.chars.map((ch) => (
                    <Tile key={ch} group="brush" ch={ch} checked={ch === brush} onPick={setBrush} />
                  ))}
                </div>
              </div>
            ))}
          </fieldset>
        </div>
        <div className="tools">
          <button type="button" className="btn ghost" onClick={undo} disabled={!hist.past.length} title="Undo (Ctrl+Z)">
            Undo
          </button>
          <button type="button" className="btn ghost" onClick={redo} disabled={!hist.future.length} title="Redo (Ctrl+Y)">
            Redo
          </button>
          <button type="button" className="btn ghost" onClick={invert}>
            Invert
          </button>
          <button type="button" className={confirmClear ? 'btn' : 'btn ghost'} onClick={clear}>
            {confirmClear ? 'Click again to clear' : 'Clear'}
          </button>
        </div>
      </section>

      <section className="panel canvas" aria-label="Drawing grid">
        <div className="scroller">
          <div
            className="grid"
            style={{ ['--cols' as string]: width }}
            role="application"
            aria-roledescription="drawing grid"
            aria-label={`Drawing grid, ${width} by ${height}. Arrow keys move, space toggles a cell, letters and digits type into it.`}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            onLostPointerCapture={endStroke}
            onKeyDown={onGridKey}
          >
            {rows.map((r) =>
              cols.map((c) => {
                const char = cells.get(cellKey(r, c));
                const focus = r === cursor.row && c === cursor.col;
                return (
                  <div
                    key={`${r}-${c}`}
                    data-row={r}
                    data-col={c}
                    className={`cell${char === FILLED ? ' on' : char ? ' glyph' : ''}${focus ? ' cursor' : ''}`}
                  >
                    {char && char !== FILLED ? <Glyph ch={char} /> : null}
                  </div>
                );
              }),
            )}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
        <p className="hint">
          {count} of {width * height} cells · click a cell and type to add letters · undo with Ctrl+Z
        </p>
      </section>

      <section className="panel output" aria-label="Output">
        <div className="output-head">
          <h2>Output</h2>
          <div className="tools">
            <button type="button" className="btn" onClick={copy} disabled={blank}>
              Copy for chat
            </button>
            <button type="button" className="btn ghost" onClick={download} disabled={blank}>
              Download .txt
            </button>
          </div>
        </div>
        <pre className="art preview">{ascii}</pre>
        <p className={notice?.ok === false ? 'notice bad' : 'notice ok'} role="status">
          {notice?.text ?? ''}
        </p>
      </section>

      <SubmitForm ascii={ascii} width={width} height={height} empty={blank} siteKey={turnstileSiteKey} />
    </div>
  );
}

interface SubmitProps {
  ascii: string;
  width: number;
  height: number;
  empty: boolean;
  siteKey: string;
}

function SubmitForm({ ascii, width, height, empty, siteKey }: SubmitProps) {
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');
  const [touched, setTouched] = useState(false);
  const [token, setToken] = useState('');
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });
  const [widgetFailed, setWidgetFailed] = useState(false);
  const widgetEl = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    const started = Date.now();
    const mount = () => {
      if (cancelled || !widgetEl.current || widgetId.current) return;
      if (!window.turnstile) {
        if (Date.now() - started > 15000) {
          setWidgetFailed(true);
          return;
        }
        window.setTimeout(mount, 250);
        return;
      }
      widgetId.current = window.turnstile.render(widgetEl.current, {
        sitekey: siteKey,
        action: 'submit',
        theme: 'dark',
        callback: (t: string) => setToken(t),
        'expired-callback': () => setToken(''),
        'error-callback': () => setToken(''),
        'timeout-callback': () => setToken(''),
      });
    };
    mount();
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey]);

  const nameError = validName(name);
  const authorError = validName(author);

  const submit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched(true);
    if (nameError || authorError || empty || !token) return;
    setState({ kind: 'sending' });
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), author: author.trim(), art: ascii, width, height, turnstileToken: token }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `submission failed (${res.status})`);
      setState({ kind: 'done' });
      setName('');
      setTouched(false);
    } catch (err) {
      const message = err instanceof TypeError ? 'could not reach the server, check your connection' : err instanceof Error ? err.message : 'submission failed';
      setState({ kind: 'error', message });
    } finally {
      setToken('');
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    }
  };

  if (!siteKey) {
    return (
      <section className="panel submit" aria-label="Submit to the gallery">
        <h2>Submit to the gallery</h2>
        <p className="muted">Submissions are not open yet. Copy your art and keep it for now.</p>
      </section>
    );
  }

  return (
    <section className="panel submit" aria-label="Submit to the gallery">
      <h2>Submit to the gallery</h2>
      <p className="muted">Your piece is reviewed before it shows up. No account needed.</p>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="art-name">Name of the piece</label>
          <input
            id="art-name"
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={touched && !!nameError}
            aria-describedby="art-name-error"
          />
          <span id="art-name-error" className="error">
            {touched && nameError}
          </span>
        </div>
        <div className="field">
          <label htmlFor="art-author">Your name</label>
          <input
            id="art-author"
            value={author}
            maxLength={NAME_MAX}
            onChange={(e) => setAuthor(e.target.value)}
            aria-invalid={touched && !!authorError}
            aria-describedby="art-author-error"
          />
          <span id="art-author-error" className="error">
            {touched && authorError}
          </span>
        </div>
        <div ref={widgetEl} className="turnstile" />
        {widgetFailed && <p className="error">The captcha did not load. Disable blockers for this site and reload.</p>}
        {empty && <p className="error">Draw something first.</p>}
        <button className="btn" type="submit" disabled={state.kind === 'sending' || empty || !token}>
          {state.kind === 'sending' ? 'Sending…' : 'Submit for review'}
        </button>
        <p role="status" className={state.kind === 'error' ? 'notice bad' : 'notice ok'}>
          {state.kind === 'done' && 'Submitted. It shows up in the gallery once it is reviewed.'}
          {state.kind === 'error' && state.message}
        </p>
      </form>
    </section>
  );
}
