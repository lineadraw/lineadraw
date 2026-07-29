// Grid — a rectangular net of Axis block instances. Positions are
// Tekla-style spacing strings: whitespace-separated relative distances
// where "N*d" repeats a distance N times ("0 2*7200" → 0, 7200, 14400).
// Labels are whitespace-separated; when the grid has more axes than
// labels the last label keeps incrementing ("A B" → A B C…, "1 2" →
// 1 2 3…). X positions become vertical axes bubbled at the bottom, Y
// positions horizontal axes bubbled at the left (per labelPos).
import { defineBlock } from "lineadraw";

// The nested Axis definition — referenced by its marketplace-qualified id.
const AXIS_ID = "@lineadraw/axis";

export default defineBlock({
  id: "@lineadraw/grid",
  name: "Grid",
  description:
    'Draws a rectangular grid of axes from Tekla-style spacing strings ("0 2*7200") with auto-incrementing labels. Requires the @lineadraw/axis block.',
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["architecture", "structural", "axis", "grid"],
  // Emits Axis instances — install/copy/export bundle the dependency.
  dependencies: ["@lineadraw/axis"],
  params: [
    {
      type: "string",
      name: "xs",
      label: "X positions",
      default: "0 2*7200",
    },
    {
      type: "string",
      name: "ys",
      label: "Y positions",
      default: "0 2*6000",
    },
    {
      type: "string",
      name: "xLabels",
      label: "X labels",
      default: "A B",
    },
    {
      type: "string",
      name: "yLabels",
      label: "Y labels",
      default: "1 2",
    },
    {
      name: "scale",
      label: "Scale",
      type: "number",
      default: 10,
    },
    {
      name: "labelPos",
      label: "Label pos.",
      type: "enum",
      default: "start",
      options: [
        { value: "start", label: "Start" },
        { value: "end", label: "End" },
        { value: "both", label: "Both" },
      ],
    },
  ],
  draw: ({ params }) => {
    const { scale, labelPos } = params;
    const xs = parsePositions(params.xs);
    const ys = parsePositions(params.ys);
    if (!xs.length || !ys.length) return [];
    const xLabels = expandLabels(params.xLabels, xs.length);
    const yLabels = expandLabels(params.yLabels, ys.length);

    // Axes overshoot the perpendicular extent so the label bubbles
    // (radius 5×scale in the Axis block) sit clear of the grid.
    const ext = 15 * scale;
    const [x0, x1] = [Math.min(...xs) - ext, Math.max(...xs) + ext];
    const [y0, y1] = [Math.min(...ys) - ext, Math.max(...ys) + ext];

    const axis = (a: Vec2Like, b: Vec2Like, label: string): ModelObject => ({
      type: "block",
      definitionId: AXIS_ID,
      inputs: [a, b],
      params: { scale, label, labelPos },
    });

    return [
      ...xs.map((x, i) => axis([x, y0], [x, y1], xLabels[i])),
      ...ys.map((y, i) => axis([x0, y], [x1, y], yLabels[i])),
    ];
  },
});

/** "0 2*7200" → [0, 7200, 14400]: cumulative sum of relative distances,
 * "N*d" meaning N bays of d. Malformed tokens are skipped. */
const parsePositions = (spec: string): number[] => {
  const out: number[] = [];
  let at = 0;
  for (const tok of spec.trim().split(/\s+/)) {
    const m = /^(?:(\d+)\*)?(-?\d*\.?\d+)$/.exec(tok);
    if (!m) continue;
    const count = m[1] ? parseInt(m[1], 10) : 1;
    const dist = parseFloat(m[2]);
    for (let i = 0; i < count; i++) out.push((at += dist));
  }
  return out;
};

/** Whitespace-separated labels padded to n by incrementing the last one;
 * extras beyond n are dropped. */
const expandLabels = (spec: string, n: number): string[] => {
  const out = spec.trim().split(/\s+/).filter(Boolean).slice(0, n);
  while (out.length < n)
    out.push(
      out.length ? nextLabel(out[out.length - 1]) : String(out.length + 1),
    );
  return out;
};

/** "8" → "9", "A" → "B", "Z" → "AA", "A1" → "A2" (trailing run advances). */
const nextLabel = (s: string): string => {
  const num = /^(.*?)(\d+)$/.exec(s);
  if (num) return num[1] + String(parseInt(num[2], 10) + 1);
  const alpha = /^(.*?)([A-Za-z]+)$/.exec(s);
  if (alpha) return alpha[1] + nextAlpha(alpha[2]);
  return s;
};

/** Bijective base-26 increment, case-preserving: "B" → "C", "AZ" → "BA". */
const nextAlpha = (s: string): string => {
  const chars = s.split("");
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i] === "Z" || chars[i] === "z") {
      chars[i] = chars[i] === "Z" ? "A" : "a";
      continue;
    }
    chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
    return chars.join("");
  }
  return (s[0] === "Z" ? "A" : "a") + chars.join("");
};
