// Example block definition - a door swing.

import { defineBlock } from "lineadraw";
import { dist, scale as sc, sub, norm, add } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/detail-mark",
  name: "Detail mark",
  description: "Draws a section mark with a label",
  // 1.1.0: text alignment is justification (AutoCAD meaning) since Linea
  // document v20 — values flipped so the text renders where it did.
  version: "1.1.0",
  authors: ["Linea Team"],
  tags: ["architecture", "structural", "section", "annotation"],
  params: [
    {
      name: "scale",
      label: "Scale",
      type: "number",
      default: 1,
    },
    {
      name: "label",
      label: "Label",
      type: "string",
      default: "A",
    },
  ],
  place: ["Detail position", "Circle radius", "Label position"],
  previewInputs: [
    [0, 0],
    [2, 0],
    [4, 4],
  ],
  draw: ({ params, inputs }) => {
    const { scale, label } = params;
    const [p1, p2, p3] = inputs;
    const r = dist(p1, p2);
    const p4 = add(p1, sc(norm(sub(p3, p1)), r));
    const hor = p3.x > p1.x ? "right" : "left";
    return [
      {
        type: "circle",
        center: p1,
        radius: r,
      },
      {
        type: "text",
        position: p3,
        content: label,
        leaderLines: [
          [
            p4,
            add(p3, {
              x: hor === "right" ? -0.875 * scale : 0.875 * scale,
              y: -0.875 * scale,
            }),
          ],
        ],
        // Justification: text running right of the point is left-justified.
        hAlign: hor === "right" ? "left" : "right",
        vAlign: "bottom",
        frame: "bottom",
        styleOverride: {
          arrowType: "none",
        },
        scale,
      },
    ];
  },
});
