#!/usr/bin/env bun
// book_latex.ts — turn a list of chord specs into SVG "carimbos" + ready-to-paste
// LaTeX that embeds them with the `svg` package (\includesvg).
//
// This is the one command to run while writing a method book in LaTeX: it reads
// a plain-text list (one chord spec per line), generates every diagram as an
// SVG, and writes two .tex helper files:
//
//   <outdir>/carimbos-preamble.tex   the packages + a \carimbo macro (paste once)
//   <outdir>/carimbos.tex            one \carimbo{...} line per diagram, ready to copy
//
//   bun run scripts/book_latex.ts lista.txt --outdir figuras
//   bun run scripts/book_latex.ts lista.txt --outdir figuras --width "0.22\\linewidth"
//
// List format (same as cli.ts --batch):
//   - one spec per line, e.g.  C7M pf row2
//   - "#" starts a comment (a "#" inside a chord like C#m7 is preserved)
//   - "spec => name" sets the SVG/figure base name (otherwise it is slugified)

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { diagramFromCommand, slugify } from "../../../src/index";

interface Entry { spec: string; name: string; }

function parseList(text: string): Entry[] {
  const out: Entry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    // strip a comment that starts the line or follows whitespace, so the "#"
    // inside a chord symbol (C#m7) is never eaten
    const line = raw.replace(/(^|\s)#.*$/, "").trim();
    if (!line) continue;
    const parts = line.split(/\s*(?:=>|\|)\s*/);
    const spec = parts[0].trim();
    const name = parts.length === 2 ? parts[1].trim() : slugify(spec);
    out.push({ spec, name });
  }
  return out;
}

function arg(flags: string[], name: string, fallback: string): string {
  const i = flags.indexOf(name);
  return i >= 0 && flags[i + 1] ? flags[i + 1] : fallback;
}

async function main() {
  const argv = Bun.argv.slice(2);
  const listFile = argv.find((a) => !a.startsWith("-"));
  if (!listFile) {
    console.error(
      "Uso: bun run scripts/book_latex.ts <lista.txt> [--outdir figuras] " +
        '[--width "0.18\\linewidth"] [--tex <arquivo>] [--preamble <arquivo>]',
    );
    process.exit(1);
  }
  const flags = argv;
  const outdir = arg(flags, "--outdir", "figuras");
  const width = arg(flags, "--width", "0.18\\linewidth");
  const texFile = arg(flags, "--tex", join(outdir, "carimbos.tex"));
  const preambleFile = arg(flags, "--preamble", join(outdir, "carimbos-preamble.tex"));

  await mkdir(outdir, { recursive: true });
  const entries = parseList(await Bun.file(listFile).text());

  const refs: string[] = [];
  let ok = 0;
  for (const e of entries) {
    try {
      const { svg, warnings } = diagramFromCommand(e.spec);
      await Bun.write(join(outdir, e.name + ".svg"), svg);
      const warn = warnings.length ? "  ⚠ " + warnings.join("; ") : "";
      console.log(`✓ ${e.spec}  ->  ${join(outdir, e.name)}.svg${warn}`);
      refs.push(`\\carimbo{${e.name}}    % ${e.spec}`);
      ok++;
    } catch (err) {
      console.error(`✗ ${e.spec}  ->  ${(err as Error).message}`);
    }
  }

  // Preamble: paste these lines once, in your document preamble. The `svg`
  // package rasterizes/embeds the SVG at compile time using Inkscape, so the
  // document must be compiled with shell-escape enabled (see SKILL.md).
  const preamble = `% ---- carimbos: cole estas linhas no preâmbulo do documento ----
\\usepackage{svg}
% diga ao \\includesvg onde estão os arquivos (ajuste se mudar a pasta):
\\svgpath{{${outdir.replace(/\\/g, "/")}/}}
% \\carimbo[largura]{nome}  — largura opcional (padrão ${width})
\\newcommand{\\carimbo}[2][${width}]{\\includesvg[width=#1]{#2}}
`;

  const tex = `% ---- carimbos gerados a partir de ${listFile} ----
% Pré-requisitos: \\input{${preambleFile.replace(/\\/g, "/")}} no preâmbulo,
% e compile com shell-escape (ex.: latexmk -pdf -shell-escape arquivo.tex).
% Copie a linha que precisar para o corpo do texto:

${refs.join("\n")}
`;

  await Bun.write(preambleFile, preamble);
  await Bun.write(texFile, tex);

  console.log(`\n📄 preâmbulo: ${preambleFile}`);
  console.log(`📄 trechos:   ${texFile}`);
  console.log(`\n${ok}/${entries.length} carimbos gerados em ${outdir}/`);
  if (ok < entries.length) process.exit(1);
}

main().catch((e) => {
  console.error("Erro:", (e as Error).message);
  process.exit(1);
});
