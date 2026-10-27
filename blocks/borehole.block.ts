// Borehole — geotechnical investigation point: a circle with the left
// half filled, and the borehole id next to it. Sized by the annotation
// scale (paper-mm × scale).
import { defineBlock } from "lineadraw";
import { add } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/borehole",
  name: "Borehole",
  description: "Draws a borehole symbol (half-filled circle) with its id.",
  // 1.1.0: text alignment is justification (AutoCAD meaning) since Linea
  // document v20 — values flipped so the text renders where it did.
  version: "1.1.0",
  authors: ["Linea Team"],
  tags: ["site", "geotechnical", "annotation"],
  params: [{ name: "label", label: "Label", type: "string", default: "P1" }],
  place: ["Borehole point"],
  draw: ({ params, inputs: [c] }) => {
    const { label } = params;
    const r = 3;
    const out: ModelObject[] = [
      { type: "circle", center: c, radius: r },
      {
        // Left half-disc: semicircle arc from top to bottom, closed by the
        // vertical diameter.
        type: "hatch",
        loops: [
          {
            points: [
              [c.x, c.y + r, 1],
              [c.x, c.y - r],
              [c.x, c.y + r],
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
        hAlign: "left",
        vAlign: "center",
      });
    return out;
  },
});
