---
name: carimbos-latex-book
description: >-
  Generate guitar chord-diagram figures ("carimbos") from chord symbols and embed
  them in a LaTeX book. Use this skill whenever the user is writing, typesetting,
  or adding figures to a guitar/music method book, songbook, or apostila in LaTeX
  and needs fretboard/chord diagrams — including Drop-2 voicings, chord inversions
  (PF/1ª/2ª/3ª), specific string sets ("jogos de cordas"), or "cifragem" diagrams —
  even if they don't name this tool. Triggers on requests like "add the chord
  diagrams to chapter 2", "generate the C7M inversions for the book", "I need
  fretboard diagrams in my LaTeX method", or "make a plate of these voicings".
  The engine ships with this plugin (only Bun is required); output is Brazilian
  notation (7M/7/3-) and embeds via the LaTeX `svg` package (\includesvg).
---

# carimbos — chord diagrams for a LaTeX method book

This skill drives the **guitarstamps** chord-diagram engine and teaches the
workflow for using it **while writing a book in LaTeX**: turn chord symbols into
SVG diagrams, then embed them on the page.

The engine lives at the ROOT of this plugin (this repository:
github.com/ziongh/GuitarStamps) — `cli.ts` + `src/`. The same engine also powers
a web generator at **https://ziongh.github.io/GuitarStamps/** (useful to hand a
non-technical author for previewing), and is published on npm as
`guitarstamps` (`bun add guitarstamps`, or `bun add github:ziongh/GuitarStamps`
to track the repo HEAD; `bunx guitarstamps "C7M pf jogo5432"` runs the CLI
with no install).

## What you can produce

