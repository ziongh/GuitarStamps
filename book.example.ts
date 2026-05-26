// book.example.ts — generate a whole chapter of method-style diagrams.
//
//   bun run book.example.ts
//
// Pattern for building every figure in a chapter: define the chords / groups /
// inversions in data, loop, write SVGs. Edit the arrays to taste.

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { makeDiagram, slugify } from "./src/index";

const OUT = "book";
await mkdir(OUT, { recursive: true });

const chords = ["C7M", "C7", "Cm7", "Cm7b5", "C6", "Cm6"];
const groups = [
  { row: 1, startString: 6, name: "6543" },
  { row: 2, startString: 5, name: "5432" },
  { row: 3, startString: 4, name: "4321" },
];
const inversions = [0, 1, 2, 3]; // pf, 1ª, 2ª, 3ª

let count = 0;
for (const chord of chords) {
  for (const g of groups) {
    for (const inv of inversions) {
      const { svg } = makeDiagram({
        chord,
        inversion: inv,
        startString: g.startString,
        mode: "drop2",
        style: "method", // cifragem brasileira + legenda de vozes
      });
      await Bun.write(join(OUT, `${slugify(chord)}_g${g.name}_inv${inv}.svg`), svg);
      count++;
    }
  }
}

console.log(`Gravados ${count} diagramas no estilo método em ./${OUT}/`);
