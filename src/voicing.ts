// voicing.ts — turn chord tones into fret positions on the neck.
//
// Modes:
//   drop2    – classic 4-note jazz Drop-2 grip on 4 adjacent strings.
//   stacked  – chord tones stacked one-per-string up from the start string.
//   triad    – stacked, 3 notes (alias used for 3-note chords).
//   explicit – render exact frets the caller supplies.

import { ChordTone, Note, notePc } from "./theory";

export interface Tuning {
  name: string;
  open: Record<number, number>; // string number (1 = high, 6 = low) -> open-string MIDI note
}

export const STANDARD_TUNING: Tuning = {
  name: "EADGBE",
  open: { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 }, // e4 B3 G3 D3 A2 E2
};

// Octave of each string in standard guitar pitch, indexed low->high (string 6..1).
const POS_OCTAVES = [2, 2, 3, 3, 3, 4];

/**
 * Parse a tuning written low-to-high, e.g. "E,A,D,G,B,E" or "D2,A2,D3,G3,B3,E4".
 * Plain letters use standard guitar octaves; scientific names (with a digit) are
 * taken literally.
 */
export function parseTuning(spec: string): Tuning {
  const names = spec.split(/[\s,]+/).filter(Boolean);
  if (names.length !== 6) throw new Error(`A afinação precisa de 6 notas, do grave ao agudo; recebi ${names.length}: "${spec}"`);
  const open: Record<number, number> = {};
  names.forEach((raw, i) => {
    const s = raw.replace(/♯/g, "#").replace(/♭/g, "b");
    const m = s.match(/^([A-Ga-g][#b]*)(-?\d+)?$/);
    if (!m) throw new Error(`Nota de afinação inválida: "${raw}"`);
    let alter = 0;
    const letterMatch = m[1].match(/^([A-Ga-g])([#b]*)$/)!;
    for (const c of letterMatch[2]) alter += c === "#" ? 1 : -1;
    const pc = (((({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[letterMatch[1].toUpperCase()] + alter) % 12) + 12) % 12;
    const octave = m[2] !== undefined ? parseInt(m[2], 10) : POS_OCTAVES[i];
    const stringNumber = 6 - i; // first listed = low E = string 6
    open[stringNumber] = pc + 12 * (octave + 1);
  });
  return { name: spec, open };
}

export interface FretPos {
  string: number; // 1..6
  fret: number; // 0 = open
  pc: number;
  note: Note;
  degree: string; // degree label or "" if unknown
  midi: number;
  isBass: boolean;
}

export interface VoicingResult {
  positions: FretPos[];
  warnings: string[];
}

/** Lowest fret (0..11) on a string that produces the given pitch class. */
function baseFret(pc: number, openMidi: number): number {
  return ((((pc - openMidi) % 12) + 12) % 12);
}

/**
 * Lay an ordered (low->high) list of tones on the given strings, with the bass
 * shifted up by `bassOctave` octaves. Each upper voice takes the lowest fret
 * that keeps the voicing strictly ascending. `liftAt` (voice index >= 1) raises
 * that voice — and, by the ascending rule, every voice above it — one octave:
 * that is what separates an open bass from a hand parked high on the neck
 * (E7 "0 14 12 13" instead of the first-position "0 2 0 1").
 */
function place(order: ChordTone[], strings: number[], tuning: Tuning, bassOctave: number, liftAt = 0): FretPos[] {
  const out: FretPos[] = [];
  let prevMidi = -Infinity;
  order.forEach((tone, i) => {
    const open = tuning.open[strings[i]];
    let fret = baseFret(tone.pc, open) + (i === 0 ? 12 * bassOctave : 0);
    let midi = open + fret;
    if (i > 0) while (midi <= prevMidi) { fret += 12; midi += 12; }
    if (i > 0 && i === liftAt) { fret += 12; midi += 12; }
    out.push({ string: strings[i], fret, pc: tone.pc, note: tone.note, degree: tone.degree, midi, isBass: i === 0 });
    prevMidi = midi;
  });
  return out;
}

/**
 * Pick the best octave for the bass note. Picking the bass's absolute lowest
 * fret can explode the span (e.g. an open bass forces the upper voices way up
 * the neck), so we try a few octaves and prefer a compact grip in the lowest
 * position that is at/above `minFret`.
 */
/** Search knobs shared by every theory-driven voicing mode. `strings` pins the
 *  exact string set (low->high bass first, e.g. [6,4,3]) instead of the mode's
 *  default set derived from the start string. */
export interface VoicingExtra {
  maxSpan?: number; // widest hand stretch, in frets (default 6)
  maxFret?: number; // fret ceiling for the fretted notes
  strings?: number[];
}

interface PlaceOpts {
  maxSpan?: number;
  maxFret?: number;
  preferNoOpen?: boolean; // avoid open strings (method-book voicings are fully fretted)
}
/** `low`/`high`/`span` describe the HAND (fretted notes only): an open string
 *  costs no finger, so it neither anchors the position nor widens the stretch. */
interface Candidate { v: FretPos[]; low: number; high: number; span: number; open: boolean }
function toCandidate(v: FretPos[]): Candidate {
  const fretted = v.filter((p) => p.fret > 0).map((p) => p.fret);
  const low = fretted.length ? Math.min(...fretted) : 0;
  const high = fretted.length ? Math.max(...fretted) : 0;
  return { v, low, high, span: high - low, open: v.some((p) => p.fret === 0) };
}
function placeAscending(order: ChordTone[], strings: number[], tuning: Tuning, minFret: number, opts: PlaceOpts = {}): FretPos[] {
  const maxSpan = opts.maxSpan ?? 6;
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  const push = (v: FretPos[]) => {
    const key = v.map((p) => p.fret).join(",");
    if (!seen.has(key)) { seen.add(key); candidates.push(toCandidate(v)); }
  };
  for (let oct = 0; oct <= 5; oct++) {
    const v = place(order, strings, tuning, oct);
    const c = toCandidate(v);
    if (c.low > 18) break;
    push(v);
    // Open strings + a high hand position: with opens allowed, also try lifting
    // the grip an octave ABOVE each voice, keeping the voices below it where
    // they are. Only lifts that actually ride on an open string earn a spot —
    // a fully fretted lift is just a stretched copy of another octave.
    if (!opts.preferNoOpen) {
      for (let li = 1; li < order.length; li++) {
        const lv = place(order, strings, tuning, oct, li);
        if (!lv.some((p) => p.fret === 0)) continue;
        const lc = toCandidate(lv);
        if (lc.low > 18 || Math.max(...lv.map((p) => p.fret)) > 22) continue;
        push(lv);
      }
    }
  }
  // maxFret is a ceiling on the fretted notes; if it rules out every grip it is
  // relaxed (like minFret's fallback below, the closest playable grip wins)
  let ceiling = candidates;
  if (opts.maxFret !== undefined) {
    const capped = candidates.filter((c) => c.high <= opts.maxFret!);
    if (capped.length) ceiling = capped;
  }
  let pool = ceiling.filter((c) => c.low >= minFret);
  // If minFret asks beyond the last reachable occurrence of this grip, give
  // the HIGHEST available position (closest below the request) instead of
  // silently wrapping to the lowest one.
  const fellBack = pool.length === 0;
  if (fellBack) pool = ceiling;
  // prefer (if asked) fully-fretted grips, then grips within maxSpan, then —
  // with opens allowed — grips that ride an open string (it deepens the chord
  // at no cost to the hand), then the lowest position at/above minFret
  pool.sort((a, b) => {
    if (opts.preferNoOpen && a.open !== b.open) return a.open ? 1 : -1;
    const as = a.span <= maxSpan ? 0 : 1;
    const bs = b.span <= maxSpan ? 0 : 1;
    if (as !== bs) return as - bs;
    if (!opts.preferNoOpen && a.open !== b.open) return a.open ? -1 : 1;
    return fellBack ? b.low - a.low : a.low - b.low;
  });
  return pool[0].v;
}

const INVERSION_NAMES = ["root position", "1st inversion", "2nd inversion", "3rd inversion", "4th inversion", "5th inversion"];
export function inversionName(i: number): string {
  return INVERSION_NAMES[i] ?? `inversion ${i}`;
}

/** Validate an explicit string set (e.g. from "jogo6432") against the set a
 *  mode derives from its start string; a mismatch is a user error, not a hint
 *  to silently voice something else. */
function checkStrings(mode: string, given: number[] | undefined, want: number[], hint: string): number[] {
  if (!given) return want;
  if (given.length === want.length && given.every((s, i) => s === want[i])) return want;
  throw new Error(`O ${mode} usa as cordas ${want.join("-")} a partir desse baixo (recebi ${given.join("-")}). ${hint}`);
}

/**
 * Drop-2 voicing. `tones4` must be the 4 chord tones ascending (root-stacked).
 * `bassIndex` 0..3 selects which tone is in the bass = the inversion
 * (0 root position, 1 first, 2 second, 3 third).
 *
 * A Drop-2 grip lives on 4 adjacent strings, so the start string must leave
 * three higher strings above it: valid start strings are 4, 5 or 6.
 */
export function drop2Voicing(
  tones4: ChordTone[],
  bassIndex: number,
  startString: number,
  tuning: Tuning,
  minFret = 0,
  preferNoOpen = false,
  extra: VoicingExtra = {},
): VoicingResult {
  if (tones4.length !== 4) throw new Error(`O Drop-2 precisa de exatamente 4 notas; recebi ${tones4.length}.`);
  if (bassIndex < 0 || bassIndex > 3) throw new Error(`A inversão de um acorde de 4 notas deve ser 0..3; recebi ${bassIndex}.`);
  if (startString < 4 || startString > 6) {
    throw new Error(
      `O Drop-2 ocupa 4 cordas adjacentes, então a corda do baixo deve ser a 6ª, 5ª ou 4ª ` +
        `(recebi a ${startString}ª). Para um voicing nas cordas agudas, use o modo "stacked".`,
    );
  }
  // Drop-2 voice order for a given bass index b (low->high):
  //   [ t[b], t[b+2], t[b+3], t[b+1] ]   (indices mod 4)
  const b = bassIndex;
  const order = [tones4[b], tones4[(b + 2) % 4], tones4[(b + 3) % 4], tones4[(b + 1) % 4]];
  const strings = checkStrings(
    "Drop-2", extra.strings,
    [startString, startString - 1, startString - 2, startString - 3],
    `Para cordas com salto, use "drop3" (6-4-3-2 / 5-3-2-1) ou "drop24" (6-4-2-1).`,
  );
  return { positions: placeAscending(order, strings, tuning, minFret, { preferNoOpen, maxSpan: extra.maxSpan, maxFret: extra.maxFret }), warnings: [] };
}

/**
 * Drop-3 voicing: the classic "skip one string" guitar shape — bass on the
 * start string, one string skipped, upper voices on the next three. Valid
 * start strings are 6 (set 6-4-3-2) and 5 (set 5-3-2-1). As with Drop-2, the
 * requested inversion names the BASS note.
 */
export function drop3Voicing(
  tones4: ChordTone[],
  bassIndex: number,
  startString: number,
  tuning: Tuning,
  minFret = 0,
  preferNoOpen = false,
  extra: VoicingExtra = {},
): VoicingResult {
  if (tones4.length !== 4) throw new Error(`O Drop-3 precisa de exatamente 4 notas; recebi ${tones4.length}.`);
  if (bassIndex < 0 || bassIndex > 3) throw new Error(`A inversão de um acorde de 4 notas deve ser 0..3; recebi ${bassIndex}.`);
  if (startString < 5 || startString > 6) {
    throw new Error(
      `O Drop-3 pula uma corda depois do baixo, então a corda do baixo deve ser a 6ª ` +
        `(cordas 6-4-3-2, "jogo6432") ou a 5ª (cordas 5-3-2-1, "jogo5321"); recebi a ${startString}ª.`,
    );
  }
  // Close voicing from t[b+3] has t[b] as its 3rd-from-top voice; dropping it
  // an octave puts the requested tone in the bass:
  const b = bassIndex;
  const order = [tones4[b], tones4[(b + 3) % 4], tones4[(b + 1) % 4], tones4[(b + 2) % 4]];
  const strings = checkStrings(
    "Drop-3", extra.strings,
    [startString, startString - 2, startString - 3, startString - 4],
    `Para 4 cordas adjacentes, use "drop2"; para 6-4-2-1, use "drop24".`,
  );
  return { positions: placeAscending(order, strings, tuning, minFret, { preferNoOpen, maxSpan: extra.maxSpan, maxFret: extra.maxFret }), warnings: [] };
}

/**
 * Drop-2&4 voicing: the third classic family — drop the 2nd AND 4th voices of
 * the close voicing an octave. Two string skips: bass on 6, upper voices on
 * 4-2-1 ("jogo6421"). Classic C7 root position: 8 x 5 x 5 6.
 */
export function drop24Voicing(
  tones4: ChordTone[],
  bassIndex: number,
  startString: number,
  tuning: Tuning,
  minFret = 0,
  preferNoOpen = false,
  extra: VoicingExtra = {},
): VoicingResult {
  if (tones4.length !== 4) throw new Error(`O Drop-2&4 precisa de exatamente 4 notas; recebi ${tones4.length}.`);
  if (bassIndex < 0 || bassIndex > 3) throw new Error(`A inversão de um acorde de 4 notas deve ser 0..3; recebi ${bassIndex}.`);
  if (startString !== 6) {
    throw new Error(
      `O Drop-2&4 pula uma corda depois do baixo E outra depois da segunda voz, ` +
        `então só cabe com o baixo na 6ª corda (cordas 6-4-2-1, "jogo6421"); recebi a ${startString}ª.`,
    );
  }
  // Drop-2&4 voice order for bass index b (low->high):
  //   [ t[b], t[b+2], t[b+1], t[b+3] ]   (indices mod 4)
  const b = bassIndex;
  const order = [tones4[b], tones4[(b + 2) % 4], tones4[(b + 1) % 4], tones4[(b + 3) % 4]];
  const strings = checkStrings("Drop-2&4", extra.strings, [6, 4, 2, 1], `Para outros jogos, use "drop2" ou "drop3".`);
  return { positions: placeAscending(order, strings, tuning, minFret, { preferNoOpen, maxSpan: extra.maxSpan, maxFret: extra.maxFret }), warnings: [] };
}

/**
 * Spread ("open") triad: the middle voice of the close triad raised an octave
 * — the Drop-2 of a triad. Default string sets skip one string after the bass:
 * 6-4-3, 5-3-2, 4-2-1; an explicit "jogo" may pick other spacings (6-4-2,
 * 5-3-1…). With 3 custom tones (--vozes "1,3,b7") this also draws shells:
 * C7 --vozes 1,3,b7 aberta jogo643 -> 8 x 8 9 x x.
 */
export function spreadVoicing(
  tones3: ChordTone[],
  bassIndex: number,
  startString: number,
  tuning: Tuning,
  minFret = 0,
  preferNoOpen = false,
  extra: VoicingExtra = {},
): VoicingResult {
  if (tones3.length !== 3) {
    throw new Error(
      `A tríade aberta precisa de exatamente 3 notas; recebi ${tones3.length}. ` +
        `Para um acorde de 4+ notas, escolha 3 graus com --vozes (ex.: --vozes "1,3,b7").`,
    );
  }
  if (bassIndex < 0 || bassIndex > 2) throw new Error(`A inversão de uma tríade deve ser 0..2; recebi ${bassIndex}.`);
  let strings = extra.strings;
  if (strings) {
    if (strings.length !== 3 || !strings.every((s, i) => s >= 1 && s <= 6 && (i === 0 || s < strings![i - 1]))) {
      throw new Error(`A tríade aberta precisa de 3 cordas em ordem descendente (ex.: "jogo643"); recebi ${strings.join("-")}.`);
    }
  } else {
    if (startString < 4 || startString > 6) {
      throw new Error(
        `A tríade aberta pula uma corda depois do baixo, então a corda do baixo deve ser a 6ª, 5ª ou 4ª ` +
          `(jogos 6-4-3, 5-3-2, 4-2-1); recebi a ${startString}ª.`,
      );
    }
    strings = [startString, startString - 2, startString - 3];
  }
  // Spread order for bass index b (low->high): [ t[b], t[b+2], t[b+1] ] (mod 3)
  const b = bassIndex;
  const order = [tones3[b], tones3[(b + 2) % 3], tones3[(b + 1) % 3]];
  return { positions: placeAscending(order, strings, tuning, minFret, { preferNoOpen, maxSpan: extra.maxSpan, maxFret: extra.maxFret }), warnings: [] };
}

/**
 * Stacked voicing: rotate the tone list so the chosen inversion's tone is in
 * the bass, then lay the tones on consecutive strings upward from the start
 * string (one note per string). Naturally handles 9/11/13 chords.
 */
export function stackedVoicing(
  tones: ChordTone[],
  bassIndex: number,
  startString: number,
  tuning: Tuning,
  minFret = 0,
  preferNoOpen = false,
  extra: VoicingExtra = {},
): VoicingResult {
  const n = tones.length;
  if (bassIndex < 0 || bassIndex >= n) throw new Error(`A inversão deve ser 0..${n - 1} para este acorde; recebi ${bassIndex}.`);
  // An explicit "jogo" pins the exact strings (any descending set); otherwise
  // the tones fill consecutive strings upward from the start string.
  const avail = extra.strings ?? Array.from({ length: startString }, (_, i) => startString - i);
  if (extra.strings && !avail.every((s, i) => s >= 1 && s <= 6 && (i === 0 || s < avail[i - 1]))) {
    throw new Error(`O jogo de cordas precisa vir em ordem descendente (do grave ao agudo); recebi ${avail.join("-")}.`);
  }
  const count = Math.min(n, avail.length);
  const warnings: string[] = [];
  if (count < n) {
    warnings.push(
      `acorde de ${n} notas, mas só há ${avail.length} corda(s) ${extra.strings ? "no jogo pedido" : `a partir da ${startString}ª`}; ` +
        `foram tocadas as ${count} notas mais graves. Comece numa corda mais grave (5ª/6ª) para caberem todas.`,
    );
  }
  const order: ChordTone[] = [];
  const strings: number[] = [];
  for (let i = 0; i < count; i++) {
    order.push(tones[(bassIndex + i) % n]);
    strings.push(avail[i]);
  }
  return { positions: placeAscending(order, strings, tuning, minFret, { preferNoOpen, maxSpan: extra.maxSpan, maxFret: extra.maxFret }), warnings };
}

/**
 * Explicit voicing from a fret string written low->high (string 6 -> string 1),
 * e.g. "x x 9 9 9 9". `chordTones`, if given, lets us label each note with its
 * scale degree; otherwise notes are labelled by name.
 */
export function explicitVoicing(
  fretSpec: string,
  tuning: Tuning,
  chordTones?: ChordTone[],
): VoicingResult {
  const tokens = fretSpec.trim().split(/[\s,]+/).filter(Boolean);
  if (tokens.length !== 6) throw new Error(`Os trastes manuais precisam de 6 valores, do grave ao agudo (use x para corda abafada); recebi ${tokens.length}.`);
  const pcToTone = new Map<number, ChordTone>();
  chordTones?.forEach((t) => { if (!pcToTone.has(t.pc)) pcToTone.set(t.pc, t); });

  const positions: FretPos[] = [];
  let bassSet = false;
  tokens.forEach((tok, i) => {
    const stringNumber = 6 - i;
    if (/^[xX\-]$/.test(tok)) return; // muted
    const fret = parseInt(tok, 10);
    if (Number.isNaN(fret) || fret < 0) throw new Error(`Traste inválido "${tok}".`);
    const open = tuning.open[stringNumber];
    const midi = open + fret;
    const pc = ((midi % 12) + 12) % 12;
    const tone = pcToTone.get(pc);
    positions.push({
      string: stringNumber,
      fret,
      pc,
      note: tone?.note ?? pcToNote(pc),
      degree: tone?.degree ?? "",
      midi,
      isBass: false,
    });
  });
  positions.sort((a, b) => a.midi - b.midi);
  if (positions.length && !bassSet) { positions[0].isBass = true; bassSet = true; }
  return { positions, warnings: [] };
}

const SHARP_SPELL: Note[] = [
  { letter: "C", alter: 0 }, { letter: "C", alter: 1 }, { letter: "D", alter: 0 }, { letter: "D", alter: 1 },
  { letter: "E", alter: 0 }, { letter: "F", alter: 0 }, { letter: "F", alter: 1 }, { letter: "G", alter: 0 },
  { letter: "G", alter: 1 }, { letter: "A", alter: 0 }, { letter: "A", alter: 1 }, { letter: "B", alter: 0 },
];
function pcToNote(pc: number): Note {
  return SHARP_SPELL[((pc % 12) + 12) % 12];
}
