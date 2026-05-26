// index.ts — public API.
//
//   import { makeDiagram, diagramFromSpec } from "./src/index";
//   const { svg } = diagramFromSpec("C#m7 inv3 str4");

import { noteDisplay, noteName, notePc, parseChord, prettyDegree, ptDegree, type ChordTone, type Note, type ParsedChord } from "./theory";
import {
  drop2Voicing,
  explicitVoicing,
  inversionName,
  stackedVoicing,
  STANDARD_TUNING,
  type FretPos,
  type Tuning,
  type VoicingResult,
} from "./voicing";
import { renderSvg, type LabelMode, type SvgOptions } from "./svg";
import { renderMethodSvg } from "./method";

export * from "./theory";
export * from "./voicing";
export * from "./svg";
export * from "./method";

export type VoicingMode = "auto" | "drop2" | "stacked" | "triad";
export type DiagramStyle = "method" | "plain";

export interface DiagramOptions {
  // theory-driven voicing
  chord?: string; // e.g. "C#m7"
  inversion?: number; // 0 = root position, 1 = 1st, ...
  startString?: number; // string the bass note sits on (1..6)
  mode?: VoicingMode;
  minFret?: number; // push the grip up the neck to/above this fret

  // explicit voicing (overrides the theory engine)
  frets?: string; // "x x 9 9 9 9" low->high

  // rendering / labelling
  style?: DiagramStyle; // "method" (Brazilian, default) or "plain"
  tuning?: Tuning;
  labels?: LabelMode;
  title?: string; // overrides the auto title
  subtitle?: string | null; // null suppresses the auto subtitle
  svg?: Partial<SvgOptions>;
}

export interface DiagramResult {
  svg: string;
  positions: FretPos[];
  chord?: ParsedChord;
  inversion: number;
  startString: number;
  mode: VoicingMode;
  warnings: string[];
}

export function makeDiagram(opts: DiagramOptions): DiagramResult {
  const tuning = opts.tuning ?? STANDARD_TUNING;
  let inversion = opts.inversion ?? 0;
  const startString = opts.startString ?? 4;
  const labels: LabelMode = opts.labels ?? "degree";

  // Only the Brazilian "method" style is available for now: it is the one that
  // renders fully in pt-BR (cifragem 7M/7/3-, PF/1ª I, "› 1ª voz"). The "plain"
  // style emits English degree notation, so a request for it falls back to
  // "method" and a notice is added to the warnings.
  let style: DiagramStyle = opts.style ?? "method";
  const styleWarnings: string[] = [];
  if (style === "plain") {
    style = "method";
    styleWarnings.push("o estilo 'plain' está desativado por enquanto — gerando no estilo método (notação pt-BR).");
  }

  // ---- explicit-fret mode ----
  if (opts.frets) {
    const chord = opts.chord ? parseChord(opts.chord) : undefined;
    const res = explicitVoicing(opts.frets, tuning, chord?.tones);
    let svg: string;
    if (style === "method") {
      const titleChord = opts.title ?? (chord ? prettyChord(chord.symbol) : "—");
      const titleSub = typeof opts.subtitle === "string" ? opts.subtitle : "";
      svg = buildMethodSvg(res.positions, titleChord, titleSub, chord ? labels : "note", opts.svg);
    } else {
      const title = opts.title ?? chord?.display ?? "chord";
      const subtitle = opts.subtitle === undefined ? null : opts.subtitle;
      svg = renderSvg(res.positions, { ...opts.svg, title, subtitle, labels: chord ? labels : "note" });
    }
    return { svg, positions: res.positions, chord, inversion, startString, mode: "drop2", warnings: [...res.warnings, ...styleWarnings] };
  }

  // ---- theory-driven mode ----
  if (!opts.chord) throw new Error("Forneça um acorde (`chord`) ou os trastes (`frets`).");
  const chord = parseChord(opts.chord);

  let mode = opts.mode ?? "auto";
  if (mode === "auto") mode = chord.tones.length <= 3 ? "triad" : "drop2";

  // slash-chord bass: a chord-tone bass selects that inversion; a non-chord
  // ("pedal") bass is added as the lowest note via a stacked voicing.
  let pedalBass: Note | undefined;
  let stackedTones = chord.tones;
  if (chord.bass) {
    const bassPc = notePc(chord.bass);
    const arr = mode === "drop2" ? chord.drop2Tones : chord.tones;
    const idx = arr.findIndex((t) => t.pc === bassPc);
    if (idx >= 0) {
      inversion = idx;
    } else {
      pedalBass = chord.bass;
      mode = "stacked";
      stackedTones = [{ degree: chord.bassDegree ?? "", pc: bassPc, note: chord.bass, semitone: 0 }, ...chord.tones];
      inversion = 0;
    }
  }

  const noOpen = style === "method"; // method-book voicings are fully fretted
  let res: VoicingResult;
  if (mode === "drop2") {
    res = drop2Voicing(chord.drop2Tones, inversion, startString, tuning, opts.minFret ?? 0, noOpen);
  } else {
    res = stackedVoicing(stackedTones, inversion, startString, tuning, opts.minFret ?? 0, noOpen);
  }

  const usedTones = mode === "drop2" ? chord.drop2Tones : stackedTones;
  const rootless = !usedTones.some((t) => t.degree === "1");
  const bass = res.positions.find((p) => p.isBass)!;
  const notePrefer = opts.svg?.notePrefer ?? (chord.root.alter > 0 ? "sharp" : "flat");

  let svg: string;
  if (style === "method") {
    const titleChord = opts.title ?? prettyChord(chord.symbol);
    const titleSub =
      opts.subtitle === null ? ""
        : typeof opts.subtitle === "string" ? opts.subtitle
          : pedalBass ? `baixo ${noteName(pedalBass, true)}`
            : ptInvLabel(inversion, rootless);
    svg = buildMethodSvg(res.positions, titleChord, titleSub, labels, { ...opts.svg, notePrefer });
  } else {
    const title = opts.title ?? chord.display;
    const autoSub =
      `${inversionName(inversion)} · bass ${prettyDegree(bass.degree)} · str ${startString}` +
      (mode === "drop2" ? " · drop-2" : mode === "triad" ? "" : " · stacked");
    const subtitle = opts.subtitle === undefined ? autoSub : opts.subtitle;
    svg = renderSvg(res.positions, { ...opts.svg, title, subtitle, labels, notePrefer });
  }

  return { svg, positions: res.positions, chord, inversion, startString, mode, warnings: [...res.warnings, ...styleWarnings] };
}

