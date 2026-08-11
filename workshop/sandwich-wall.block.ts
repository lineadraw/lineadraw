// Sandwich wall element (section) — outer concrete shell, insulation,
// inner concrete shell stacked on the LEFT side of the picked line (the
// picked line is the exterior face, like the insulation block). Shells get
// a 45° line hatch, the insulation zone the hard-insulation zigzag.
import { defineBlock } from "lineadraw";
import { add, dist, norm, scale as sc, sub } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/sandwich-wall",
  name: "Sandwich wall",
  description:
    "Draws a sandwich wall element section: shell / insulation / shell with hatches.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "precast", "wall", "section"],
  params: [
    { name: "outer", label: "Outer shell", type: "number", default: 80, min: 1 },
    { name: "insulation", label: "Insulation", type: "number", default: 150, min: 1 },
    { name: "inner", label: "Inner shell", type: "number", default: 150, min: 1 },
  ],
  place: ["Start point (exterior face)", "End point"],
  previewInputs: [
    [0, 0],
    [1200, 0],
  ],
  draw: ({ params, inputs: [p1, p2] }) => {
    const { outer, insulation, inner } = params;
    const length = dist(p1, p2);
    if (length < 1e-9) return [];
    const d = norm(sub(p2, p1));
    const n = { x: -d.y, y: d.x }; // left of p1→p2
    const at = (t: number, w: number) => add(add(p1, sc(d, t)), sc(n, w));
    const w1 = outer;
    const w2 = outer + insulation;
    const w3 = outer + insulation + inner;
    const lineAngle = Math.atan2(d.y, d.x);

    const shellHatch = (a: number, b: number): ModelObject => ({
      type: "hatch",
      loops: [{ points: [at(0, a), at(length, a), at(length, b), at(0, b)] }],
      fill: { kind: "lines", angle: lineAngle + Math.PI / 4, spacing: 25 },
    });

    // Hard-insulation zigzag across the middle zone (even segment count so
    // the last vertex lands back on the inner edge of the outer shell).
    const span = insulation / Math.tan(Math.PI / 3);
    const nSeg = Math.max(2, 2 * Math.round(length / (2 * span)));
    const step = length / nSeg;
    const zig: PolylineVertexLike[] = [];
    for (let i = 0; i <= nSeg; i++)
      zig.push({ ...at(i * step, i % 2 ? w2 : w1), bulge: 0 });

    return [
      { type: "line", a: at(0, 0), b: at(length, 0) },
      { type: "line", a: at(0, w1), b: at(length, w1) },
      { type: "line", a: at(0, w2), b: at(length, w2) },
      { type: "line", a: at(0, w3), b: at(length, w3) },
      { type: "line", a: at(0, 0), b: at(0, w3) },
      { type: "line", a: at(length, 0), b: at(length, w3) },
      shellHatch(0, w1),
      shellHatch(w2, w3),
      { type: "polyline", points: zig },
    ];
  },
});
