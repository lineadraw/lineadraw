// Grid — a rectangular net of Axis block instances. Positions are
// numberList params of RELATIVE distances, typed Tekla-style in the panel
// ("0 2*7200" = [0, 7200, 7200] → axes at 0, 7200, 14400). Labels are a
// stringList; when the grid has more axes than labels the last label keeps
// incrementing (["A", "B"] → A B C…, ["1"] → 1 2 3…). X positions become vertical axes bubbled at the bottom, Y
// positions horizontal axes bubbled at the left (per labelPos).
import { defineBlock } from "lineadraw";

export default defineBlock({
  id: "@lineadraw/grid",
  name: "Grid",
  description:
    'Draws a rectangular grid of axes from Tekla-style spacings "0 2*7200" with auto-incrementing labels. Requires the @lineadraw/axis block.',
  // 1.1.0: list params (numberList / stringList). Instances saved by 1.0.0
  // hold strings — Linea parses them on read.
  version: "1.1.0",
  authors: ["Linea Team"],
  tags: ["architecture", "structural", "axis", "grid"],
  // Emits Axis instances — install/copy/export bundle the dependency.
  dependencies: ["@lineadraw/axis"],
  params: [
    {
      type: "numberList",
      name: "xs",
      label: "X positions",
      default: [0, 1000, 1000],
    },
    {
      type: "numberList",
      name: "ys",
      label: "Y positions",
      default: [0, 1000, 1000],
    },
    {
      type: "stringList",
      name: "xLabels",
      label: "X labels",
      default: ["A"],
    },
    {
      type: "stringList",
      name: "yLabels",
      label: "Y labels",
      default: ["1"],
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
    const xs = positions(params.xs);
    const ys = positions(params.ys);
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
      definitionId: "@lineadraw/axis",
      inputs: [a, b],
      params: { scale, label, labelPos },
    });

    return [
      ...xs.map((x, i) => axis([x, y0], [x, y1], xLabels[i])),
      ...ys.map((y, i) => axis([x0, y], [x1, y], yLabels[i])),
    ];
  },
});

/** [0, 7200, 7200] → [0, 7200, 14400]: relative distances summed. */
const positions = (distances: readonly number[]): number[] => {
  let at = 0;
  return distances.map((d) => (at += d));
};

/** Labels padded to n by incrementing the last one; extras beyond n are
 * dropped. */
const expandLabels = (labels: readonly string[], n: number): string[] => {
  const out = labels.filter(Boolean).slice(0, n);
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
