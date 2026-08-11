// Opening mark (varaus) — a crossed rectangle marking an opening or
// recess in an element/slab, with a size label in the middle. The label
// defaults to the measured WIDTH x HEIGHT of the picked rectangle.
import { defineBlock } from "lineadraw";

export default defineBlock({
  id: "@lineadraw/opening-mark",
  name: "Opening mark",
  description:
    "Draws a crossed rectangle for an opening/recess with an auto size label.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "precast", "opening", "annotation"],
  params: [
    { name: "label", label: "Label (empty = size)", type: "string", default: "" },
    { name: "scale", label: "Text scale", type: "number", default: 50 },
  ],
  place: ["First corner", "Opposite corner"],
  previewInputs: [
    [0, 0],
    [800, 1200],
  ],
  draw: ({ params, inputs: [p1, p2] }) => {
    const w = Math.abs(p2.x - p1.x);
    const h = Math.abs(p2.y - p1.y);
    if (w < 1e-9 || h < 1e-9) return [];
    const label =
      params.label.trim() !== ""
        ? params.label
        : `${Math.round(w)} x ${Math.round(h)}`;

    return [
      {
        type: "polyline",
        points: [p1, { x: p2.x, y: p1.y }, p2, { x: p1.x, y: p2.y }],
        closed: true,
      },
      { type: "line", a: p1, b: p2 },
      { type: "line", a: { x: p1.x, y: p2.y }, b: { x: p2.x, y: p1.y } },
      {
        type: "text",
        position: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
        content: label,
        hAlign: "center",
        vAlign: "center",
        frame: "rectangle",
        scale: params.scale,
      },
    ];
  },
});
