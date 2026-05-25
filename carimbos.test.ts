// test.ts — run with `bun test`
import { test, expect } from "bun:test";
import { makeDiagram, parseSpec, parseChord, noteName, type FretPos } from "./src/index";

/** Fret string low->high (string 6..1), "x" for unused. */
function tab(positions: FretPos[]): string {
  const by = new Map(positions.map((p) => [p.string, p]));
  return [6, 5, 4, 3, 2, 1].map((s) => (by.has(s) ? String(by.get(s)!.fret) : "x")).join(" ");
}
function span(positions: FretPos[]): number {
  const f = positions.map((p) => p.fret);
  return Math.max(...f) - Math.min(...f);
}
function diag(spec: string) {
  return makeDiagram(parseSpec(spec));
}

test("chord spelling is enharmonically correct", () => {
  const c = parseChord("C#m7");
  expect(c.tones.map((t) => noteName(t.note))).toEqual(["C#", "E", "G#", "B"]);
});

test("C#m7 3rd inversion from string 4 is x x 9 9 9 9", () => {
  expect(tab(diag("C#m7 3rd str4").positions)).toBe("x x 9 9 9 9");
});

test("G7 root position from string 6 is the textbook drop-2", () => {
  expect(tab(diag("G7 root str6").positions)).toBe("3 5 3 4 x x");
});

test("the four inversions put the right chord tone in the bass", () => {
  const bassDeg = (spec: string) => diag(spec).positions.find((p) => p.isBass)!.degree;
  expect(bassDeg("C#m7 root str4")).toBe("1");
  expect(bassDeg("C#m7 1st str4")).toBe("b3");
  expect(bassDeg("C#m7 2nd str4")).toBe("5");
  expect(bassDeg("C#m7 3rd str4")).toBe("b7");
});

test("Drop-2 rejects start strings that can't fit 4 adjacent strings", () => {
  expect(() => diag("C#m7 3rd str3")).toThrow();
});

test("extended-chord Drop-2 grips stay compact (span <= 6)", () => {
  for (const spec of ["Bb13 root str5", "G9 root str5", "Cmaj9 root str4", "Cm11 root str5", "Bb7b9 root str5"]) {
    expect(span(diag(spec).positions)).toBeLessThanOrEqual(6);
  }
});

test("open-bass voicings don't explode the span", () => {
  expect(span(diag("Dm7 2nd str5").positions)).toBeLessThanOrEqual(6);
});

test("minFret pushes the grip up the neck", () => {
  const low = Math.min(...diag("Fmaj7 2nd str4 min7").positions.map((p) => p.fret));
  expect(low).toBeGreaterThanOrEqual(7);
});

test("explicit frets render exactly as given", () => {
  const r = makeDiagram({ frets: "x x 9 9 9 9", chord: "C#m7" });
  expect(tab(r.positions)).toBe("x x 9 9 9 9");
  expect(r.svg).toContain("<svg");
});

test("note labels simplify double accidentals by default", () => {
  // A♭dim7 has E𝄫/G𝄫 in strict theory; default note labels should be plain
  const svg = makeDiagram({ chord: "Abdim7", inversion: 0, startString: 4, labels: "note" }).svg;
  expect(svg).not.toContain("♭♭");
});

test("svg output is well-formed-ish and sized", () => {
  const svg = diag("C#m7 3rd str4").svg;
  expect(svg.startsWith("<svg")).toBe(true);
  expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
  expect(svg).toMatch(/viewBox="0 0 [\d.]+ [\d.]+"/);
});

// ---- Brazilian method style ----

test("C7M parses as a major 7th (7M alias)", () => {
  expect(parseChord("C7M").tones.map((t) => noteName(t.note))).toEqual(["C", "E", "G", "B"]);
});

test("method style: C7M PF on group 5432 matches the reference voicing + voices", () => {
  const r = diag("C7M pf row2"); // pf = root position, row2 = bass on string 5 (group 5432)
  expect(tab(r.positions)).toBe("x 3 5 4 5 x");
  // voice legend, highest -> lowest (internal degree tokens): 3, 7, 5, 1
  const voicesHiLo = [...r.positions].sort((a, b) => b.midi - a.midi).map((p) => p.degree);
  expect(voicesHiLo).toEqual(["3", "7", "5", "1"]);
  expect(r.svg).toContain("(PF)");
  expect(r.svg).toContain("7M"); // major 7th is shown as 7M in this notation
});

test("method style: dominant 7 shows '7', not '7M'", () => {
  expect(diag("C7 pf row1").svg).not.toContain("7M");
});

test("method style: 7b9 is rootless and its root position is labelled PF*", () => {
  const r = diag("Bb7b9 pf group4321");
  expect(r.positions.some((p) => p.degree === "1")).toBe(false); // root omitted
  expect(r.svg).toContain("PF*");
});

test("method style: inversion label is Portuguese (1ª I)", () => {
  expect(diag("C7M 1a row2").svg).toContain("(1ª I)");
});

test("method style uses fully-fretted voicings (no open strings)", () => {
  // C6 3rd inversion on 5432 would be x 0 2 0 1 x with open strings; method
  // style must push it up the neck so every note is fretted.
  const r = makeDiagram({ ...parseSpec("C6 3a row2"), style: "method" });
  expect(r.positions.every((p) => p.fret >= 1)).toBe(true);
});

// ---- compositional parser (any chord symbol) ----

const notesOf = (sym: string) => parseChord(sym).tones.map((t) => noteName(t.note)).join(" ");

test("compositional parser handles altered / extended / sus / power / omit", () => {
  expect(notesOf("C7alt")).toBe("C E Bb Db D# F# Ab"); // 1 3 b7 b9 #9 #11 b13 (no 5)
  expect(notesOf("Cmaj7#11")).toBe("C E G B F#"); // #11 must NOT add a 9
  expect(notesOf("C13b9")).toBe("C E G Bb Db A");
  expect(notesOf("C7sus4")).toBe("C F G Bb");
  expect(notesOf("C5")).toBe("C G");
  expect(notesOf("Cmaj7no5")).toBe("C E B");
  expect(notesOf("Cdim(maj7)")).toBe("C Eb Gb B"); // parens stripped, major 7th kept
  expect(notesOf("Cm6/9")).toBe("C Eb G A D"); // 6/9 adds 6+9, never a 7th
});

test("compositional parser keeps correct enharmonic spelling", () => {
  expect(notesOf("Ab7b9")).toBe("Ab C Eb Gb Bbb"); // b9 of Ab = B double-flat
  expect(notesOf("D7#9")).toBe("D F# A C E#"); // #9 of D = E sharp
});

test("slash chord with a chord-tone bass selects the matching inversion", () => {
  const r = makeDiagram({ ...parseSpec("C/G str4"), style: "plain" });
  const lowest = [...r.positions].sort((a, b) => a.midi - b.midi)[0];
  expect(noteName(lowest.note)).toBe("G");
});

test("slash chord with a pedal (non-chord) bass adds it as the lowest note", () => {
  const r = makeDiagram({ ...parseSpec("C/D str4"), style: "plain" });
  const lowest = [...r.positions].sort((a, b) => a.midi - b.midi)[0];
  expect(noteName(lowest.note)).toBe("D");
  expect(r.positions.length).toBe(4); // triad + added bass
});

test("any well-formed symbol renders to an svg", () => {
  for (const s of ["C7alt", "Cmaj7#11", "C13#11", "CmMaj9", "Cdim(maj7)", "C/F", "Bbmaj13", "F#m11"]) {
    expect(makeDiagram(parseSpec(s)).svg).toContain("<svg");
  }
});
