// cliargs.ts — the command-line *language* of the tool, as a pure module.
//
// Everything here is runtime-free (no Bun/node APIs), so the SAME parsing is
// shared by the CLI (cli.ts) and the web site (site/): a pedido like
//
//   C7M pf jogo5432 --label note --tuning "D,A,D,G,B,E" --scale 1.2
//
// means exactly the same thing everywhere. cli.ts keeps only the file-system
// concerns (-o/--out, --batch, --outdir, --gallery, --stdout).

import { parseTuning } from "./voicing";
import type { DiagramOptions, LabelMode } from "./index";

export interface ParsedArgs {
  positionals: string[];
  flags: Record<string, string | boolean>;
}

/** Flags that consume a value (the token that follows them). */
export const VALUE_FLAGS = new Set([
  "-o", "--out", "--batch", "--outdir", "--frets", "--inv", "--inversion",
  "--start", "--string", "--mode", "--min", "--minfret", "--label", "--labels",
  "--title", "--tuning", "--accent", "--ink", "--paper", "--scale", "--style",
]);

/** Shell-like tokenizer: splits on whitespace, honouring "…" and '…' quotes
 *  (so --tuning "E,A,D,G,B,E" and --title "Meu título" stay one token). */
export function tokenize(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  let sawQuote = false;
  for (const ch of line) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      sawQuote = true;
    } else if (/\s/.test(ch)) {
      if (cur || sawQuote) out.push(cur);
      cur = "";
      sawQuote = false;
    } else cur += ch;
  }
  if (quote) throw new Error(`Aspas sem fechar: ${line}`);
  if (cur || sawQuote) out.push(cur);
  return out;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("-") && a.length > 1) {
      if (VALUE_FLAGS.has(a)) flags[a.replace(/^-+/, "")] = argv[++i] ?? "";
      else flags[a.replace(/^-+/, "")] = true;
    } else positionals.push(a);
  }
  return { positionals, flags };
}

/** Maps the option flags onto DiagramOptions (the CLI's historical semantics). */
export function optionsFromFlags(flags: Record<string, string | boolean>): Partial<DiagramOptions> {
  const o: Partial<DiagramOptions> = {};
  const svg: NonNullable<DiagramOptions["svg"]> = {};
  if (flags.frets) o.frets = String(flags.frets);
  if (flags.inv ?? flags.inversion) o.inversion = parseInt(String(flags.inv ?? flags.inversion), 10);
  if (flags.start ?? flags.string) o.startString = parseInt(String(flags.start ?? flags.string), 10);
  if (flags.mode) o.mode = String(flags.mode) as DiagramOptions["mode"];
  if (flags.style) o.style = String(flags.style) as DiagramOptions["style"];
  if (flags.plain) o.style = "plain";
  if (flags.min ?? flags.minfret) o.minFret = parseInt(String(flags.min ?? flags.minfret), 10);
  if (flags.label ?? flags.labels) o.labels = String(flags.label ?? flags.labels) as LabelMode;
  if (flags.title) o.title = String(flags.title);
  if (flags["no-subtitle"]) o.subtitle = null;
  if (flags.open || flags.solta || flags.soltas) o.allowOpen = true;
  if (flags.tuning) o.tuning = parseTuning(String(flags.tuning));
  if (flags.accent) svg.accent = String(flags.accent);
  if (flags.ink) svg.ink = String(flags.ink);
  if (flags.paper) svg.paper = String(flags.paper);
  if (flags.scale) svg.scale = parseFloat(String(flags.scale));
  if (flags.strict) svg.simplify = false;
  o.svg = svg;
  return o;
}
