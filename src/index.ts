// index.ts — public API.
//
//   import { makeDiagram, diagramFromSpec } from "./src/index";
//   const { svg } = diagramFromSpec("C#m7 inv3 str4");

import { buildTones, noteDisplay, noteName, notePc, parseChord, prettyDegree, ptDegree, type ChordTone, type Note, type ParsedChord } from "./theory";
import {
  drop2Voicing,
  drop24Voicing,
  drop3Voicing,
  explicitVoicing,
  inversionName,
  spreadVoicing,
  stackedVoicing,
  STANDARD_TUNING,
  type FretPos,
  type Tuning,
  type VoicingExtra,
  type VoicingResult,
} from "./voicing";
import { renderSvg, type LabelMode, type SvgOptions } from "./svg";
import { renderMethodSvg } from "./method";

import { optionsFromFlags, parseArgs, tokenize, type ParsedArgs } from "./cliargs";

export * from "./cliargs";
export * from "./theory";
export * from "./voicing";
export * from "./svg";
export * from "./method";

export type VoicingMode = "auto" | "drop2" | "drop3" | "drop24" | "aberta" | "stacked" | "triad";
export type DiagramStyle = "method" | "plain";

export interface DiagramOptions {
  // theory-driven voicing
  chord?: string; // e.g. "C#m7"
  inversion?: number; // 0 = root position, 1 = 1st, ...
  startString?: number; // string the bass note sits on (1..6)
  strings?: number[]; // exact string set (bass first, descending), e.g. [6,4,3] from "jogo643"
  mode?: VoicingMode;
  minFret?: number; // push the grip up the neck to/above this fret
  maxFret?: number; // fret ceiling for the fretted notes
  maxSpan?: number; // widest hand stretch in frets (default 6)
  voices?: string; // hand-picked degrees to voice, e.g. "3,5,b7,9" (rootless) or "1,3,b7" (shell)
  allowOpen?: boolean; // let the voicing use open strings (method style avoids them by default)

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
  const startString = opts.startString ?? (opts.mode === "drop24" ? 6 : 4);
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

  // --vozes: hand-picked degrees override the dictionary's voiced-tone choice.
  // "simple" folds tensions into the grip's octave (compact drop grips);
  // "compound" keeps the tall stack for the stacked mode — same convention as
  // the dictionary's drop2Tones/tones pair.
  let voiceTokens: string[] | undefined;
  if (opts.voices) voiceTokens = [...new Set(String(opts.voices).split(/[\s,.]+/).filter(Boolean))];
  const gripTones = voiceTokens ? buildTones(chord.root, voiceTokens, "simple") : chord.drop2Tones;
  const stackTones = voiceTokens ? buildTones(chord.root, voiceTokens, "compound") : chord.tones;

  let mode = opts.mode ?? "auto";
  if (mode === "auto") mode = stackTones.length <= 3 ? "triad" : "drop2";
  const dropFamily = () => mode === "drop2" || mode === "drop3" || mode === "drop24" || mode === "aberta";

  // slash-chord bass: a chord-tone bass selects that inversion; a non-chord
  // ("pedal") bass is added as the lowest note via a stacked voicing.
  let pedalBass: Note | undefined;
  let stackedTones = stackTones;
  if (chord.bass) {
    const bassPc = notePc(chord.bass);
    const arr = dropFamily() ? gripTones : stackTones;
    const idx = arr.findIndex((t) => t.pc === bassPc);
    if (idx >= 0) {
      inversion = idx;
    } else {
      pedalBass = chord.bass;
      mode = "stacked";
      stackedTones = [{ degree: chord.bassDegree ?? "", pc: bassPc, note: chord.bass, semitone: 0 }, ...stackTones];
      inversion = 0;
    }
  }

  const noOpen = style === "method" && !opts.allowOpen; // method voicings are fully fretted unless "soltas" is asked
  const minF = opts.minFret ?? 0;
  // a pedal bass grows the voicing by one note, so a jogo pinned for the
  // original mode no longer fits — fall back to consecutive strings
  const extra: VoicingExtra = { maxSpan: opts.maxSpan, maxFret: opts.maxFret, strings: pedalBass ? undefined : opts.strings };
  let res: VoicingResult;
  if (mode === "drop2") {
    res = drop2Voicing(gripTones, inversion, startString, tuning, minF, noOpen, extra);
  } else if (mode === "drop3") {
    res = drop3Voicing(gripTones, inversion, startString, tuning, minF, noOpen, extra);
  } else if (mode === "drop24") {
    res = drop24Voicing(gripTones, inversion, startString, tuning, minF, noOpen, extra);
  } else if (mode === "aberta") {
    res = spreadVoicing(gripTones, inversion, startString, tuning, minF, noOpen, extra);
  } else {
    res = stackedVoicing(stackedTones, inversion, startString, tuning, minF, noOpen, extra);
  }

