// Borehole — geotechnical investigation point: a circle with the left
// half filled, and the borehole id next to it. Sized by the annotation
// scale (paper-mm × scale).
import { defineBlock } from "lineadraw";
import { add } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/borehole",
  name: "Borehole",
  description: "Draws a borehole symbol (half-filled circle) with its id.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["site", "geotechnical", "annotation"],
  params: [
    { name: "scale", label: "Scale", type: "number", default: 50 },
    { name: "label", label: "Id", type: "string", default: "P1" },
  ],
  place: ["Borehole point"],
  previewInputs: [[0, 0]],
  draw: ({ params, inputs: [c] }) => {
    const { scale, label } = params;
    const r = 3 * scale;
    const out: ModelObject[] = [
      { type: "circle", center: c, radius: r },
      {
        // Left half-disc: semicircle arc from top to bottom, closed by the
        // vertical diameter.
        type: "hatch",
        loops: [
          {
            points: [
              { x: c.x, y: c.y + r, bulge: 1 },
              { x: c.x, y: c.y - r, bulge: 0 },
              { x: c.x, y: c.y + r, bulge: 1 },
            ],
          },
        ],
        fill: { kind: "solid" },
      },
    ];
    if (label.trim() !== "")
      out.push({
        type: "text",
        position: add(c, { x: 1.2 * r, y: r }),
        content: label,
        hAlign: "right",
        vAlign: "center",
        scale,
      });
    return out;
  },
});
