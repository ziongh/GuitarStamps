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
  if (names.length !== 6) throw new Error(`Tuning needs 6 notes low->high, got ${names.length}: "${spec}"`);
  const open: Record<number, number> = {};
  names.forEach((raw, i) => {
    const s = raw.replace(/♯/g, "#").replace(/♭/g, "b");
    const m = s.match(/^([A-Ga-g][#b]*)(-?\d+)?$/);
    if (!m) throw new Error(`Invalid tuning note: "${raw}"`);
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
 * that keeps the voicing strictly ascending.
 */
function place(order: ChordTone[], strings: number[], tuning: Tuning, bassOctave: number): FretPos[] {
  const out: FretPos[] = [];
  let prevMidi = -Infinity;
  order.forEach((tone, i) => {
    const open = tuning.open[strings[i]];
    let fret = baseFret(tone.pc, open) + (i === 0 ? 12 * bassOctave : 0);
    let midi = open + fret;
    if (i > 0) while (midi <= prevMidi) { fret += 12; midi += 12; }
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
interface PlaceOpts {
  maxSpan?: number;
  preferNoOpen?: boolean; // avoid open strings (method-book voicings are fully fretted)
}
function placeAscending(order: ChordTone[], strings: number[], tuning: Tuning, minFret: number, opts: PlaceOpts = {}): FretPos[] {
  const maxSpan = opts.maxSpan ?? 6;
  const candidates: { v: FretPos[]; low: number; span: number; open: boolean }[] = [];
  for (let oct = 0; oct <= 5; oct++) {
    const v = place(order, strings, tuning, oct);
    const frets = v.map((p) => p.fret);
    const low = Math.min(...frets);
    if (low > 18) break;
    candidates.push({ v, low, span: Math.max(...frets) - low, open: frets.includes(0) });
  }
  let pool = candidates.filter((c) => c.low >= minFret);
  if (pool.length === 0) pool = candidates;
  // prefer (if asked) fully-fretted grips, then grips within maxSpan, then the lowest position
  pool.sort((a, b) => {
    if (opts.preferNoOpen && a.open !== b.open) return a.open ? 1 : -1;
    const as = a.span <= maxSpan ? 0 : 1;
    const bs = b.span <= maxSpan ? 0 : 1;
    return as !== bs ? as - bs : a.low - b.low;
  });
  return pool[0].v;
}

const INVERSION_NAMES = ["root position", "1st inversion", "2nd inversion", "3rd inversion", "4th inversion", "5th inversion"];
export function inversionName(i: number): string {
  return INVERSION_NAMES[i] ?? `inversion ${i}`;
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
): VoicingResult {
  if (tones4.length !== 4) throw new Error(`Drop-2 needs exactly 4 tones, got ${tones4.length}`);
  if (bassIndex < 0 || bassIndex > 3) throw new Error(`Inversion for a 4-note chord must be 0..3, got ${bassIndex}`);
  if (startString < 4 || startString > 6) {
    throw new Error(
      `Drop-2 uses 4 adjacent strings, so the bass (start) string must be 4, 5 or 6 ` +
        `(got ${startString}). For a voicing on the top strings, use mode "stacked".`,
    );
  }
  // Drop-2 voice order for a given bass index b (low->high):
  //   [ t[b], t[b+2], t[b+3], t[b+1] ]   (indices mod 4)
  const b = bassIndex;
  const order = [tones4[b], tones4[(b + 2) % 4], tones4[(b + 3) % 4], tones4[(b + 1) % 4]];
  const strings = [startString, startString - 1, startString - 2, startString - 3];
  return { positions: placeAscending(order, strings, tuning, minFret, { preferNoOpen }), warnings: [] };
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
): VoicingResult {
  const n = tones.length;
  if (bassIndex < 0 || bassIndex >= n) throw new Error(`Inversion must be 0..${n - 1} for this chord, got ${bassIndex}`);
  const available = startString; // strings startString, startString-1, ... down to 1
  const count = Math.min(n, available);
  const warnings: string[] = [];
  if (count < n) {
    warnings.push(
      `${n}-note chord but only ${available} string(s) above string ${startString}; ` +
        `voiced the lowest ${count} tones. Start lower (string 5/6) to fit them all.`,
    );
  }
  const order: ChordTone[] = [];
  const strings: number[] = [];
  for (let i = 0; i < count; i++) {
    order.push(tones[(bassIndex + i) % n]);
    strings.push(startString - i);
  }
  return { positions: placeAscending(order, strings, tuning, minFret, { preferNoOpen }), warnings };
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
  if (tokens.length !== 6) throw new Error(`Explicit frets need 6 values low->high (use x for muted), got ${tokens.length}`);
  const pcToTone = new Map<number, ChordTone>();
  chordTones?.forEach((t) => { if (!pcToTone.has(t.pc)) pcToTone.set(t.pc, t); });

  const positions: FretPos[] = [];
  let bassSet = false;
  tokens.forEach((tok, i) => {
    const stringNumber = 6 - i;
    if (/^[xX\-]$/.test(tok)) return; // muted
    const fret = parseInt(tok, 10);
    if (Number.isNaN(fret) || fret < 0) throw new Error(`Invalid fret "${tok}"`);
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
