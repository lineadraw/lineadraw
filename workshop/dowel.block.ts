// Dowel — a joint dowel bar in longitudinal section: a stadium (rounded
// end) outline centered on the joint with a centerline through it.
// Rotate the instance to match the joint direction.
import { defineBlock } from "lineadraw";

export default defineBlock({
  id: "@lineadraw/dowel",
  name: "Dowel",
  description: "Draws a joint dowel bar (rounded-end outline with centerline).",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "concrete", "joint", "detail"],
  params: [
    { name: "dia", label: "Bar Ø", type: "number", default: 25, min: 1 },
    { name: "length", label: "Length", type: "number", default: 500, min: 1 },
  ],
  place: ["Center point (joint)"],
  previewInputs: [[0, 0]],
  draw: ({ params, inputs: [c] }) => {
    const { dia } = params;
    const l2 = params.length / 2;
    const d2 = dia / 2;
    return [
      {
        type: "polyline",
        points: [
          { x: c.x - l2, y: c.y - d2, bulge: 0 },
          { x: c.x + l2, y: c.y - d2, bulge: 1 },
          { x: c.x + l2, y: c.y + d2, bulge: 0 },
          { x: c.x - l2, y: c.y + d2, bulge: 1 },
        ],
        closed: true,
      },
      {
        type: "line",
        a: { x: c.x - l2 - dia, y: c.y },
        b: { x: c.x + l2 + dia, y: c.y },
        lineType: "center",
      },
    ];
  },
});
