// Elevation mark — level datum symbol for sections/elevations: a triangle
// with its apex on the level point and the level value on a horizontal
// line running toward the label position. "Finished" fills half of the
// triangle, "structural" leaves it open.
import { defineBlock } from "lineadraw";

export default defineBlock({
  id: "@lineadraw/elevation-mark",
  name: "Elevation mark",
  description:
    "Draws a level datum triangle with the level value text (e.g. +12.500).",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["architecture", "structural", "level", "annotation"],
  params: [
    { name: "scale", label: "Scale", type: "number", default: 1 },
    { name: "value", label: "Level", type: "string", default: "+0.000" },
    {
      name: "style",
      label: "Style",
      type: "enum",
      default: "structural",
      options: [
        { value: "structural", label: "Structural (open)" },
        { value: "finished", label: "Finished (half-filled)" },
      ],
    },
  ],
  place: ["Level point", "Label position"],
  previewInputs: [
    [0, 0],
    [10, 3],
  ],
  draw: ({ params, inputs: [p, at] }) => {
    const { scale, value, style } = params;
    const h = 3 * scale; // triangle height (apex at the level point)
    const sx = at.x >= p.x ? 1 : -1;
    const top = p.y + h;
    const left = { x: p.x - h, y: top };
    const right = { x: p.x + h, y: top };

    const out: ModelObject[] = [
      { type: "polyline", points: [left, p, right] },
      // Horizontal line at the triangle top, running out to the label end.
      { type: "line", a: { x: sx > 0 ? left.x : right.x, y: top }, b: { x: at.x, y: top } },
      {
        type: "text",
        position: { x: at.x, y: top },
        content: value,
        hAlign: sx > 0 ? "left" : "right",
        vAlign: "top",
        scale,
      },
    ];
    if (style === "finished")
      out.push({
        type: "hatch",
        loops: [{ points: [p, { x: p.x, y: top }, sx > 0 ? right : left] }],
        fill: { kind: "solid" },
      });
    return out;
  },
});
