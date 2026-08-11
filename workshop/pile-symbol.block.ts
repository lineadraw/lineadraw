// Pile symbol — plan symbol for a foundation pile: driven (circle with
// cross), drilled (double circle), or steel pipe (filled circle), with an
// optional pile number.
import { defineBlock } from "lineadraw";
import { add, polar, toRad } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/pile-symbol",
  name: "Pile",
  description: "Draws a pile plan symbol (driven/drilled/steel) with a number.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "foundation", "pile", "site"],
  params: [
    { name: "dia", label: "Diameter", type: "number", default: 300, min: 1 },
    {
      name: "type",
      label: "Type",
      type: "enum",
      default: "driven",
      options: [
        { value: "driven", label: "Driven (cross)" },
        { value: "drilled", label: "Drilled (double circle)" },
        { value: "steel", label: "Steel pipe (filled)" },
      ],
    },
    { name: "label", label: "Pile no.", type: "string", default: "" },
    { name: "scale", label: "Text scale", type: "number", default: 50 },
  ],
  place: ["Pile center"],
  previewInputs: [[0, 0]],
  draw: ({ params, inputs: [c] }) => {
    const { dia, label, scale } = params;
    const r = dia / 2;
    const out: ModelObject[] = [{ type: "circle", center: c, radius: r }];

    if (params.type === "driven") {
      out.push({ type: "line", a: add(c, polar(toRad(45), r)), b: add(c, polar(toRad(225), r)) });
      out.push({ type: "line", a: add(c, polar(toRad(135), r)), b: add(c, polar(toRad(315), r)) });
    } else if (params.type === "drilled") {
      out.push({ type: "circle", center: c, radius: 0.6 * r });
    } else {
      out.push({
        type: "hatch",
        loops: [
          {
            points: [
              { x: c.x - r, y: c.y, bulge: 1 },
              { x: c.x + r, y: c.y, bulge: 1 },
            ],
          },
        ],
        fill: { kind: "solid" },
      });
    }

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
