// svg.ts — render fret positions into a clean chord-diagram ("carimbo") SVG.
//
// No external dependencies: we just build an SVG string. Output is vector,
// scales to any size, and embeds no fonts (uses a generic sans-serif stack).

import { noteDisplay, prettyDegree } from "./theory";
import type { FretPos } from "./voicing";

export type LabelMode = "degree" | "note" | "none";

export interface SvgOptions {
  title?: string;
  subtitle?: string | null;
  labels?: LabelMode;
  highlightBass?: boolean;
  accent?: string; // colour for the bass ring (and optional bass dot)
  ink?: string; // colour of lines / dots / text
  paper?: string; // background ("none" for transparent)
  dotTextColor?: string;
  scale?: number; // overall size multiplier (1 = default)
  minWindow?: number; // minimum number of fret rows to draw (default 4)
  simplify?: boolean; // clean up double-accidentals in note labels (default true)
  notePrefer?: "sharp" | "flat"; // enharmonic preference for note labels
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface Window {
  startFret: number; // first fret row shown
  frets: number; // number of fret rows
  atNut: boolean;
}

function computeWindow(positions: FretPos[], minWindow: number): Window {
  const fretted = positions.filter((p) => p.fret > 0).map((p) => p.fret);
  const hasOpen = positions.some((p) => p.fret === 0);
  if (fretted.length === 0) return { startFret: 1, frets: minWindow, atNut: true };
  const minF = Math.min(...fretted);
  const maxF = Math.max(...fretted);
  if (hasOpen || maxF <= minWindow) {
    return { startFret: 1, frets: Math.max(minWindow, maxF), atNut: true };
  }
  return { startFret: minF, frets: Math.max(minWindow, maxF - minF + 1), atNut: false };
}

export function renderSvg(positions: FretPos[], opts: SvgOptions = {}): string {
  const k = opts.scale ?? 1;
  const labels: LabelMode = opts.labels ?? "degree";
  const ink = opts.ink ?? "#1b1b1b";
  const accent = opts.accent ?? ink;
  const paper = opts.paper ?? "none";
  const dotText = opts.dotTextColor ?? "#ffffff";
  const highlightBass = opts.highlightBass ?? true;
  const minWindow = opts.minWindow ?? 4;
  const noteOpts = { simplify: opts.simplify ?? true, prefer: opts.notePrefer ?? "flat", unicode: true } as const;

  // geometry (base units * scale)
  const stringGap = 34 * k;
  const fretGap = 46 * k;
  const dotR = 13.5 * k;
  const lineW = 2.2 * k;
  const nutW = 7 * k;
  const win = computeWindow(positions, minWindow);

  const titleSize = 27 * k;
  const subSize = 14 * k;
  const labelSize = 15 * k;
  const markSize = 17 * k;
  const posSize = 15 * k;

  const title = opts.title;
  const subtitle = opts.subtitle;
  const titleH = title ? titleSize + 12 * k : 0;
  const subH = subtitle ? subSize + 8 * k : 0;
  const markerGap = 22 * k;
  const padL = (win.atNut ? 22 : 42) * k;
  const padR = 22 * k;
  const padB = 24 * k;

  const gridX = padL;
  const gridY = titleH + subH + markerGap;
  const gridW = stringGap * 5; // always 6 strings
  const gridH = fretGap * win.frets;
  const W = gridX + gridW + padR;
  const H = gridY + gridH + padB;

  // coordinate helpers
  const sx = (s: number) => gridX + (6 - s) * stringGap; // string 1 (high e) on the right
  const fyCenter = (f: number) => gridY + (f - win.startFret + 0.5) * fretGap;
  const lineY = (row: number) => gridY + row * fretGap;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r(W)}" height="${r(H)}" viewBox="0 0 ${r(W)} ${r(H)}" font-family="'Helvetica Neue',Arial,sans-serif">`,
  );
  if (paper !== "none") parts.push(`<rect width="${r(W)}" height="${r(H)}" fill="${paper}"/>`);

  // title / subtitle
  if (title) {
    parts.push(
      `<text x="${r(W / 2)}" y="${r(titleSize)}" text-anchor="middle" font-size="${r(titleSize)}" font-weight="600" fill="${ink}">${esc(title)}</text>`,
    );
  }
  if (subtitle) {
    parts.push(
      `<text x="${r(W / 2)}" y="${r(titleH + subSize)}" text-anchor="middle" font-size="${r(subSize)}" fill="${ink}" opacity="0.7">${esc(subtitle)}</text>`,
    );
  }

  // fret rows
  for (let row = 0; row <= win.frets; row++) {
    parts.push(
      `<line x1="${r(sx(6))}" y1="${r(lineY(row))}" x2="${r(sx(1))}" y2="${r(lineY(row))}" stroke="${ink}" stroke-width="${r(lineW)}"/>`,
    );
  }
  // nut (thick top bar) or position label
  if (win.atNut) {
    parts.push(
      `<rect x="${r(sx(6) - lineW / 2)}" y="${r(gridY - nutW + lineW)}" width="${r(gridW + lineW)}" height="${r(nutW)}" fill="${ink}"/>`,
    );
  } else {
    parts.push(
      `<text x="${r(gridX - 10 * k)}" y="${r(fyCenter(win.startFret) + posSize * 0.35)}" text-anchor="end" font-size="${r(posSize)}" fill="${ink}">${win.startFret}fr</text>`,
    );
  }
  // strings
  for (let s = 1; s <= 6; s++) {
    parts.push(
      `<line x1="${r(sx(s))}" y1="${r(gridY)}" x2="${r(sx(s))}" y2="${r(gridY + gridH)}" stroke="${ink}" stroke-width="${r(lineW)}"/>`,
    );
  }

  // open / muted markers above the grid
  const used = new Map<number, FretPos>();
  positions.forEach((p) => used.set(p.string, p));
  const my = gridY - markerGap * 0.55;
  for (let s = 1; s <= 6; s++) {
    const p = used.get(s);
    const x = sx(s);
    if (!p) {
      // muted: ✕
      const d = 5 * k;
      parts.push(
        `<line x1="${r(x - d)}" y1="${r(my - d)}" x2="${r(x + d)}" y2="${r(my + d)}" stroke="${ink}" stroke-width="${r(lineW)}"/>` +
          `<line x1="${r(x - d)}" y1="${r(my + d)}" x2="${r(x + d)}" y2="${r(my - d)}" stroke="${ink}" stroke-width="${r(lineW)}"/>`,
      );
    } else if (p.fret === 0) {
      // open: ○
      parts.push(`<circle cx="${r(x)}" cy="${r(my)}" r="${r(5.5 * k)}" fill="none" stroke="${ink}" stroke-width="${r(lineW)}"/>`);
      const lbl = labelFor(p, labels, noteOpts);
      if (lbl) parts.push(textCentered(x, my - 11 * k, lbl, labelSize * 0.85, ink, k));
    }
  }

  // fretted dots
  for (const p of positions) {
    if (p.fret === 0) continue;
    const x = sx(p.string);
    const y = fyCenter(p.fret);
    if (highlightBass && p.isBass) {
      parts.push(`<circle cx="${r(x)}" cy="${r(y)}" r="${r(dotR + 3.2 * k)}" fill="none" stroke="${accent}" stroke-width="${r(2 * k)}"/>`);
    }
    parts.push(`<circle cx="${r(x)}" cy="${r(y)}" r="${r(dotR)}" fill="${ink}"/>`);
    const lbl = labelFor(p, labels, noteOpts);
    if (lbl) parts.push(textCentered(x, y, lbl, labelSize, dotText, k));
  }

  parts.push("</svg>");
  return parts.join("\n");
}

function labelFor(p: FretPos, mode: LabelMode, noteOpts: { simplify: boolean; prefer: "sharp" | "flat"; unicode: boolean }): string {
  if (mode === "none") return "";
  if (mode === "note") return noteDisplay(p.note, noteOpts);
  return p.degree ? prettyDegree(p.degree) : noteDisplay(p.note, noteOpts);
}

function textCentered(x: number, y: number, text: string, size: number, fill: string, k: number): string {
  // adjust font-size down a touch for multi-glyph labels so they fit the dot
  const fs = text.length > 2 ? size * 0.78 : size;
  return `<text x="${r(x)}" y="${r(y + fs * 0.34)}" text-anchor="middle" font-size="${r(fs)}" font-weight="600" fill="${fill}">${esc(text)}</text>`;
}

// round to 2dp to keep the SVG compact
function r(n: number): number {
  return Math.round(n * 100) / 100;
}