  const usedTones = dropFamily() ? gripTones : stackedTones;
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
      (mode === "triad" ? "" : ` · ${mode}`);
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
    { accent: svgOpts?.accent, ink: svgOpts?.ink, paper: svgOpts?.paper, scale: svgOpts?.scale, minFrets: svgOpts?.minWindow },
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
    else if ((m = tok.match(/^(?:group|grupo|jogo)[:=]?([1-6]{3,4})$/))) {
      const digits = m[1].split("").map(Number);
      if (!digits.every((d, i) => i === 0 || d < digits[i - 1])) {
        throw new Error(`O jogo de cordas vem do grave ao agudo, em ordem descendente (ex.: jogo5432, jogo643); recebi "${tokRaw}".`);
      }
      out.startString = digits[0];
      out.strings = digits;
    }
    else if (/^(drop-?2|d2)$/.test(tok)) out.mode = "drop2";
    else if (/^(drop-?3|d3)$/.test(tok)) out.mode = "drop3";
    else if (/^(drop-?2&4|drop-?24|d24)$/.test(tok)) out.mode = "drop24";
    else if (/^(aberta|spread)$/.test(tok)) out.mode = "aberta";
    else if (/^(stack(ed)?)$/.test(tok)) out.mode = "stacked";
    else if (/^triad$/.test(tok)) out.mode = "triad";
    else if (/^(method|plain)$/.test(tok)) out.style = tok as DiagramStyle;
    else if ((m = tok.match(/^(?:min|minfret|pos)[:=]?(\d+)$/))) out.minFret = parseInt(m[1], 10);
    else if ((m = tok.match(/^(?:max|maxfret)[:=]?(\d+)$/))) out.maxFret = parseInt(m[1], 10);
    else if ((m = tok.match(/^span[:=]?(\d+)$/))) out.maxSpan = parseInt(m[1], 10);
    else if ((m = tok.match(/^vozes[:=]([#b0-9.,]+)$/))) out.voices = m[1];
    else if (/^(soltas?|open)$/.test(tok)) out.allowOpen = true;
    else if ((m = tok.match(/^labels?[:=](degree|note|none)$/))) out.labels = m[1] as LabelMode;
    else unknown.push(tokRaw);
  }
  if (unknown.length) throw new Error(`Termo(s) não reconhecido(s) no pedido: ${unknown.join(", ")}`);

  // A skip-string "jogo" names its voicing family — infer the mode when none
  // was given: 6432/5321 are the Drop-3 sets, 6421 is the Drop-2&4 set, and a
  // 3-string set with a skip is a spread triad. Adjacent sets keep the default
  // (drop2 / triad); other 4-string skip sets fall to stacked on those strings.
  if (!out.mode && out.strings) {
    const s = out.strings.join("");
    const adjacent = out.strings.every((d, i) => i === 0 || d === out.strings![i - 1] - 1);
    if (s === "6432" || s === "5321") out.mode = "drop3";
    else if (s === "6421") out.mode = "drop24";
    else if (!adjacent && out.strings.length === 3) out.mode = "aberta";
    else if (!adjacent) out.mode = "stacked";
  }
  return out;
}

export function diagramFromSpec(spec: string, extra: Partial<DiagramOptions> = {}): DiagramResult {
  return makeDiagram({ ...parseSpec(spec), ...extra });
}

/** One full command — positionals (the pedido) + option flags — to a diagram.
 *  This is the CLI's single-diagram semantics, shared verbatim by the site. */
export function diagramFromArgs(args: ParsedArgs): DiagramResult {
  const base = optionsFromFlags(args.flags);
  if (args.flags.frets) {
    if (args.positionals[0]) base.chord = args.positionals[0]; // optional chord for labels/title
    return makeDiagram(base);
  }
  const spec = args.positionals.join(" ").trim();
  if (!spec) throw new Error("Pedido vazio.");
  return makeDiagram({ ...parseSpec(spec), ...base });
}

/** "C7M pf jogo5432 --label note --scale 1.2"  ->  diagram. */
export function diagramFromCommand(line: string): DiagramResult {
  return diagramFromArgs(parseArgs(tokenize(line)));
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
