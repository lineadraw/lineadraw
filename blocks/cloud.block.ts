// Cloud

import { defineBlock } from "lineadraw";
import { dist, len, norm, sub } from "lineadraw/helpers";

const SIZE = 2;

export default defineBlock({
  id: "@lineadraw/cloud",
  name: "Cloud",
  description: "Draws a cloud shape to represent a structure on hold.",
  version: "1.0.1",
  authors: ["Linea Team"],
  tags: ["structure", "cloud", "hold"],
  params: [
    {
      name: "scale",
      label: "Scale",
      type: "number",
      default: 50,
    },
  ],
  place: async ({ pickPoint }) => {
    const points: Vec2[] = [];
    try {
      for (;;) points.push(await pickPoint(`Point ${points.length + 1}`));
    } catch (e) {
      if (points.length < 3) throw e;
    }
    return points;
  },
  previewInputs: [
    [0, 0],
    [500, 0],
    [500, 500],
    [0, 500],
  ],
  draw: ({ params, inputs }) => {
    const { scale } = params;

    const points: PolylineVertexLike[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const p0 = inputs[i];
      const p1 = inputs[(i + 1) % inputs.length];
      const dir = norm(sub(p1, p0));
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
