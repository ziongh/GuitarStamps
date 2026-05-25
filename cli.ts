#!/usr/bin/env bun
// cli.ts — command-line front end for the chord-diagram ("carimbo") generator.
//
//   bun run cli.ts "C#m7 inv3 str4"
//   bun run cli.ts "Dmaj13 inv2 str3 stacked" -o dmaj13.svg
//   bun run cli.ts --frets "x x 9 9 9 9" "C#m7"
//   bun run cli.ts --batch chords.txt --outdir diagrams --gallery

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  diagramFromSpec,
  makeDiagram,
  parseSpec,
  parseTuning,
  slugify,
  type DiagramOptions,
  type LabelMode,
} from "./src/index";

const HELP = `carimbos — generate guitar chord-diagram SVGs (Drop-2 voicings & more)

USAGE
  bun run cli.ts "<spec>" [options]
  bun run cli.ts --frets "x x 9 9 9 9" [chord] [options]
  bun run cli.ts --batch <file> --outdir <dir> [--gallery] [options]

SPEC GRAMMAR
  "<chord> [inversion] [string] [mode] [minfret] [labels] [style]"
    chord       almost any symbol, composed from building blocks (7M=maj7, 7=dominant):
                triads m/dim/aug/sus/5 · 6/7/9/11/13 · alterations b5 #5 b9 #9 #11 b13
                · add9/no3/omit5 · alt (altered dom) · slash bass C/G, Dm7/G
                e.g.  C7M  Cm7b5  C13#11  Cmaj7#11  Bb7alt  Cm(maj7)  C/E  F#m11
    inversion   pf | 1a | 2a | 3a   (also root|1st|2nd|3rd, inv0..inv5)
    string      str5 | row2 | group5432   (where the BASS note sits)
                row1=group6543 (str6), row2=group5432 (str5), row3=group4321 (str4)
    mode        drop2 (default for 4-note) | stacked | triad
    minfret     min7  (push the grip up to/above fret 7)
    labels      labels:degree (default) | labels:note | labels:none
    style       method (default; PT notation + voice legend) | plain
  e.g.  "C7M pf row2"     "C7M 1a row2"     "Bb7b9 pf group4321"     "Dmaj13 3a row1 stacked"

OPTIONS
  -o, --out <file>      output file (single mode; default ./<slug>.svg)
      --stdout          print SVG to stdout instead of writing a file
      --batch <file>    read one spec per line (# comments; "spec => name" sets file name)
      --outdir <dir>    output directory for --batch (default ./diagrams)
      --gallery         also write an index.html contact sheet (with --batch)
      --frets "<6>"     explicit frets low->high, e.g. "x x 9 9 9 9"
      --inv <n>         inversion (overrides spec)
      --start <1-6>     bass string (overrides spec)
      --mode <m>        auto | drop2 | stacked | triad
      --style <s>       method (default) | plain        --plain   shortcut for plain
      --min <n>         minimum fret (push grip up the neck)
      --label <m>       degree | note | none
      --title "<t>"     custom title
      --no-subtitle     hide the auto subtitle
      --tuning "<6>"    e.g. "E,A,D,G,B,E" (low->high) or "D,A,D,G,B,E"
      --strict          keep strict enharmonic spelling (E𝄫 etc.) in note labels
      --accent "<col>"  colour for the bass-note ring (default = ink)
      --ink "<col>"     line/dot colour (default #1b1b1b)
      --paper "<col>"   background (default none/transparent)
      --scale <f>       size multiplier (default 1)
  -h, --help            show this help
`;

interface Args {
  positionals: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): Args {
  const valueFlags = new Set([
    "-o", "--out", "--batch", "--outdir", "--frets", "--inv", "--inversion",
    "--start", "--string", "--mode", "--min", "--minfret", "--label", "--labels",
    "--title", "--tuning", "--accent", "--ink", "--paper", "--scale", "--style",
  ]);
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("-")) {
      if (valueFlags.has(a)) flags[a.replace(/^-+/, "")] = argv[++i];
      else flags[a.replace(/^-+/, "")] = true;
    } else positionals.push(a);
  }
  return { positionals, flags };
}

