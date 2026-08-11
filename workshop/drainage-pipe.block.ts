// Drainage pipe — a dashed pipe run with a flow arrow and the pipe
// designation + slope written along it, always reading left-to-right.
import { defineBlock } from "lineadraw";
import { add, dist, norm, rotate, scale as sc, sub } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/drainage-pipe",
  name: "Drainage pipe",
  description:
    "Draws a drainage/sewer pipe run: dashed line, flow arrow, label and slope.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["site", "hvac", "drainage", "annotation"],
  params: [
    { name: "label", label: "Pipe", type: "string", default: "110 SV" },
    { name: "slope", label: "Slope", type: "string", default: "1:100" },
    { name: "scale", label: "Text scale", type: "number", default: 50 },
  ],
  place: ["Upstream point", "Downstream point"],
  previewInputs: [
    [0, 0],
    [3000, 0],
  ],
  draw: ({ params, inputs: [p1, p2] }) => {
    const { label, slope, scale } = params;
    const length = dist(p1, p2);
    if (length < 1e-9) return [];
    const d = norm(sub(p2, p1));
    const head = 3 * scale;

    let rot = Math.atan2(d.y, d.x);
    let up = { x: -d.y, y: d.x };
    if (rot > Math.PI / 2 || rot <= -Math.PI / 2) {
      rot += Math.PI;
      up = sc(up, -1);
    }

    // Flow arrowhead at 2/3 of the run.
    const q = add(p1, sc(d, (2 * length) / 3));
    return [
      { type: "line", a: p1, b: p2, lineType: "dashed" },
      { type: "line", a: q, b: add(q, rotate(sc(d, -head), 0.35)) },
      { type: "line", a: q, b: add(q, rotate(sc(d, -head), -0.35)) },
      {
        type: "text",
        position: add(add(p1, sc(d, length / 2)), sc(up, 0.5 * scale)),
        content: `${label}  ${slope}`.trim(),
        rotation: rot,
        hAlign: "center",
        vAlign: "top",
        scale,
      },
    ];
  },
});
