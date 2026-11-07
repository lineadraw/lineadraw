// Cloud

import { defineBlock } from "lineadraw";
import type { PolylineVertexInput } from "lineadraw";
import { dist } from "lineadraw/helpers";

const SIZE = 2;

export default defineBlock({
  id: "@lineadraw/cloud",
  name: "Cloud",
  description: "Draws a cloud shape to represent a structure on hold.",
  // 1.1.0: the outline is an editable point list (add / remove points).
  version: "1.1.0",
  authors: ["Linea Team"],
  tags: ["structure", "cloud", "hold"],
  params: [
    {
      name: "scale",
      label: "Scale",
      type: "number",
      default: 1,
    },
  ],
  inputs: [
    { name: "outline", label: "Outline", type: "points", min: 3, closed: true },
  ],
  previewInputs: {
    outline: [
      [0, 0],
      [7, 0],
      [7, 7],
      [0, 7],
    ],
  },
  draw: ({ params, inputs: { outline: inputs } }) => {
    const { scale } = params;

    const points: PolylineVertexInput[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const p0 = inputs[i];
      const p1 = inputs[(i + 1) % inputs.length];
      const length = dist(p0, p1);
      const segments = Math.max(1, Math.floor(length / scale / SIZE));

      for (let j = 0; j < segments + 1; j++) {
        const t = j / segments;
        const x = p0.x + (p1.x - p0.x) * t;
        const y = p0.y + (p1.y - p0.y) * t;
        points.push({ x, y, bulge: 1 });
      }
    }

    return [
      {
        type: "polyline",
        points: [...points.map((v) => ({ ...v, bulge: 1 }))],
        closed: true,
      },
    ];
  },
});
