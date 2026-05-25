// method.ts — renderer for the Brazilian method-book style:
// gray fretboard, fret numbers down the left, thick frets, a chord title with
// an inversion subtitle (PF / 1ª I / PF*), and a voice legend underneath.

import type { FretPos } from "./voicing";

export interface MethodOptions {
  ink?: string; // lines / dots / fret numbers
  board?: string; // fretboard fill
  paper?: string; // background ("none" = transparent)
  dotText?: string; // text inside dots
  titleColor?: string;
  subColor?: string;
  legendColor?: string;
  accent?: string; // bass-note ring ("none" to disable)
  scale?: number;
  font?: string;
  minFrets?: number; // minimum casas to draw (default 4)
  showLegend?: boolean;
}

export interface MethodInput {
  positions: FretPos[];
  titleChord: string; // e.g. "C7M"  (already pretty)
  titleSub: string; // e.g. "PF", "1ª I", "PF*"
  dotLabel: (p: FretPos) => string;
  voiceLabel: (p: FretPos) => string; // degree label shown in the legend
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r2 = (n: number) => Math.round(n * 100) / 100;

function windowFor(positions: FretPos[], minFrets: number) {
  const fretted = positions.filter((p) => p.fret > 0).map((p) => p.fret);
  const open = positions.some((p) => p.fret === 0);
  if (fretted.length === 0) return { startFret: 1, nFrets: minFrets };
  const lo = Math.min(...fretted);
  const hi = Math.max(...fretted);
  if (open || hi <= minFrets) return { startFret: 1, nFrets: Math.max(minFrets, hi) };
  return { startFret: lo, nFrets: Math.max(minFrets, hi - lo + 1) };
}

export function renderMethodSvg(input: MethodInput, opts: MethodOptions = {}): string {
  const k = opts.scale ?? 1;
  const ink = opts.ink ?? "#000000";
  const board = opts.board ?? "#eeeeee";
  const paper = opts.paper ?? "#ffffff";
  const dotText = opts.dotText ?? "#ffffff";
  const titleColor = opts.titleColor ?? "#111111";
  const subColor = opts.subColor ?? "#777777";
  const legendColor = opts.legendColor ?? "#555555";
  const accent = opts.accent ?? "none";
  const font = opts.font ?? "'Inter','Helvetica Neue',Arial,sans-serif";
  const showLegend = opts.showLegend ?? true;

  // base geometry (units; SVG scales freely)
  const COL = 36 * k;
  const ROW = 68 * k;
  const DOTR = 16 * k;
  const FRETW = 5 * k; // thick horizontal fret lines
  const STRW = 2 * k; // thinner vertical string lines
  const STRINGS = 6;
  const gridW = COL * (STRINGS - 1);

  const { startFret, nFrets } = windowFor(input.positions, opts.minFrets ?? 4);
  const gridH = ROW * nFrets;

  const padTop = 46 * k; // title
  const padRight = 12 * k;
  const padLeft = DOTR + 27 * k; // room for fret numbers, clears a dot on string 6
  const gridX = padLeft;
  const gridY = padTop;

  // a dot on string 6 (leftmost column) would sit over the fret numbers
  const dotOnString6 = input.positions.some((p) => p.string === 6 && p.fret > 0);
  const fretNumEnd = dotOnString6 ? gridX - DOTR - 4 * k : gridX - 8 * k;

  // ---- legend layout (two columns, computed so labels never collide) ----
  const voices = [...input.positions].sort((a, b) => b.midi - a.midi); // 1ª voz = highest
  const nRows = Math.ceil(voices.length / 2);
  const legR = 12 * k;
  const legFont = 13.5 * k;
  const legTextGap = 7 * k;
  const legLabelW = legFont * 0.56 * "› 1ª voz".length; // approx label width
  const legColW = legR * 2 + legTextGap + legLabelW;
  const legColGap = 22 * k;
  const legGapTop = 24 * k;
  const legRowH = 44 * k;
  const legCol1 = gridX + legR;
  const legCol2 = gridX + legColW + legColGap + legR;
  const legendH = showLegend ? legGapTop + legRowH * nRows + 10 * k : 0;
  const legendRight = showLegend ? gridX + legColW * 2 + legColGap : 0;

  const W = Math.max(gridX + gridW + padRight, legendRight + padRight);
  const H = gridY + gridH + legendH + 10 * k;

  const sx = (s: number) => gridX + (6 - s) * COL; // string 6 leftmost, string 1 rightmost
  const cellY = (fret: number) => gridY + (fret - startFret + 0.5) * ROW;

  const P: string[] = [];
  P.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${r2(W)}" height="${r2(H)}" viewBox="0 0 ${r2(W)} ${r2(H)}" font-family="${font}">`);
  if (paper !== "none") P.push(`<rect width="${r2(W)}" height="${r2(H)}" fill="${paper}"/>`);

  // title + subtitle on one baseline (tspan flow avoids measuring text)
  P.push(
    `<text x="${r2(gridX)}" y="${r2(32 * k)}">` +
      `<tspan font-size="${r2(23 * k)}" font-weight="700" fill="${titleColor}">${esc(input.titleChord)}</tspan>` +
      (input.titleSub ? `<tspan dx="${r2(6 * k)}" font-size="${r2(17 * k)}" fill="${subColor}">(${esc(input.titleSub)})</tspan>` : "") +
      `</text>`,
  );

  // fretboard fill
  P.push(`<rect x="${r2(gridX)}" y="${r2(gridY)}" width="${r2(gridW)}" height="${r2(gridH)}" fill="${board}"/>`);

  // horizontal fret lines (thick)
  for (let row = 0; row <= nFrets; row++) {
    const y = gridY + row * ROW;
    P.push(`<line x1="${r2(gridX - STRW / 2)}" y1="${r2(y)}" x2="${r2(gridX + gridW + STRW / 2)}" y2="${r2(y)}" stroke="${ink}" stroke-width="${r2(FRETW)}"/>`);
  }
  // vertical string lines (thin)
  for (let s = 1; s <= 6; s++) {
    const x = sx(s);
    P.push(`<line x1="${r2(x)}" y1="${r2(gridY)}" x2="${r2(x)}" y2="${r2(gridY + gridH)}" stroke="${ink}" stroke-width="${r2(STRW)}"/>`);
  }

  // fret numbers (one per casa, vertically centered)
  for (let row = 0; row < nFrets; row++) {
    const y = cellY(startFret + row) + 15 * k * 0.35;
    P.push(`<text x="${r2(fretNumEnd)}" y="${r2(y)}" text-anchor="end" font-size="${r2(15 * k)}" font-weight="700" fill="${ink}">${startFret + row}</text>`);
  }

  // note dots
  for (const p of input.positions) {
    if (p.fret === 0) continue; // (open strings are not used by closed voicings)
    const cx = sx(p.string);
    const cy = cellY(p.fret);
    if (accent !== "none" && p.isBass) {
      P.push(`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(DOTR + 3 * k)}" fill="none" stroke="${accent}" stroke-width="${r2(2.4 * k)}"/>`);
    }
    P.push(`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(DOTR)}" fill="${ink}"/>`);
    const lbl = input.dotLabel(p);
    const fs = (lbl.length > 2 ? 14 : 17) * k;
    P.push(`<text x="${r2(cx)}" y="${r2(cy + fs * 0.34)}" text-anchor="middle" font-size="${r2(fs)}" font-weight="700" fill="${dotText}">${esc(lbl)}</text>`);
  }

  // legend
  if (showLegend) {
    const ly0 = gridY + gridH + legGapTop;
    P.push(`<line x1="${r2(gridX)}" y1="${r2(ly0 - 6 * k)}" x2="${r2(W - padRight)}" y2="${r2(ly0 - 6 * k)}" stroke="#dddddd" stroke-width="${r2(1.2 * k)}"/>`);
    voices.forEach((p, i) => {
      const col = i < nRows ? 0 : 1;
      const row = i % nRows;
      const cx = col === 0 ? legCol1 : legCol2;
      const cy = ly0 + 18 * k + row * legRowH;
      P.push(`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(legR)}" fill="${ink}"/>`);
      const lbl = input.voiceLabel(p);
      const fs = (lbl.length > 2 ? 11 : 13) * k;
      P.push(`<text x="${r2(cx)}" y="${r2(cy + fs * 0.34)}" text-anchor="middle" font-size="${r2(fs)}" font-weight="700" fill="${dotText}">${esc(lbl)}</text>`);
      P.push(`<text x="${r2(cx + legR + 8 * k)}" y="${r2(cy + legFont * 0.34)}" font-size="${r2(legFont)}" fill="${legendColor}">› ${i + 1}ª voz</text>`);
    });
  }

  P.push("</svg>");
  return P.join("\n");
}
