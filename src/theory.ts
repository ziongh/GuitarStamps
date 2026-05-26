// theory.ts — music theory primitives (pure, zero-dependency)
//
// Handles notes with correct enharmonic spelling (C#, B♭, B𝄫 ...), scale
// degrees, and a small but editable chord-quality dictionary.

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const LETTER_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LETTER_INDEX: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export interface Note {
  letter: string; // "C".."B"
  alter: number; // ... -2 = double flat, -1 = flat, 0, +1 = sharp, +2 = double sharp
}

export function notePc(n: Note): number {
  return (((LETTER_SEMITONE[n.letter] + n.alter) % 12) + 12) % 12;
}

export function noteName(n: Note, unicode = false): string {
  const acc = n.alter >= 0 ? "#".repeat(n.alter) : "b".repeat(-n.alter);
  const s = n.letter + acc;
  return unicode ? s.replace(/##/g, "♯♯").replace(/bb/g, "♭♭").replace(/#/g, "♯").replace(/b/g, "♭") : s;
}

const SHARP_PC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_PC = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/** Common-practice name for a pitch class, sharp- or flat-spelled. */
export function pcName(pc: number, prefer: "sharp" | "flat" = "flat", unicode = false): string {
  const s = (prefer === "sharp" ? SHARP_PC : FLAT_PC)[((pc % 12) + 12) % 12];
  return unicode ? s.replace(/#/g, "♯").replace(/b/g, "♭") : s;
}

/**
 * Note name for display. With `simplify` (default), notes carrying a double
 * accidental (e.g. the ♭♭7 of a dim7 = E𝄫) are respelled to the nearest plain
 * enharmonic (D), preferring sharps/flats per `prefer`. Single accidentals
 * (C♯, B♭, even C♭/E♯) are left as the theory spells them.
 */
export function noteDisplay(
  n: Note,
  opts: { simplify?: boolean; prefer?: "sharp" | "flat"; unicode?: boolean } = {},
): string {
  const { simplify = true, prefer = "flat", unicode = true } = opts;
  if (simplify && Math.abs(n.alter) >= 2) return pcName(notePc(n), prefer, unicode);
  return noteName(n, unicode);
}

export function parseNote(s: string): Note {
  const m = s.trim().replace(/♯/g, "#").replace(/♭/g, "b").match(/^([A-Ga-g])([#b]*)$/);
  if (!m) throw new Error(`Nota inválida: "${s}"`);
  let alter = 0;
  for (const c of m[2]) alter += c === "#" ? 1 : -1;
  return { letter: m[1].toUpperCase(), alter };
}

// ---------------------------------------------------------------------------
// Scale degrees / intervals
// ---------------------------------------------------------------------------
// "stack" semitone keeps 9/11/13 in their compound register so that a set of
// tones sorts into a sensible low->high stacking order.
const DEGREE_SEMITONE: Record<number, number> = {
  1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 9: 14, 11: 17, 13: 21,
};
const DEGREE_LETTERSTEPS: Record<number, number> = {
  1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 9: 1, 11: 3, 13: 5,
};

export interface Degree {
  token: string; // "1", "b3", "#11", "bb7"
  number: number; // 1,3,5,7,9,11,13...
  alter: number;
  semitone: number; // compound semitone above the root (for ordering the stack)
}

export function parseDegree(token: string): Degree {
  const m = token.match(/^([#b]*)(\d+)$/);
  if (!m) throw new Error(`Grau inválido: "${token}"`);
  let alter = 0;
  for (const c of m[1]) alter += c === "#" ? 1 : -1;
  const number = parseInt(m[2], 10);
  if (!(number in DEGREE_SEMITONE)) throw new Error(`Grau não suportado: ${number}`);
  return { token, number, alter, semitone: DEGREE_SEMITONE[number] + alter };
}

/** The correctly spelled Note for a chord tone, given the root. */
export function degreeToNote(root: Note, d: Degree): Note {
  const letter = LETTERS[(LETTER_INDEX[root.letter] + DEGREE_LETTERSTEPS[d.number]) % 7];
  const targetPc = (((notePc(root) + d.semitone) % 12) + 12) % 12;
  let alter = targetPc - LETTER_SEMITONE[letter];
  while (alter > 6) alter -= 12;
  while (alter < -6) alter += 12;
  return { letter, alter };
}

/** Pretty degree label, e.g. "b7" -> "♭7". */
export function prettyDegree(token: string): string {
  return token.replace(/bb/g, "♭♭").replace(/##/g, "♯♯").replace(/b/g, "♭").replace(/#/g, "♯");
}

// Brazilian / "cifragem" degree notation: minor 3rd = "3-", dominant 7th = "7",
// major 7th = "7M"; alterations keep a flat/sharp prefix.
const PT_DEGREE: Record<string, string> = {
  "1": "1", "b9": "b9", "9": "9", "#9": "#9",
  "b3": "3-", "3": "3",
  "4": "4", "11": "11", "#11": "#11",
  "b5": "b5", "5": "5", "#5": "#5",
  "b13": "b13", "6": "6", "13": "13",
  "bb7": "6", "b7": "7", "7": "7M",
};

/** Degree label in Brazilian notation (e.g. "b3" -> "3-", "7" -> "7M"), with ♭/♯ glyphs. */
export function ptDegree(token: string): string {
  const t = PT_DEGREE[token] ?? token;
  return t.replace(/b/g, "♭").replace(/#/g, "♯");
}

// ---------------------------------------------------------------------------
// Chord-quality dictionary  (EDIT ME)
// ---------------------------------------------------------------------------
// `tones`  = the full theoretical chord tones (used by the "stacked" voicing
//            mode and for naming/spelling).
// `drop2`  = the 4 tones to actually voice in a Drop-2 grip when a chord has
//            more than 4 notes. Convention used below: drop the 5th first,
//            then (only if needed) the root; always keep the 3rd, 7th and the
//            top colour tone. These are sensible *defaults* — tweak freely to
//            match the voicings your method teaches.
export interface ChordQuality {
  names: string[]; // accepted suffixes; the full remainder of the symbol must equal one
  display: string; // how the quality is printed in titles (with ♯/♭ glyphs)
  full: string; // human description, used in subtitles
  tones: string[]; // full chord-tone degree tokens
  drop2?: string[]; // 4-tone reduction (required when tones.length > 4)
}

export const QUALITIES: ChordQuality[] = [
  // --- triads ---
  { names: ["maj", "major", "M", ""], display: "", full: "major", tones: ["1", "3", "5"] },
  { names: ["m", "min", "minor", "mi", "-"], display: "m", full: "minor", tones: ["1", "b3", "5"] },
  { names: ["dim", "o", "°"], display: "dim", full: "diminished", tones: ["1", "b3", "b5"] },
  { names: ["aug", "+"], display: "+", full: "augmented", tones: ["1", "3", "#5"] },
  { names: ["sus4", "sus"], display: "sus4", full: "suspended 4th", tones: ["1", "4", "5"] },
  { names: ["sus2"], display: "sus2", full: "suspended 2nd", tones: ["1", "2", "5"] },

  // --- sixths & other 4-note ---
  { names: ["6", "M6", "maj6"], display: "6", full: "major 6", tones: ["1", "3", "5", "6"] },
  { names: ["m6", "min6", "-6"], display: "m6", full: "minor 6", tones: ["1", "b3", "5", "6"] },
  { names: ["6/9", "69", "6add9"], display: "6/9", full: "six-nine", tones: ["1", "3", "6", "9"] },
  { names: ["add9", "add2"], display: "add9", full: "added 9th", tones: ["1", "3", "5", "9"] },

  // --- sevenths ---
  { names: ["maj7", "M7", "7M", "ma7", "Δ7", "Δ", "major7"], display: "maj7", full: "major 7", tones: ["1", "3", "5", "7"] },
  { names: ["7", "dom7"], display: "7", full: "dominant 7", tones: ["1", "3", "5", "b7"] },
  { names: ["m7", "min7", "mi7", "-7", "minor7"], display: "m7", full: "minor 7", tones: ["1", "b3", "5", "b7"] },
  { names: ["m7b5", "ø", "ø7", "min7b5", "m7-5", "halfdim"], display: "m7♭5", full: "half-diminished", tones: ["1", "b3", "b5", "b7"] },
  { names: ["dim7", "o7", "°7"], display: "dim7", full: "diminished 7", tones: ["1", "b3", "b5", "bb7"] },
  { names: ["mMaj7", "mM7", "m7M", "minMaj7", "m(maj7)", "-Δ7", "mΔ7"], display: "m(maj7)", full: "minor-major 7", tones: ["1", "b3", "5", "7"] },
  { names: ["7b5", "7-5"], display: "7♭5", full: "dominant 7♭5", tones: ["1", "3", "b5", "b7"] },
  { names: ["7#5", "7+5", "aug7", "+7"], display: "7♯5", full: "dominant 7♯5", tones: ["1", "3", "#5", "b7"] },

  // --- altered dominants (reduced to 4 for Drop-2) ---
  // 7b9 is voiced rootless (b9 substitutes for the root): 3, 5, 7, b9.
  // Its "root position" therefore has b9 in the bass -> labelled PF* in PT mode.
  { names: ["7b9"], display: "7♭9", full: "dominant 7♭9", tones: ["1", "3", "5", "b7", "b9"], drop2: ["3", "5", "b7", "b9"] },
  { names: ["7#9"], display: "7♯9", full: "dominant 7♯9", tones: ["1", "3", "5", "b7", "#9"], drop2: ["1", "3", "b7", "#9"] },
  { names: ["7#11"], display: "7♯11", full: "dominant 7♯11", tones: ["1", "3", "5", "b7", "#11"], drop2: ["1", "3", "b7", "#11"] },
  { names: ["7b13"], display: "7♭13", full: "dominant 7♭13", tones: ["1", "3", "5", "b7", "b13"], drop2: ["1", "3", "b7", "b13"] },

  // --- ninths ---
  { names: ["9", "dom9"], display: "9", full: "dominant 9", tones: ["1", "3", "5", "b7", "9"], drop2: ["1", "3", "b7", "9"] },
  { names: ["maj9", "M9", "Δ9"], display: "maj9", full: "major 9", tones: ["1", "3", "5", "7", "9"], drop2: ["1", "3", "7", "9"] },
  { names: ["m9", "min9", "-9"], display: "m9", full: "minor 9", tones: ["1", "b3", "5", "b7", "9"], drop2: ["1", "b3", "b7", "9"] },

  // --- elevenths ---
  { names: ["11", "dom11"], display: "11", full: "dominant 11", tones: ["1", "3", "5", "b7", "9", "11"], drop2: ["1", "b7", "9", "11"] },
  { names: ["m11", "min11", "-11"], display: "m11", full: "minor 11", tones: ["1", "b3", "5", "b7", "9", "11"], drop2: ["1", "b3", "b7", "11"] },
  { names: ["maj11", "M11"], display: "maj11", full: "major 11", tones: ["1", "3", "5", "7", "9", "11"], drop2: ["1", "7", "9", "11"] },

  // --- thirteenths ---
  { names: ["13", "dom13"], display: "13", full: "dominant 13", tones: ["1", "3", "5", "b7", "9", "13"], drop2: ["1", "3", "b7", "13"] },
  { names: ["maj13", "M13", "Δ13"], display: "maj13", full: "major 13", tones: ["1", "3", "5", "7", "9", "13"], drop2: ["1", "3", "7", "13"] },
  { names: ["m13", "min13", "-13"], display: "m13", full: "minor 13", tones: ["1", "b3", "5", "b7", "9", "13"], drop2: ["1", "b3", "b7", "13"] },
];

// flat lookup, longest suffix first so "m7b5" wins over "m7" over "m"
const QUALITY_LOOKUP: { name: string; q: ChordQuality }[] = QUALITIES.flatMap((q) =>
  q.names.map((name) => ({ name, q })),
).sort((a, b) => b.name.length - a.name.length);

// ---------------------------------------------------------------------------
// Chords
// ---------------------------------------------------------------------------

export interface ChordTone {
  degree: string; // label, e.g. "1", "b3"
  pc: number; // pitch class 0..11
  note: Note; // correctly spelled note
  semitone: number; // compound semitone (for ordering)
}

export interface ParsedChord {
  symbol: string; // normalized input
  root: Note;
  quality: ChordQuality;
  display: string; // pretty title, e.g. "C♯m7"
  tones: ChordTone[]; // full chord tones, ascending
  drop2Tones: ChordTone[]; // 4 tones for Drop-2 (or = tones for triads / 4-note chords), ascending
  bass?: Note; // slash-chord bass, e.g. the G in "C/G"
  bassDegree?: string; // that bass as a degree of the root, e.g. "5" for C/G
}

function buildTones(root: Note, tokens: string[], order: "compound" | "simple" = "compound"): ChordTone[] {
  // "compound" keeps 9/11/13 in their upper octave (a tall arpeggio — used by
  // the stacked mode). "simple" folds them into one octave so an extension
  // sits in the register of the chord tone it replaces (13 by the 5, etc.) —
  // this keeps Drop-2 grips compact.
  const key = (t: ChordTone) => (order === "simple" ? (((t.semitone % 12) + 12) % 12) : t.semitone);
  return tokens
    .map((t) => {
      const d = parseDegree(t);
      const note = degreeToNote(root, d);
      return { degree: t, pc: notePc(note), note, semitone: d.semitone } as ChordTone;
    })
    .sort((a, b) => key(a) - key(b));
}

const SEMI_TO_DEGREE: Record<number, string> = {
  0: "1", 1: "b9", 2: "9", 3: "b3", 4: "3", 5: "11", 6: "b5", 7: "5", 8: "#5", 9: "13", 10: "b7", 11: "7",
};

/**
 * Compositional chord-quality parser: turns ANY well-formed quality string
 * (e.g. "13b9", "maj7#11", "mMaj9", "7alt", "sus4", "5", "add#11") into its
 * full set of scale-degree tokens. Throws on unparseable leftovers.
 *
 * Conventions: extension N implies the 7th + the lower odd extensions
 * (13 ⇒ 7,9,13; 11 ⇒ 7,9,11). The natural 11 is dropped from chords with a
 * major 3rd (it clashes) unless the chord is exactly an 11 chord or #11 is asked
 * for. `alt` = fully-altered dominant (3, b7, b9, #9, #11, b13).
 */
export function analyzeQuality(raw: string): string[] {
  let q = raw.replace(/[()]/g, ""); // parens are decorative: m(maj7), 7(b9), (#11)
  // symbol / unicode normalization
  q = q.replace(/ø/g, "m7b5").replace(/Δ/g, "maj7").replace(/[–—−]/g, "-");
  q = q.replace(/°7|º7/g, "dim7").replace(/[°º]/g, "dim");
  q = q.replace(/M7/g, "maj7").replace(/M9/g, "maj9").replace(/M11/g, "maj11").replace(/M13/g, "maj13").replace(/M6/g, "6").replace(/7M/g, "maj7").replace(/Maj/g, "maj");
  q = q.replace(/\+5/g, "#5").replace(/\+9/g, "#9").replace(/\+11/g, "#11").replace(/\+/g, "aug");
  q = q.replace(/-5/g, "b5").replace(/-9/g, "b9").replace(/-13/g, "b13");
  q = q.toLowerCase().replace(/min/g, "m").replace(/-/g, "m");

  const consume = (re: RegExp) => { const had = re.test(q); q = q.replace(re, ""); return had; };
  const addsRaw: string[] = [];
  q = q.replace(/add([#b]?\d+)/g, (_m, d) => { addsRaw.push(d); return ""; });
  const omits: number[] = [];
  q = q.replace(/(?:omit|no)(\d+)/g, (_m, d) => { omits.push(parseInt(d, 10)); return ""; });

  let sus: string | null = null;
  if (consume(/sus2/)) sus = "2";
  else if (consume(/sus4/)) sus = "4";
  else if (consume(/sus/)) sus = "4";

  const sixNine = consume(/6\/9|69/);
  const altDom = consume(/alt/);

  const alts = new Set<string>();
  q = q.replace(/([#b])(13|11|9|6|5)/g, (_m, acc, n) => { alts.add(acc + n); return ""; });

  const hasMaj7 = consume(/maj/);
  const isDim = consume(/dim/);
  const isAug = consume(/aug/);
  const isMinor = consume(/m/);

  const nums = q.match(/13|11|9|7|6|5|4|2/g) || [];
  q = q.replace(/13|11|9|7|6|5|4|2/g, "").trim();
  if (q !== "") throw new Error(`trecho de acorde não reconhecido "${raw}"`);

  const num = (n: string) => nums.includes(n);
  const isPower = nums.length === 1 && num("5") && !isMinor && !isDim && !isAug && !hasMaj7 && !sus && !sixNine && !altDom && addsRaw.length === 0 && alts.size === 0;

  const tones = new Set<string>(["1"]);
  const no = (n: number) => omits.includes(n);

  // third
  if (!isPower) {
    if (sus === "2") tones.add("2");
    else if (sus === "4") tones.add("4");
    else if (!no(3)) tones.add(isMinor || isDim ? "b3" : "3");
  }
  // fifth (an altered dominant drops the natural 5th — #11/b13 take its place)
  if (!no(5)) {
    if (alts.has("b5")) tones.add("b5");
    else if (isDim) tones.add("b5");
    else if (isAug || alts.has("#5")) tones.add("#5");
    else if (!altDom) tones.add("5");
  }

  // seventh / sixth (extension *number* implies the 7th; alterations don't)
  let stack = 0;
  if (num("13")) stack = 13;
  else if (num("11")) stack = 11;
  else if (num("9")) stack = 9;
  const hasSeventh = num("7") || stack >= 9 || altDom;
  if (num("6")) tones.add("6");
  if (sixNine) { tones.add("6"); tones.add("9"); } // 6/9 adds a 6 and 9, never a 7th
  if (hasSeventh) tones.add(hasMaj7 ? "7" : isDim ? "bb7" : "b7");

  // tensions
  if (altDom) { tones.add("b9"); tones.add("#9"); }
  else if (stack >= 9) tones.add(alts.has("b9") ? "b9" : alts.has("#9") ? "#9" : "9");
  if (altDom || alts.has("#11")) tones.add("#11");
  else if (stack >= 11 && (stack === 11 || isMinor || !!sus)) tones.add("11"); // natural 11 only where it doesn't clash
  if (altDom) tones.add("b13");
  else if (stack >= 13) tones.add(alts.has("b13") ? "b13" : "13");

  // any explicit alteration not yet placed becomes an added colour tone
  for (const a of alts) if (a !== "b5" && a !== "#5" && !tones.has(a)) tones.add(a);
  // added tones
  for (const a of addsRaw) {
    const t = a.replace(/^2$/, "9").replace(/^4$/, "11");
    tones.add(t);
  }
  // omissions
  if (no(1)) tones.delete("1");
  if (no(3)) { tones.delete("3"); tones.delete("b3"); }
  if (no(5)) { tones.delete("5"); tones.delete("b5"); tones.delete("#5"); }

  return [...tones];
}

/** Reduce a chord to 4 voiced tones for a Drop-2 grip (keep 3rd, 7th, top colour). */
export function reduceToFour(tokens: string[]): string[] {
  if (tokens.length <= 4) return tokens;
  const has = (t: string) => tokens.includes(t);
  const pick: string[] = [];
  const add = (t?: string) => { if (t && has(t) && !pick.includes(t) && pick.length < 4) pick.push(t); };
  add(["2", "b3", "3", "4"].find(has)); // third / sus
  add(["bb7", "b7", "7", "6"].find(has)); // seventh / sixth
  add(["13", "b13", "#11", "#9", "b9", "11", "9"].find(has)); // top colour tone
  add(["#5", "b5"].find(has)); // an altered fifth is a colour tone
  add("1");
  add("5");
  for (const t of ["13", "b13", "#11", "#9", "b9", "11", "9", "6"]) add(t); // remaining colours
  for (const t of tokens) add(t);
  return pick.slice(0, 4);
}

function prettyQuality(q: string): string {
  return q.replace(/b/g, "♭").replace(/#/g, "♯");
}

export function parseChord(symbol: string): ParsedChord {
  let clean = symbol.trim().replace(/♯/g, "#").replace(/♭/g, "b");

  // optional slash bass ("/X" with X a note — not "/9" as in 6/9)
  let bass: Note | undefined;
  const slash = clean.match(/^(.+)\/([A-Ga-g][#b]*)$/);
  if (slash) { clean = slash[1]; bass = parseNote(slash[2]); }

  const m = clean.match(/^([A-Ga-g][#b]*)(.*)$/);
  if (!m) throw new Error(`Não foi possível interpretar o acorde: "${symbol}"`);
  const root = parseNote(m[1]);
  const remainder = m[2];

  let quality: ChordQuality;
  let toneTokens: string[];
  let drop2Tokens: string[];
  let display: string;

  const hit = QUALITY_LOOKUP.find((e) => e.name === remainder);
  if (hit) {
    // curated fast path (method-tuned tones + Drop-2 reduction)
    quality = hit.q;
    toneTokens = hit.q.tones;
    drop2Tokens = hit.q.tones.length <= 4 ? hit.q.tones : hit.q.drop2 ?? reduceToFour(hit.q.tones);
    display = hit.q.display;
  } else {
    // general compositional parser (any chord symbol)
    try {
      toneTokens = analyzeQuality(remainder);
    } catch {
      const known = [...new Set(QUALITIES.map((q) => q.names[0]))].join(", ");
      throw new Error(`Qualidade de acorde desconhecida "${remainder}" em "${symbol}".\nQualidades conhecidas: ${known}`);
    }
    drop2Tokens = toneTokens.length <= 4 ? toneTokens : reduceToFour(toneTokens);
    display = prettyQuality(remainder);
    quality = { names: [remainder], display, full: remainder, tones: toneTokens, drop2: drop2Tokens };
  }

  const tones = buildTones(root, toneTokens, "compound");
  const drop2Tones = buildTones(root, drop2Tokens, "simple");

  const out: ParsedChord = {
    symbol: clean + (bass ? "/" + noteName(bass) : ""),
    root,
    quality,
    display: noteName(root, true) + display + (bass ? "/" + noteName(bass, true) : ""),
    tones,
    drop2Tones,
  };
  if (bass) {
    out.bass = bass;
    out.bassDegree = SEMI_TO_DEGREE[(((notePc(bass) - notePc(root)) % 12) + 12) % 12];
  }
  return out;
}