// ---- Brazilian method-style helpers ----
function prettyChord(sym: string): string {
  return sym.replace(/b/g, "♭").replace(/#/g, "♯");
}
const PT_INV = ["PF", "1ª I", "2ª I", "3ª I", "4ª I", "5ª I"];
function ptInvLabel(inv: number, rootless: boolean): string {
  if (inv === 0) return rootless ? "PF*" : "PF";
  return PT_INV[inv] ?? `${inv}ª I`;
}
function buildMethodSvg(
  positions: FretPos[],
  titleChord: string,
  titleSub: string,
  labels: LabelMode,
  svgOpts?: Partial<SvgOptions>,
): string {
  const simplify = svgOpts?.simplify ?? true;
  const prefer = svgOpts?.notePrefer ?? "flat";
  const noteOf = (p: FretPos) => noteDisplay(p.note, { simplify, prefer, unicode: true });
  const dotLabel = (p: FretPos) =>
    labels === "none" ? "" : labels === "note" ? noteOf(p) : p.degree ? ptDegree(p.degree) : noteOf(p);
  const voiceLabel = (p: FretPos) => (p.degree ? ptDegree(p.degree) : noteOf(p));
  return renderMethodSvg(
    { positions, titleChord, titleSub, dotLabel, voiceLabel },
    { accent: svgOpts?.accent, ink: svgOpts?.ink, paper: svgOpts?.paper, scale: svgOpts?.scale },
  );
}

// ---------------------------------------------------------------------------
// Spec parser:  "<chord> [invN|root|1st|2nd|3rd] [strN] [drop2|stacked|triad]
//                [minN] [labels:degree|note|none]"
// ---------------------------------------------------------------------------
const INV_WORDS: Record<string, number> = {
  root: 0, rootpos: 0, rp: 0, pf: 0, "pf*": 0,
  "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5,
  "1a": 1, "1ª": 1, "2a": 2, "2ª": 2, "3a": 3, "3ª": 3, "4a": 4, "4ª": 4,
};

export function parseSpec(spec: string): DiagramOptions {
  const tokens = spec.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) throw new Error("Pedido vazio.");
  const out: DiagramOptions = { chord: tokens[0] };
  const unknown: string[] = [];

  for (const tokRaw of tokens.slice(1)) {
    const tok = tokRaw.toLowerCase();
    let m: RegExpMatchArray | null;
    if (tok in INV_WORDS) out.inversion = INV_WORDS[tok];
    else if ((m = tok.match(/^inv(?:ersion)?[:=]?(\d+)$/))) out.inversion = parseInt(m[1], 10);
    else if ((m = tok.match(/^(?:str|string|s|from)[:=]?([1-6])$/))) out.startString = parseInt(m[1], 10);
    // "row" = string-group shorthand: row1 -> bass on string 6, row2 -> 5, row3 -> 4
    else if ((m = tok.match(/^row[:=]?([1-3])$/))) out.startString = 7 - parseInt(m[1], 10);
    else if ((m = tok.match(/^(?:group|grupo)[:=]?([1-6]{3,4})$/))) out.startString = parseInt(m[1][0], 10);
    else if (/^(drop-?2|d2)$/.test(tok)) out.mode = "drop2";
    else if (/^(stack(ed)?)$/.test(tok)) out.mode = "stacked";
    else if (/^triad$/.test(tok)) out.mode = "triad";
    else if (/^(method|plain)$/.test(tok)) out.style = tok as DiagramStyle;
    else if ((m = tok.match(/^(?:min|minfret|pos)[:=]?(\d+)$/))) out.minFret = parseInt(m[1], 10);
    else if ((m = tok.match(/^labels?[:=](degree|note|none)$/))) out.labels = m[1] as LabelMode;
    else unknown.push(tokRaw);
  }
  if (unknown.length) throw new Error(`Termo(s) não reconhecido(s) no pedido: ${unknown.join(", ")}`);
  return out;
}

export function diagramFromSpec(spec: string, extra: Partial<DiagramOptions> = {}): DiagramResult {
  return makeDiagram({ ...parseSpec(spec), ...extra });
}

/** A filesystem-friendly slug for a spec / chord. */
export function slugify(s: string): string {
  return s
    .replace(/#/g, "sharp")
    .replace(/♯/g, "sharp")
    .replace(/b(?=\d)/g, "flat")
    .replace(/♭/g, "flat")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}
