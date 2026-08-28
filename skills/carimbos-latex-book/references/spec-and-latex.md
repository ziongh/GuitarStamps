# Reference: spec language + LaTeX integration

Full, self-contained reference for the bundled `carimbos` tool and for embedding
its diagrams in a LaTeX book. Read this when you need the exact spec grammar, the
chord vocabulary, or the LaTeX/`svg`-package details. The bundled
The plugin-root `README.md` is the long-form (pt-BR) version of the same thing.

## Table of contents
- [The spec string](#the-spec-string)
- [Chord vocabulary](#chord-vocabulary)
- [Voicing modes](#voicing-modes)
- [How the options combine](#how-the-options-combine)
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
| mode       | `drop2` (default for 4 notes) · `drop3` (bass on 6/5, one string skipped) · `drop24` (two skips, set 6-4-2-1) · `aberta` (spread triad: middle voice up an octave) · `stacked` · `triad` (close triad) | how tones are distributed |
| minfret    | `min7` (any fret: `min5`, `min12`…) | push the grip up to/above that fret. A given grip repeats every 12 frets, so you get its first occurrence at/above the request; asking beyond the last occurrence returns the highest existing position. Constrains the FRETTED notes only: with `soltas`, open strings are exempt |
| maxfret    | `max10` | ceiling for the fretted notes; with `min`, brackets a neck region. If min+max can't both hold, max wins and the closest grip below is returned |
| span       | `span4` | widest hand stretch in frets (default 6) |
| voices     | `vozes:3,5,b7,9` (or `--vozes "3,5,b7,9"`) | hand-pick the voiced degrees: rootless (`3,5,b7,9` → titled PF*), jazz shell (`1,3,b7`), any reduction. 3 degrees pair with `aberta`/`triad`, 4 with the drop modes, any count with `stacked`. Inversions follow the stacked order of the chosen degrees |
| open       | `soltas`/`open` (or `--open`) | allow open strings (default: fully fretted). Combines with `min`: `E7 pf jogo6543 min7 soltas` = open low E + hand at fret 12 (`0 14 12 13`); the diagram window follows the fretted notes, opens shown above it |
| labels     | `labels:degree` (default) · `labels:note` · `labels:none` | text inside the dots |
| style      | `method` (default) | render style — only `method` is active (pt-BR) |

**String groups** (a Drop-2 grip lives on 4 adjacent strings):

| row    | group  | bass string | also written |
|--------|--------|-------------|--------------|
| `row1` | `group6543` | 6th | `str6` |
| `row2` | `group5432` | 5th | `str5` |
| `row3` | `group4321` | 4th | `str4` |

For **drop3** the set skips a string: `jogo6432` (bass on 6) · `jogo5321` (bass on 5).
For **drop24**: `jogo6421`. For **aberta** (spread triads): `jogo643` · `jogo532` ·
`jogo421` (an explicit jogo may pick other spacings, e.g. `jogo642`).

**A skip-string jogo implies its mode** when none is written: `jogo6432`/`jogo5321`
→ drop3, `jogo6421` → drop24, 3-string skip sets → aberta. The jogo is taken
literally — `jogo6432` with `drop2` is an error, not a reinterpretation. A
`--janela <n>` flag fixes the minimum number of drawn fret rows (use one value
across a row of carimbos so their windows align in the book).

**Inversion → bass note:** `pf`/`root`→1, `1a`/`1st`→3rd, `2a`/`2nd`→5th, `3a`/`3rd`→7th.

Examples: `"C7M pf row2"`, `"C7M 1a row2"`, `"C#m7 3rd str4"`, `"Em7b5 2a row1"`,
`"Bb7b9 pf row3"`, `"Dmaj13 inv3 str3 stacked"`, `"C7 pf jogo6421"` (drop24),
`"C pf jogo643 aberta"`, `"E7 pf jogo6543 min7 soltas"`,
`"C7 pf jogo643 vozes:1,3,b7"` (shell).

## Chord vocabulary

Parsed compositionally — combine blocks freely; notes are computed from theory.

- **Root**: `C` `F#` `Bb` `G##` `Dbb`.
- **Quality**: `m`/`min`/`-`, `dim`/`°`, `aug`/`+`, `sus2`/`sus4`/`sus`, `5` (power).
- **6/7**: `6` `m6` · `7` (dominant) · `maj7`/`M7`/`7M`/`Δ` (major 7) · `m7` · `m7b5`/`ø` · `dim7`/`°7` · `mMaj7`/`m(maj7)`.
- **Extensions** (imply the 7th + lower odd extensions): `9 11 13`, `maj9 maj13`, `m9 m11 m13`, `6/9 m6/9`.
- **Alterations** (any order): `b5 #5 b9 #9 #11 b13`; `alt`/`7alt` = fully altered dominant.
- **add/omit**: `add9 add11 add13 add2 add4 add6`, `no3 no5 omit3 omit5`. Parens ignored: `Cm(maj7)`.
- **Slash bass** `/note`: chord-tone bass → that inversion (`C/E`, `Cmaj7/B`); non-chord bass → added as lowest note (`Dm7/G`). A slash followed by DIGITS is an extension, not a bass: `C7/9` = C9, `C4/7` = 7sus4.
- **Brazilian songbook spellings** (all normalized automatically): commas/dots inside the quality — `C7(9,13)`, `C7(b9,b13)`; bare `4` = sus4 (`C4`, `C4(7)`); bare `2` = add9 (`C2`); postfix accidentals — `C7/5-` = 7(b5), `C7/9+` = 7(#9); `b10` = `#9`; `#4` = `#11`; `mi`/`ma` prefixes (`Cmi7`, `Cma9`); trailing `7m` = 7M (`C7m`); lone `M` = major (`CM`); symbols `Δ`/`∆`/`^` = maj7, `ø`/`∅` = m7b5, `°`/`º` = dim.
- **Parens-only tensions are adds (no 7th)**: `C(9)` = add9, `C(9,13)` = 1 3 5 9 13 — distinct from `C9`/`C13`, which are dominants.

Conventions: an extension implies the stack below it; natural 11 is dropped from
major-3rd chords unless you write the 11 chord or `#11`; altered dominant drops
the natural 5th. Chords with >4 notes are reduced to 4 for Drop-2 (keep 3rd, 7th,
top color tone). Edit `QUALITIES` in the plugin-root `src/theory.ts` to change reductions.

## Voicing modes

- **drop2** (default, 4 notes): compact grip on 4 adjacent strings. Valid start strings are **4, 5, 6** only.
- **drop3** (4 notes): the skip-string shape — bass on string **6** (set 6-4-3-2, `jogo6432`) or **5** (set 5-3-2-1, `jogo5321`).
- **drop24** (4 notes): the third classic family, two skips — bass on string **6** only (set 6-4-2-1, `jogo6421`). `C7 pf jogo6421` → `8 x 5 x 5 6`.
- **aberta** (3 notes): spread/open triad — middle voice raised an octave. Default sets skip one string after the bass: `jogo643`, `jogo532`, `jogo421`; an explicit jogo may pick other spacings (`jogo642`, `jogo531`). `C pf jogo643 aberta` → `8 x 5 9 x x`.
- **stacked**: one tone per string upward from the start string; for big chords / upper-structures on any string. An explicit jogo pins the exact strings (any descending set).
- **triad**: close triad, 3 notes on 3 adjacent strings.
- **explicit**: `--frets "x x 9 9 9 9"` (low→high, `x`=muted). Optional chord name for labels/title.

## How the options combine

Every option below works with every mode — they compose freely:

| combination | what you get | example |
|---|---|---|
| `min` + `soltas` | open strings ring while the hand sits at/above the fret (min counts fretted notes only) | `E7 pf jogo6543 min7 soltas` → `0 14 12 13` |
| `min` + `max` | brackets a neck region; if impossible, `max` wins and the closest grip below is returned | `C7M pf str5 min12 max20` → `x 15 17 16 17` |
| `vozes:` + a drop mode (4 degrees) | custom 4-note grip: rootless voicings etc. | `C7 pf jogo5432 vozes:3,5,b7,9` (titled PF*) |
| `vozes:` + `aberta` (3 degrees) | spread ANY 3 degrees — this is how you draw shells | `C7 pf jogo643 vozes:1,3,b7` → `8 x 8 9 x x` |
| skip-jogo alone | the jogo implies the mode | `C7 pf jogo6421` = drop24; `D pf jogo532` = aberta |
| `aberta` + `soltas` | low spread triads on open strings | `C pf jogo532 aberta soltas` → `x 3 x 0 5 x` |
| anything + `--janela <n>` | fixed window height across a ROW of carimbos so they align in the book | `--janela 5` on each grip of the row |
| `span` | tighter hand-stretch limit (default 6); unsatisfiable span degrades to the best available grip | `... span4` |

`vozes:` accepts `,` or `.` as separator (`vozes:3.5.b7.9` — handy where a comma
means something else). Degree counts: 3 → `aberta`/`triad`, 4 → `drop2`/`drop3`/
`drop24`, any → `stacked`. Inversions of a `vozes:` chord follow the stacked
order of the chosen degrees (a rootless voicing's `pf` is the stack from its
lowest degree, titled `PF*`).

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
    --inv <n> --start <1-6> --mode <m> --min <n> --max <n> --span <n>
                     override spec fields (--start also overrides a spec jogo)
    --vozes "<degs>" hand-picked voiced degrees, e.g. "3,5,b7,9" or "1,3,b7"
    --open           allow open strings (same as the spec word "soltas")
    --janela <n>     minimum drawn fret rows (align a row of carimbos)
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
