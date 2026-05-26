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

const HELP = `carimbos — gera diagramas de acordes (carimbos) em SVG (voicings Drop-2 e mais)

USO
  bun run cli.ts "<pedido>" [opções]
  bun run cli.ts --frets "x x 9 9 9 9" [acorde] [opções]
  bun run cli.ts --batch <arquivo> --outdir <pasta> [--gallery] [opções]

GRAMÁTICA DO PEDIDO
  "<acorde> [inversão] [corda] [modo] [traste-mín] [rótulos] [estilo]"
    acorde      quase qualquer cifra, montada por blocos (7M=sétima maior, 7=dominante):
                tríades m/dim/aug/sus/5 · 6/7/9/11/13 · alterações b5 #5 b9 #9 #11 b13
                · add9/no3/omit5 · alt (dominante alterado) · baixo com barra C/G, Dm7/G
                ex.:  C7M  Cm7b5  C13#11  Cmaj7#11  Bb7alt  Cm(maj7)  C/E  F#m11
    inversão    pf | 1a | 2a | 3a   (também root|1st|2nd|3rd, inv0..inv5)
    corda       str5 | row2 | group5432   (onde fica o BAIXO)
                row1=group6543 (6ª corda), row2=group5432 (5ª), row3=group4321 (4ª)
    modo        drop2 (padrão p/ 4 notas) | stacked (empilhado) | triad (tríade)
    traste-mín  min7  (empurra a pegada para o 7º traste ou acima)
    rótulos     labels:degree (padrão) | labels:note | labels:none
    estilo      method (padrão; notação pt-BR + legenda de vozes)
  ex.:  "C7M pf row2"     "C7M 1a row2"     "Bb7b9 pf group4321"     "Dmaj13 3a row1 stacked"

OPÇÕES
  -o, --out <arquivo>   arquivo de saída (modo avulso; padrão ./<nome>.svg)
      --stdout          mostra o SVG na tela em vez de gravar um arquivo
      --batch <arquivo> lê um pedido por linha (# = comentário; "pedido => nome" define o nome do arquivo)
      --outdir <pasta>  pasta de saída do --batch (padrão ./diagrams)
      --gallery         gera também uma página index.html com todos os carimbos (com --batch)
      --frets "<6>"     trastes manuais, do grave ao agudo, ex.: "x x 9 9 9 9"
      --inv <n>         inversão (sobrescreve o pedido)
      --start <1-6>     corda do baixo (sobrescreve o pedido)
      --mode <m>        auto | drop2 | stacked | triad
      --style <s>       method (padrão)   (o estilo 'plain' está desativado por enquanto)
      --min <n>         traste mínimo (empurra a pegada neck acima)
      --label <m>       degree | note | none
      --title "<t>"     título personalizado
      --no-subtitle     esconde o subtítulo automático
      --tuning "<6>"    ex.: "E,A,D,G,B,E" (grave->agudo) ou "D,A,D,G,B,E"
      --strict          mantém a grafia enarmônica rigorosa (E𝄫 etc.) nos rótulos de nota
      --accent "<cor>"  cor do anel do baixo (padrão = cor do traço)
      --ink "<cor>"     cor das linhas/bolinhas (padrão #1b1b1b)
      --paper "<cor>"   cor do fundo (padrão nenhuma/transparente)
      --scale <f>       multiplicador de tamanho (padrão 1)
  -h, --help            mostra esta ajuda
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
    const html = `<!doctype html><meta charset="utf-8"><title>carimbos — folha de contato</title>
<style>body{font:14px/1.4 'Helvetica Neue',Arial,sans-serif;background:#fafafa;color:#222;margin:24px}
h1{font-weight:600}.grid{display:flex;flex-wrap:wrap;gap:20px}
figure{margin:0;background:#fff;border:1px solid #e6e6e6;border-radius:10px;padding:14px;text-align:center}
.d svg{height:230px;width:auto}figcaption{margin-top:8px;color:#555;font-family:monospace}</style>
<h1>carimbos — ${made.length} diagrama(s)</h1><div class="grid">${cards}</div>`;
    await writeFile(join(outdir, "index.html"), html);
    console.log(`\n📄 galeria: ${join(outdir, "index.html")}`);
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
  console.log(`✓ gravado: ${out}`);
}

main().catch((e) => {
  console.error("Erro:", (e as Error).message);
  process.exit(1);
});
