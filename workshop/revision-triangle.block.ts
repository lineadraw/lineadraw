// Revision triangle — a numbered triangle marking a revision on the
// drawing; pairs with the cloud block.
import { defineBlock } from "lineadraw";
import { add, polar, toRad } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/revision-triangle",
  name: "Revision triangle",
  description: "Draws a revision marker: a triangle with a revision letter/number.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["annotation", "revision", "sheet"],
  params: [
    { name: "scale", label: "Scale", type: "number", default: 1 },
    { name: "label", label: "Revision", type: "string", default: "A" },
  ],
  place: ["Center point"],
  previewInputs: [[0, 0]],
  draw: ({ params, inputs: [c] }) => {
    const { scale, label } = params;
    const r = 3.5 * scale;
    return [
      {
        type: "polyline",
        points: [
          add(c, polar(toRad(90), r)),
          add(c, polar(toRad(210), r)),
          add(c, polar(toRad(330), r)),
        ],
        closed: true,
      },
      {
        type: "text",
        position: { x: c.x, y: c.y - 0.5 * scale },
        content: label,
        hAlign: "center",
        vAlign: "center",
        scale,
      },
    ];
  },
});
