// Grout tube — hidden (dashed) outline of a grouting tube/duct in an
// element joint, drawn between the bottom and top picks with a cap line
// at the bottom.
import { defineBlock } from "lineadraw";
import { add, dist, norm, scale as sc, sub } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/grout-tube",
  name: "Grout tube",
  description: "Draws a dashed grout tube/duct between two points.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "precast", "joint", "detail"],
  params: [{ name: "dia", label: "Diameter", type: "number", default: 50, min: 1 }],
  place: ["Bottom point", "Top point"],
  previewInputs: [
    [0, 0],
    [0, 400],
  ],
  draw: ({ params, inputs: [p1, p2] }) => {
    const { dia } = params;
    const length = dist(p1, p2);
    if (length < 1e-9) return [];
    const d = norm(sub(p2, p1));
    const n = sc({ x: -d.y, y: d.x }, dia / 2);

    return [
      { type: "line", a: add(p1, n), b: add(p2, n), lineType: "dashed" },
      { type: "line", a: sub(p1, n), b: sub(p2, n), lineType: "dashed" },
      { type: "line", a: add(p1, n), b: sub(p1, n), lineType: "dashed" },
    ];
  },
});
