# Bundled fonts — provenance & licenses

Every font this book uses is bundled here so the repository is **fully
self-contained**: clone it, run the build, and you get byte-identical
typography on any machine — no system fonts, no manual installs. All four
families are licensed under the **SIL Open Font License v1.1** (full terms in
`OFL.txt`), which permits redistribution within this repository.

| Family | Files | Role in the book | © / Reserved Font Name | Source |
|---|---|---|---|---|
| **Edwin** | `Edwin-Roman/Italic/Bold/BoldItalic.otf` | body / reading serif | © 2020 MuseScore BVBA — RFN “Edwin” (a refined URW **C059** / Century Schoolbook) | https://github.com/MuseScoreFonts/Edwin |
| **Inter** | `Inter-Regular/Italic/SemiBold/SemiBoldItalic/Light/LightItalic/Medium.otf` | structure: titles, captions, labels, the carimbos | © 2016–2020 The Inter Project Authors — RFN “Inter” | https://github.com/rsms/inter |
| **Bravura** / **Bravura Text** | `Bravura.otf`, `BravuraText.otf` | engraved staves + inline ♯ ♭ ♮ (SMuFL reference font) | © 2015 Steinberg Media Technologies GmbH — RFN “Bravura” | https://github.com/steinbergmedia/bravura |
| **Inconsolata** | `Inconsolatazi4-Regular/Bold.otf` | mono: fret numbers, literal cifras, code | © 2006–2012 Raph Levien; © 2011 Cyreal | TeX Live (`inconsolata`) — https://github.com/googlefonts/Inconsolata |

The LilyPond SMuFL bridge (esmuflily + ekmelily) is vendored separately under
`lily/smufl/` — see `lily/smufl/PROVENANCE.md`.

> Per the OFL, these fonts may be redistributed and embedded but **not sold by
> themselves**, and the Reserved Font Names above must not be used for modified
> versions. The book’s build embeds them in the final PDF, which the OFL allows.