- A single diagram from a chord spec: `C7M pf jogo5432` → an SVG of that Drop-2 voicing.
- A whole batch (a chapter's worth) from a plain-text list, named as you like —
  each line is a full pedido, **option flags included**.
- Ready-to-paste LaTeX: a preamble with a `\carimbo` macro plus one `\carimbo{...}`
  line per diagram, so figures drop straight into the manuscript.

Output is **Brazilian "cifragem"** (degrees `7M`/`7`/`3-`, inversion labels
`PF`/`1ª I`/`2ª I`/`3ª I`, voice legend `› 1ª voz`). See [Output is pt-BR only](#output-is-pt-br-only).

## Setup (check once per session)

1. **Locate the engine.** It is at the plugin root: `${CLAUDE_PLUGIN_ROOT}/cli.ts`
   (with the library at `${CLAUDE_PLUGIN_ROOT}/src/`). In the commands below,
   `$PLUGIN` stands for `${CLAUDE_PLUGIN_ROOT}` — if that variable is not set in
   your context, it is the repo/plugin directory two levels up from this file.
   Projects may also depend on the `guitarstamps` package directly, in which
   case the same CLI is `node_modules/.bin/carimbos`.

2. **Bun.** Confirm with `bun --version`. If missing, install per https://bun.sh
   (`curl -fsSL https://bun.sh/install | bash`). There are **no packages to
   install** — the engine is dependency-free.

3. **LaTeX `svg` package + Inkscape (only when embedding via `\includesvg`).**
   `\includesvg` converts each SVG at compile time by calling Inkscape, so the
   build needs Inkscape on `PATH` **and** shell-escape enabled. If the user
   can't use shell-escape/Inkscape, an equally vector alternative is converting
   the SVGs to PDF with **cairosvg** and using `\includegraphics` (that is what
   the harmony-method book does). Don't silently ship a document that won't
   compile — pick one of the two routes and verify it.

## Generating diagrams

Run the engine with a quoted spec. Write to the book's figure folder with `-o`:

```bash
bun run "$PLUGIN/cli.ts" "C#m7 3rd str4" -o figuras/csharpm7_3a.svg
```

The spec is `"<chord> [inversion] [string] [mode] [minfret] [labels]"` plus any
option flags. The most common fields:

- **chord** — one token, no spaces: `C7M` `Cm7(b5)` `C13#11` `Bb7alt` `C/G`.
- **inversion** — `pf` `1a` `2a` `3a` (bass = root / 3rd / 5th / 7th).
- **string** — `jogo5432`/`grupo5432`/`group5432` (bass on string 5), or
  `row1`/`row2`/`row3` (bass on string 6/5/4), or `str6/str5/str4`. A Drop-2
  grip needs 4 adjacent strings, so the bass string must be **4, 5, or 6**.
- **mode** — `drop2` (default, 4 notes) · `drop3` (skip-string shape, bass on
  string 6/5: sets `jogo6432`/`jogo5321`) · `stacked` (one tone per string,
  any start string, good for upper structures) · `triad`.
- **soltas** — allow open strings in the grip (default is fully fretted /
  transposable, the method's philosophy); classic open grips like E7
  `0 2 0 1` come out with it.
- **flags** — everything else: `--label note|none`, `--strict`,
  `--tuning "D,A,D,G,B,E"`, `--frets "x x 9 9 9 9"`, `--min N`, `--scale F`,
  `--title "…"`, `--no-subtitle`, `--accent/--ink/--paper "<cor>"`.

For the full chord vocabulary, every flag, and the voicing rules, read
`references/spec-and-latex.md` (next to this file). Do not guess syntax — that
reference is exact.

## The book workflow (preferred)

For more than one or two diagrams, drive everything from a list. This is the
fastest path and keeps the manuscript's figures reproducible.

1. **Write a list** — one pedido per line (flags allowed per line); `#`
   comments; `spec => name` sets the figure's base name. (See
   `assets/exemplo-lista.txt` for a template.)

   ```
   C7M pf jogo5432 => c7m_pf
   C7M 1a jogo5432 => c7m_1a
   C#m7 3rd str4 --label note => csharpm7_3a
   ```

2. **Generate** SVGs + LaTeX helpers in one command, from the book's project root:

   ```bash
   bun run "$PLUGIN/skills/carimbos-latex-book/scripts/book_latex.ts" lista.txt --outdir figuras
   ```

   This writes `figuras/<name>.svg` for each line, plus two `.tex` files:
   `figuras/carimbos-preamble.tex` (packages + the `\carimbo` macro) and
   `figuras/carimbos.tex` (a `\carimbo{...}` line per diagram, each annotated with
   its spec). Use `--width "0.22\linewidth"` to change the default diagram width.

## Embedding in LaTeX

Wire the helper files into the document:

```latex
% preamble:
\input{figuras/carimbos-preamble.tex}   % brings in \usepackage{svg}, \svgpath, \carimbo
```

```latex
% body — base name, no .svg extension:
\carimbo{c7m_pf}                  % default width
\carimbo[0.25\linewidth]{c7m_1a}  % custom width
```

A plate of several voicings is just `\carimbo` calls in a row inside a `figure`:

```latex
\begin{figure}[h]\centering
  \carimbo{c7m_pf}\hfill\carimbo{c7m_1a}\hfill\carimbo{c7m_2a}\hfill\carimbo{c7m_3a}
  \caption{C7M — PF, 1ª, 2ª e 3ª inversões (grupo 5432).}
\end{figure}
```

Compile with shell-escape:

```bash
latexmk -pdf -shell-escape livro.tex     # or: pdflatex -shell-escape livro.tex
```

If you have the means to compile here, do a quick build to confirm the diagrams
land and the document isn't broken — a figure that doesn't compile is worse than
no figure. If you can't compile, say so and hand the user the exact command.

## Output is pt-BR only

The generated diagrams contain **only Brazilian notation** — by design, for now.
Degrees print as `7M` (major 7), `7` (dominant/minor 7), `3-` (minor 3rd), `b5`,
`#11`…; the inversion subtitle is `PF`/`1ª I`/`2ª I`/`3ª I` (and `PF*` for a
rootless 7b9); the voice legend reads `› 1ª voz`. There is a second `plain` style
in the code that uses English degrees, but it is **disabled** — asking for it
falls back to the pt-BR `method` style and prints a notice. Never tell the user
they'll get English-degree (`1 b3 5 b7`) diagrams; they won't.

## Quick checks before you hand off

- Chord is a single token (`C13#11`, not `C13 #11`); a bad token raises
  `Termo(s) não reconhecido(s) no pedido`.
- For `drop2`, the bass string is 4/5/6; for a voicing on the top strings use `stacked`.
- `\includesvg` takes the **base name** and needs `\svgpath` pointing at the SVG
  folder; the build needs Inkscape + shell-escape (or use the cairosvg route).
- For an exact visual match to the method reference, the **Inter** font should be
  installed (it falls back to a system sans otherwise).

## Where to read more

- `references/spec-and-latex.md` — exact spec grammar, full chord vocabulary, all
  CLI flags, the `svg`-package details, and a troubleshooting table. Read this
  whenever you're unsure of syntax or a LaTeX error.
- `$PLUGIN/README.md` — the long-form (pt-BR) user manual for the tool.
- `$PLUGIN/src/` — the full engine; voicing reductions live in
  `src/theory.ts` (`QUALITIES`), the look in `src/method.ts`.
- The web generator (same engine, for author previews):
  https://ziongh.github.io/GuitarStamps/
