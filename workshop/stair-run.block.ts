// Stair run — plan symbol: risers across the run width, edge lines, and a
// walking line with a start circle and an arrowhead in the walking
// direction. Picked along the walking line from the first riser upward.
import { defineBlock } from "lineadraw";
import { add, dist, norm, rotate, scale as sc, sub } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/stair-run",
  name: "Stair run",
  description:
    "Draws a stair run in plan: risers, edges, and a direction (walking) line.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["architecture", "plan", "stair"],
  params: [
    { name: "width", label: "Run width", type: "number", default: 1200, min: 1 },
    { name: "going", label: "Going (tread)", type: "number", default: 300, min: 1 },
  ],
  place: ["First riser (center)", "Last riser (center)"],
  previewInputs: [
    [0, 0],
    [2700, 0],
  ],
  draw: ({ params, inputs: [p1, p2] }) => {
    const { width, going } = params;
    const length = dist(p1, p2);
    if (length < 1e-9) return [];
    const d = norm(sub(p2, p1));
    const n = { x: -d.y, y: d.x };
    const at = (t: number, w: number) => add(add(p1, sc(d, t)), sc(n, w));
    const half = width / 2;
    const count = Math.max(1, Math.round(length / going));
    const step = length / count;

    const out: ModelObject[] = [
      { type: "line", a: at(0, half), b: at(length, half) },
      { type: "line", a: at(0, -half), b: at(length, -half) },
    ];
    for (let i = 0; i <= count; i++)
      out.push({ type: "line", a: at(i * step, -half), b: at(i * step, half) });

    // Walking line: circle at the start, arrowhead at the end.
    const head = Math.min(going / 2, length / 4);
    out.push({ type: "circle", center: p1, radius: Math.min(50, half / 4) });
    out.push({ type: "line", a: p1, b: p2 });
    out.push({ type: "line", a: p2, b: add(p2, rotate(sc(d, -head), 0.35)) });
    out.push({ type: "line", a: p2, b: add(p2, rotate(sc(d, -head), -0.35)) });
    return out;
  },
});
