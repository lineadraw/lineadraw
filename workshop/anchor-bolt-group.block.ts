// Anchor bolt group — a rows × cols grid of bolts (circle + diagonal
// cross) centered on the picked point; for base plates and column shoes.
import { defineBlock } from "lineadraw";
import { add, polar, toRad } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/anchor-bolt-group",
  name: "Anchor bolt group",
  description:
    "Draws a grid of anchor bolts (circle with cross) centered on a point.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "steel", "foundation", "detail"],
  params: [
    { name: "cols", label: "Columns", type: "number", default: 2, min: 1 },
    { name: "rows", label: "Rows", type: "number", default: 2, min: 1 },
    { name: "sx", label: "Spacing X", type: "number", default: 300, min: 1 },
    { name: "sy", label: "Spacing Y", type: "number", default: 300, min: 1 },
    { name: "dia", label: "Bolt Ø", type: "number", default: 24, min: 1 },
  ],
  place: ["Group center"],
  previewInputs: [[0, 0]],
  draw: ({ params, inputs: [c] }) => {
    const { sx, sy, dia } = params;
    const cols = Math.max(1, Math.round(params.cols));
    const rows = Math.max(1, Math.round(params.rows));
    const tick = dia * 1.2; // cross half-length

    const out: ModelObject[] = [];
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const p = add(c, {
          x: (i - (cols - 1) / 2) * sx,
          y: (j - (rows - 1) / 2) * sy,
        });
        out.push({ type: "circle", center: p, radius: dia / 2 });
        out.push({ type: "line", a: add(p, polar(toRad(45), tick)), b: add(p, polar(toRad(225), tick)) });
        out.push({ type: "line", a: add(p, polar(toRad(135), tick)), b: add(p, polar(toRad(315), tick)) });
      }
    return out;
  },
});
