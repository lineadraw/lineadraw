// Lifting anchor — plan symbol for a precast element lifting insert: a
// circle with a diagonal cross, with an optional product label.
import { defineBlock } from "lineadraw";
import { add, polar, toRad } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/lifting-anchor",
  name: "Lifting anchor",
  description: "Draws a lifting insert symbol (circle with cross) in plan.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "precast", "lifting", "detail"],
  params: [
    { name: "dia", label: "Diameter", type: "number", default: 60, min: 1 },
    { name: "label", label: "Label", type: "string", default: "" },
    { name: "scale", label: "Text scale", type: "number", default: 50 },
  ],
  place: ["Center point"],
  previewInputs: [[0, 0]],
  draw: ({ params, inputs: [c] }) => {
    const { dia, label, scale } = params;
    const r = dia / 2;
    const out: ModelObject[] = [
      { type: "circle", center: c, radius: r },
      { type: "line", a: add(c, polar(toRad(45), r)), b: add(c, polar(toRad(225), r)) },
      { type: "line", a: add(c, polar(toRad(135), r)), b: add(c, polar(toRad(315), r)) },
    ];
    if (label.trim() !== "")
      out.push({
        type: "text",
        position: add(c, { x: 0.8 * dia, y: 0.8 * dia }),
        content: label,
        hAlign: "right",
        vAlign: "center",
        scale,
      });
    return out;
  },
});