function optionsFromFlags(flags: Record<string, string | boolean>): Partial<DiagramOptions> {
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
  if (flags.tuning) o.tuning = parseTuning(String(flags.tuning));
  if (flags.accent) svg.accent = String(flags.accent);
  if (flags.ink) svg.ink = String(flags.ink);
  if (flags.paper) svg.paper = String(flags.paper);
  if (flags.scale) svg.scale = parseFloat(String(flags.scale));
  if (flags.strict) svg.simplify = false;
  o.svg = svg;
  return o;
}

async function writeFile(path: string, content: string) {
  await mkdir(dirname(path) || ".", { recursive: true });
  await Bun.write(path, content);
}

async function runBatch(file: string, flags: Record<string, string | boolean>) {
  const outdir = String(flags.outdir ?? "diagrams");
  const base = optionsFromFlags(flags);
  const text = await Bun.file(file).text();
  const lines = text.split(/\r?\n/);
  const made: { name: string; spec: string; svg: string; warnings: string[] }[] = [];

  for (const raw of lines) {
    // strip comments, but only a `#` at line-start or after whitespace
    // (so it never eats the `#` inside a chord like C#m7)
    const line = raw.replace(/(^|\s)#.*$/, "").trim();
    if (!line) continue;
    let spec = line;
    let name = "";
    const arrow = line.split(/\s*(?:=>|\|)\s*/);
    if (arrow.length === 2) { spec = arrow[0].trim(); name = arrow[1].trim(); }
    const fileName = (name || slugify(spec)) + ".svg";
    try {
      const res = diagramFromSpec(spec, base);
      await writeFile(join(outdir, fileName), res.svg);
      made.push({ name: fileName, spec, svg: res.svg, warnings: res.warnings });
      const warn = res.warnings.length ? "  ⚠ " + res.warnings.join("; ") : "";
      console.log(`✓ ${spec}  ->  ${join(outdir, fileName)}${warn}`);
    } catch (e) {
      console.error(`✗ ${spec}  ->  ${(e as Error).message}`);
    }
  }

  if (flags.gallery) {
    const cards = made
      .map((m) => `<figure><div class="d">${m.svg}</div><figcaption>${escapeHtml(m.spec)}</figcaption></figure>`)
      .join("\n");
    const html = `<!doctype html><meta charset="utf-8"><title>carimbos — contact sheet</title>
<style>body{font:14px/1.4 'Helvetica Neue',Arial,sans-serif;background:#fafafa;color:#222;margin:24px}
h1{font-weight:600}.grid{display:flex;flex-wrap:wrap;gap:20px}
figure{margin:0;background:#fff;border:1px solid #e6e6e6;border-radius:10px;padding:14px;text-align:center}
.d svg{height:230px;width:auto}figcaption{margin-top:8px;color:#555;font-family:monospace}</style>
<h1>carimbos — ${made.length} diagram(s)</h1><div class="grid">${cards}</div>`;
    await writeFile(join(outdir, "index.html"), html);
    console.log(`\n📄 gallery: ${join(outdir, "index.html")}`);
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main() {
  const { positionals, flags } = parseArgs(Bun.argv.slice(2));
  if (flags.help || flags.h || (positionals.length === 0 && !flags.batch && !flags.frets)) {
    console.log(HELP);
    return;
  }

  if (flags.batch) {
    await runBatch(String(flags.batch), flags);
    return;
  }

  const base = optionsFromFlags(flags);
  let res;
  let label: string;
  if (flags.frets) {
    if (positionals[0]) base.chord = positionals[0]; // optional chord for labels/title
    res = makeDiagram(base);
    label = String(flags.title ?? base.chord ?? "chord");
  } else {
    const spec = positionals[0];
    res = makeDiagram({ ...parseSpec(spec), ...base });
    label = spec;
  }

  for (const w of res.warnings) console.error(`⚠ ${w}`);

  if (flags.stdout) {
    console.log(res.svg);
    return;
  }
  const out = String(flags.out ?? flags.o ?? `${slugify(label)}.svg`);
  await writeFile(out, res.svg);
  console.log(`✓ wrote ${out}`);
}

main().catch((e) => {
  console.error("Error:", (e as Error).message);
  process.exit(1);
});
