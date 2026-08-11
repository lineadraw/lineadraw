// Slope arrow — an arrow from the high point to the low point with the
// slope designation (e.g. "1:100") written along it. The label always
// reads left-to-right regardless of the arrow direction.
import { defineBlock } from "lineadraw";
import { add, dist, norm, rotate, scale as sc, sub } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/slope-arrow",
  name: "Slope arrow",
  description: "Draws a slope/fall arrow with a ratio label along it.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["architecture", "structural", "slope", "annotation"],
  params: [
    { name: "scale", label: "Scale", type: "number", default: 1 },
    { name: "label", label: "Slope", type: "string", default: "1:100" },
  ],
  place: ["High point", "Low point (arrowhead)"],
  previewInputs: [
    [0, 0],
    [20, 0],
  ],
  draw: ({ params, inputs: [a, b] }) => {
    const { scale, label } = params;
    const length = dist(a, b);
    if (length < 1e-9) return [];
    const d = norm(sub(b, a));
    const head = 3 * scale;

    let rot = Math.atan2(d.y, d.x);
    let up = { x: -d.y, y: d.x };
    if (rot > Math.PI / 2 || rot <= -Math.PI / 2) {
      rot += Math.PI;
      up = sc(up, -1);
    }

    return [
      { type: "line", a, b },
      { type: "line", a: b, b: add(b, rotate(sc(d, -head), 0.42)) },
      { type: "line", a: b, b: add(b, rotate(sc(d, -head), -0.42)) },
      {
        type: "text",
        position: add(add(a, sc(d, length / 2)), sc(up, 0.5 * scale)),
        content: label,
        rotation: rot,
        hAlign: "center",
        vAlign: "top",
        scale,
      },
    ];
  },
});
