# carimbos

Generate guitar chord-diagram SVGs ("carimbos" / stamps) for a method book —
**by music theory**, not by hand. Ask for *"the 3rd inversion of C♯m7 from the
4th string"* and get the correct **Drop-2** voicing, drawn as a clean,
scalable SVG.

- **Voicing engine** — turns a chord symbol + inversion + start string into real
  fret positions (Drop-2, plus stacked / triad / explicit modes).
- **Two renderers** — a **method** style (Brazilian "cifragem": gray fretboard,
  fret numbers, `7M`/`7`/`3-` notation, a voice legend; this is the default) and
  a **plain** jazz chart. Both hand-rolled, dependency-free, vector SVG.
- **Zero dependencies.** Just [Bun](https://bun.sh). Nothing to `npm install`.

```
bun run cli.ts "C7M pf row2"          # -> method style, C7M root position on group 5432
bun run cli.ts "C7M 1a row2"          # -> C7M 1ª inversão (x 7 9 5 8 x)
bun run cli.ts "C#m7 3rd str4 plain"  # -> plain style (x x 9 9 9 9)
```

---

## Requirements

[Bun](https://bun.sh) (tested on 1.3). That's it — the theory and the SVG are
pure TypeScript with no third-party packages.

> Why not `svguitar` / `tonal`? They're great libraries, but `svguitar` is
> browser-oriented (needs a headless DOM to write files) and neither does the
> specific *"inversion from string N → frets"* mapping you need. Rolling our own
> keeps it install-free and gives full control of the look. They remain good
> alternatives if you ever want a browser UI.

## Quick start

```bash
# one diagram from a spec (written to ./<slug>.svg)
bun run cli.ts "C#m7 3rd str4"

# choose the output file, print to stdout, etc.
bun run cli.ts "Gmaj7 2nd str5" -o figures/gmaj7_2nd.svg
bun run cli.ts "Dm7 root str5" --stdout > dm7.svg

# explicit frets (low -> high, x = muted) — the ultimate escape hatch
bun run cli.ts --frets "x x 9 9 9 9" "C#m7" -o custom.svg

# a whole batch -> a folder of SVGs + an index.html contact sheet
bun run cli.ts --batch chords.example.txt --outdir diagrams --gallery
```

Open `diagrams/index.html` in a browser to eyeball the whole set at once.

## The spec language

```
"<chord> [inversion] [string-group] [mode] [minfret] [labels] [style]"
```

| field      | examples                                  | notes |
|------------|-------------------------------------------|-------|
| chord      | `C7M` `Cm7b5` `C13#11` `Cmaj7#11` `Bb7alt` `C/G` | one token, no spaces — **almost any symbol**, see [Chord vocabulary](#chord-vocabulary--write-almost-any-chord) |
| inversion  | `pf` `1a` `2a` `3a` (also `root`/`1st`…, `inv0`..`inv5`) | which chord tone is in the bass |
| string     | `str5` · `row2` · `group5432`             | where the **bass note** sits |
| mode       | `drop2` (default) `stacked` `triad`       | see below |
| minfret    | `min7`                                    | push the grip up to/above that fret |
| labels     | `labels:degree` (default) `labels:note` `labels:none` | what's printed on the dots |
| style      | `method` (default) `plain`                | render style (see below) |

**String groups / rows** (a Drop-2 grip lives on 4 adjacent strings):

| row    | group  | bass on  |
|--------|--------|----------|
| `row1` | `6543` | string 6 |
| `row2` | `5432` | string 5 |
| `row3` | `4321` | string 4 |

Examples:

```
"C7M pf row2"     "C7M 1a row2"      "Bb7 1a row2"      "Em7b5 2a row1"
"Bb7b9 pf row3"   "C6 3a group5432"  "C#m7 3rd str4 plain"
```

## Chord vocabulary — write (almost) any chord

The chord symbol is parsed **compositionally**, so you're not limited to a fixed
list: combine the building blocks below in any order and the tool computes the
notes from first principles. (Works for any genre — classical, jazz, pop.)

**Root** — A–G with any accidentals: `C` `F#` `Bb` `G##` `Dbb`.

**Base quality**

| write | chord |
|---|---|
| `C` | major triad |
| `Cm` `Cmin` `C-` | minor |
| `Cdim` `C°` | diminished · `Caug` `C+` augmented |
| `Csus2` `Csus4` `Csus` | suspended (`sus` = sus4) |
| `C5` | power chord (root + 5th, no 3rd) |

**Sixth / seventh**

| write | chord |
|---|---|
| `C6` `Cm6` | sixth |
| `C7` | dominant 7th · `Cmaj7` `CM7` `C7M` `CΔ` major 7th |
| `Cm7` | minor 7th · `Cm7b5` `Cø` half-diminished · `Cdim7` `C°7` diminished 7th |
| `CmMaj7` `Cm(maj7)` | minor-major 7th |

**Extensions** (each implies the 7th and the odd extensions below it):
`C9` `C11` `C13` · `Cmaj9` `Cmaj13` · `Cm9` `Cm11` `Cm13` · `C6/9` `Cm6/9`

**Alterations** — stack as many as you like, in any order: `b5 #5 b9 #9 #11 b13`
→ `C7b9` `C7#5` `C13#11` `C7#5#9` `Cmaj7#11` `C9#11`. `Calt` / `C7alt` is the
fully-altered dominant (♭9 ♯9 ♯11 ♭13).

**Add / omit tones**: `add9 add11 add13 add2 add4 add6` and `no3 no5 omit3 omit5`
→ `Cadd9`, `Cmaj7add13`, `C7no5`, `C9no3`. Parentheses are ignored: `Cm(maj7)`, `C7(b9)`.

**Slash chords** (specified bass), with `/note` at the end:
- chord-tone bass → that **inversion**: `C/E` `C/G` `Cmaj7/B` `G/B`
- non-chord ("pedal") bass → added as the **lowest note**: `C/D` `Dm7/G` `F/G`

A few conventions, so the output is predictable: an extension number implies the
stack below it (`13` ⇒ 7, 9, 13); the natural 11 is dropped from chords with a
major 3rd (it clashes) unless you write the 11 chord itself or `#11`; an altered
dominant drops the natural 5th. Diagrams print the Brazilian degree notation
(`7M` major 7, `7` dominant 7, `3-` minor 3rd, `♭9`, `♯11`…). When a chord has
more than 4 notes, **Drop-2** keeps the 3rd, 7th and top colour tone (the
reduction is editable in `QUALITIES`, `src/theory.ts`); **stacked** mode voices
more of them across more strings.

## Two output styles

**`method`** (default) — your method-book format: light-gray fretboard, fret
numbers down the left, thick frets, Brazilian degree notation (`7M`, `7`, `3-`,
`b5`…), an inversion subtitle (`PF`, `1ª I`, `2ª I`, `3ª I`, and `PF*` for the
rootless `7b9`), and a **voice legend** (`3 › 1ª voz`, … high → low). Voicings
are always **fully fretted** (no open strings). For the best match to your
reference, install the **Inter** font (it falls back to a system sans otherwise).

**`plain`** — a generic jazz chart (nut/position label, open `○` / muted `✕`
markers, English degrees `1 b3 5 b7`, optional bass ring). Add `plain` to the
spec or pass `--plain`.

## How the voicings work

### Drop 2 (default)

A Drop-2 voicing is a compact 4-note grip on **4 adjacent strings**. The
**inversion** is *which chord tone is in the bass*:

| inversion        | bass note |
|------------------|-----------|
| `root` / `inv0`  | the root  |
| `1st`  / `inv1`  | the 3rd   |
| `2nd`  / `inv2`  | the 5th   |
| `3rd`  / `inv3`  | the 7th   |

The **start string** is where that bass note lives. Because a Drop-2 grip needs
three more strings above the bass, valid start strings are **4, 5 or 6**
(string sets `4-3-2-1`, `5-4-3-2`, `6-5-4-3`). The engine then finds the most
compact, lowest playable shape (and `min<n>` pushes it up the neck).

```
C#m7 3rd str4   ->   x x 9 9 9 9     (bass ♭7 = B on string 4)
G7   root str6  ->   3 5 3 4 x x     (bass 1  = G on string 6)
```

### Extended chords (9 / 11 / 13 / altered)

Drop-2 is a 4-note technique, so these are reduced to four voiced tones
(default rule: drop the 5th, then the root if needed; keep the 3rd, 7th and the
top colour tone). The reduction is the editable `drop2` field in the chord
dictionary — see *Customizing*.

```
Bb13 root str5  ->  x 1 5 1 3 x      (1, 13, ♭7, 3)
G9   root str5  ->  x 10 9 10 10 x   (1, 3, ♭7, 9)
```

### `stacked` mode

Stacks the chord's tones one-per-string going up from the start string. Handles
big chords and top-string "upper-structure" grabs, and works from any string:

```
Dmaj13 inv3 str3 stacked  ->  x x x 6 5 7   (C#, E, B = the 7-9-13 on top)
```

(If a chord has more tones than there are strings above the start string, it
voices what fits and prints a warning.)

### `triad` mode

A 3-note voicing on 3 adjacent strings, for plain triads and their inversions.

### `explicit` mode

Pass exact frets with `--frets "x x 9 9 9 9"` (low E → high e). Add a chord name
to get degree labels and a title.

## All CLI options

```
-o, --out <file>     output file (default ./<slug>.svg)
    --stdout         print SVG to stdout
    --batch <file>   one spec per line; "#" comments; "spec => name" sets file name
    --outdir <dir>   output dir for --batch (default ./diagrams)
    --gallery        also write an index.html contact sheet
    --frets "<6>"    explicit frets, low->high
    --inv <n> --start <1-6> --mode <m> --min <n>   override spec fields
    --label <degree|note|none>
    --title "<t>"    custom title          --no-subtitle   hide the subtitle
    --tuning "<6>"   e.g. "E,A,D,G,B,E" or "D,A,D,G,B,E" or "E2,A2,D3,G3,B3,E4"
    --strict         keep strict enharmonic spelling (E𝄫 etc.) in note labels
    --accent "<col>" bass-ring colour      --ink/--paper "<col>"   colours
    --scale <f>      size multiplier (default 1)
-h, --help
```

## Generating a whole book programmatically

The most powerful way to produce *all* your figures is a small script — define
the chords in data and loop. See [`book.example.ts`](./book.example.ts):

```ts
import { makeDiagram, slugify } from "./src/index";

for (const chord of ["Cm7", "C#m7", "Dm7" /* ... */]) {
  for (const inv of [0, 1, 2, 3]) {
    const { svg } = makeDiagram({ chord, inversion: inv, startString: 4, mode: "drop2" });
    await Bun.write(`book/${slugify(chord)}_inv${inv}.svg`, svg);
  }
}
```

```bash
bun run book.example.ts
```

## Customizing

- **Chord dictionary / extended-chord reductions** — edit `QUALITIES` in
  [`src/theory.ts`](./src/theory.ts). Each quality lists its accepted symbols,
  full tones, and (for big chords) the 4-tone `drop2` reduction. This is where
  you tune the voicings your method teaches.
- **Look** — colours, sizes, the bass ring, labels live in
  [`src/svg.ts`](./src/svg.ts) and the `--ink/--paper/--accent/--scale` flags.
- **Tuning** — `--tuning`, or pass a `Tuning` to `makeDiagram`.
- **Labels** — `degree` (great for teaching voicing structure), `note`, or
  `none`. Note labels simplify ugly double-accidentals by default
  (A♭dim7 → A♭ C♭ D F); use `--strict` for textbook spelling (A♭ C♭ E𝄫 G𝄫).

## SVG → PDF / PNG for print

SVG imports directly into LaTeX (`svg` package), InDesign, Affinity and
Inkscape. If you need raster/PDF, convert with tools you likely already have:

```bash
# PNG at 300-ish dpi
chromium --headless --screenshot=out.png --force-device-scale-factor=3 file.svg
# or with ImageMagick / librsvg
convert -density 300 file.svg out.png
rsvg-convert -f pdf -o file.pdf file.svg
```

(Happy to wire a `--png` / `--pdf` exporter into the CLI if you'd like it
built in.)

## Tests

```bash
bun test
```

## The original brief, satisfied

```bash
bun run cli.ts "C#m7 3rd str4"             # x x 9 9 9 9
bun run cli.ts "Dmaj13 inv3 str3 stacked"  # the 7-9-13 upper structure on top 3 strings
```
