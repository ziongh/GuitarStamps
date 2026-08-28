# Reference: spec language + LaTeX integration

Full, self-contained reference for the bundled `carimbos` tool and for embedding
its diagrams in a LaTeX book. Read this when you need the exact spec grammar, the
chord vocabulary, or the LaTeX/`svg`-package details. The bundled
The plugin-root `README.md` is the long-form (pt-BR) version of the same thing.

## Table of contents
- [The spec string](#the-spec-string)
- [Chord vocabulary](#chord-vocabulary)
- [Voicing modes](#voicing-modes)
- [Output is pt-BR only](#output-is-pt-br-only)
- [CLI flags](#cli-flags)
- [LaTeX integration (svg package)](#latex-integration-svg-package)
- [Troubleshooting](#troubleshooting)

## The spec string

One quoted argument: `"<chord> [inversion] [string] [mode] [minfret] [labels] [style]"`.
Only the chord is required; fields can appear in any order.

| field      | tokens | meaning |
|------------|--------|---------|
| chord      | `C7M` `Cm7b5` `C13#11` `Bb7alt` `C/G` | one token, no spaces |
| inversion  | `pf` `1a` `2a` `3a` · `root` `1st` `2nd` `3rd` · `inv0..inv5` | which chord tone is in the bass |
| string     | `str5` · `row2` · `group5432`/`grupo5432`/`jogo5432` | where the **bass** note sits |
| mode       | `drop2` (default for 4 notes) · `stacked` · `triad` | how tones are distributed |
| minfret    | `min7` | push the grip up to/above that fret |
| labels     | `labels:degree` (default) · `labels:note` · `labels:none` | text inside the dots |
| style      | `method` (default) | render style — only `method` is active (pt-BR) |

**String groups** (a Drop-2 grip lives on 4 adjacent strings):

| row    | group  | bass string | also written |
|--------|--------|-------------|--------------|
| `row1` | `group6543` | 6th | `str6` |
| `row2` | `group5432` | 5th | `str5` |
| `row3` | `group4321` | 4th | `str4` |

**Inversion → bass note:** `pf`/`root`→1, `1a`/`1st`→3rd, `2a`/`2nd`→5th, `3a`/`3rd`→7th.

Examples: `"C7M pf row2"`, `"C7M 1a row2"`, `"C#m7 3rd str4"`, `"Em7b5 2a row1"`,
`"Bb7b9 pf row3"`, `"Dmaj13 inv3 str3 stacked"`.

## Chord vocabulary

Parsed compositionally — combine blocks freely; notes are computed from theory.

- **Root**: `C` `F#` `Bb` `G##` `Dbb`.
- **Quality**: `m`/`min`/`-`, `dim`/`°`, `aug`/`+`, `sus2`/`sus4`/`sus`, `5` (power).
- **6/7**: `6` `m6` · `7` (dominant) · `maj7`/`M7`/`7M`/`Δ` (major 7) · `m7` · `m7b5`/`ø` · `dim7`/`°7` · `mMaj7`/`m(maj7)`.
- **Extensions** (imply the 7th + lower odd extensions): `9 11 13`, `maj9 maj13`, `m9 m11 m13`, `6/9 m6/9`.
- **Alterations** (any order): `b5 #5 b9 #9 #11 b13`; `alt`/`7alt` = fully altered dominant.
- **add/omit**: `add9 add11 add13 add2 add4 add6`, `no3 no5 omit3 omit5`. Parens ignored: `Cm(maj7)`.
- **Slash bass** `/note`: chord-tone bass → that inversion (`C/E`, `Cmaj7/B`); non-chord bass → added as lowest note (`Dm7/G`).

Conventions: an extension implies the stack below it; natural 11 is dropped from
major-3rd chords unless you write the 11 chord or `#11`; altered dominant drops
the natural 5th. Chords with >4 notes are reduced to 4 for Drop-2 (keep 3rd, 7th,
top color tone). Edit `QUALITIES` in the plugin-root `src/theory.ts` to change reductions.

## Voicing modes

- **drop2** (default, 4 notes): compact grip on 4 adjacent strings. Valid start strings are **4, 5, 6** only.
- **stacked**: one tone per string upward from the start string; for big chords / upper-structures on any string.
- **triad**: 3 notes on 3 adjacent strings.
- **explicit**: `--frets "x x 9 9 9 9"` (low→high, `x`=muted). Optional chord name for labels/title.

## Output is pt-BR only

Generated diagrams contain only Brazilian notation: degrees `7M` (maj7), `7`
(dominant/minor 7), `3-` (minor 3rd), `b5`, `#11`…; inversion subtitle `PF`,
`1ª I`, `2ª I`, `3ª I`, `PF*` (rootless 7b9); voice legend `› 1ª voz`. The
English-notation `plain` style is **disabled for now** — requesting it falls back
to `method` and prints a notice. Do not promise English-degree output.

## CLI flags

```
-o, --out <file>     output file (default ./<slug>.svg)
    --stdout         print SVG to stdout
    --batch <file>   one pedido per line, option flags allowed; "#" comments;
                     "spec => name" sets file name
    --outdir <dir>   output dir for --batch (default ./diagrams)
    --gallery        also write an index.html contact sheet
    --frets "<6>"    explicit frets, low->high
    --inv <n> --start <1-6> --mode <m> --min <n>   override spec fields
    --label <degree|note|none>
    --title "<t>"    custom title         --no-subtitle    hide subtitle
    --tuning "<6>"   e.g. "E,A,D,G,B,E" or "D,A,D,G,B,E"
    --strict         strict enharmonic spelling in note labels
    --accent/--ink/--paper "<col>"   colours        --scale <f>   size multiplier
```

The public API (for scripts) is `diagramFromSpec(spec)` / `makeDiagram(opts)` /
`slugify(s)` from the plugin-root `src/index` (also exported by the `guitarstamps` package, along with `diagramFromCommand("C7M pf jogo5432 --label note")` — one full command string to a diagram).

## LaTeX integration (svg package)

The chosen workflow embeds SVGs **directly** with the `svg` package — no manual
PDF conversion. The package calls Inkscape at compile time to turn each SVG into
a PDF + text overlay, so two requirements must hold:

1. **Inkscape** is installed and on `PATH` (`inkscape --version` works).
2. LaTeX runs with **shell-escape** enabled.

**Preamble** (the bundled `book_latex.ts` writes this for you):

```latex
\usepackage{svg}
\svgpath{{figuras/}}                                   % where the .svg files live
\newcommand{\carimbo}[2][0.18\linewidth]{\includesvg[width=#1]{#2}}
```

**In the body**, drop a diagram with the macro (base name, no extension):

```latex
\carimbo{c7m_pf}                 % default width
\carimbo[0.25\linewidth]{c7m_1a} % custom width
```

**Compile** with shell-escape (latexmk recommended):

```bash
latexmk -pdf -shell-escape livro.tex
# or, plain:
pdflatex -shell-escape livro.tex
```

A grid/plate of diagrams (e.g. four inversions side by side) is just several
`\carimbo` calls in a row inside a `center` or `figure`:

```latex
\begin{figure}[h]\centering
  \carimbo{c7m_pf}\hfill\carimbo{c7m_1a}\hfill\carimbo{c7m_2a}\hfill\carimbo{c7m_3a}
  \caption{C7M — PF, 1ª, 2ª e 3ª inversões (grupo 5432).}
\end{figure}
```

## Troubleshooting

| symptom | cause / fix |
|---------|-------------|
| `Package svg Error: File not found` or empty box | shell-escape not enabled, or Inkscape not on PATH; check `inkscape --version` |
| `\includesvg` can't find the file | `\svgpath` doesn't point at the SVG folder, or you passed the `.svg` extension (use the base name) |
| `Termo(s) não reconhecido(s) no pedido` | a spec token is misspelled; chord must be one token (`C13#11`, not `C13 #11`) |
| `O Drop-2 ocupa 4 cordas adjacentes…` | drop2 start string must be 4/5/6; use `stacked` for the top strings |
| diagram looks like a different font | install the **Inter** font for an exact match to the method reference |
| degrees came out in English | not possible now — `plain` is disabled; all output is pt-BR `method` |
