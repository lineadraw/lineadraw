// North arrow — a circle with a needle whose right half is filled, and an
// "N" above. Points up as drawn; rotate the instance to match the project
// north.
import { defineBlock } from "lineadraw";

export default defineBlock({
  id: "@lineadraw/north-arrow",
  name: "North arrow",
  description: "Draws a north arrow symbol (circle, half-filled needle, N).",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["architecture", "site", "annotation", "sheet"],
  params: [{ name: "scale", label: "Scale", type: "number", default: 1 }],
  place: ["Position"],
  previewInputs: [[0, 0]],
  draw: ({ params, inputs: [p] }) => {
    const s = params.scale;
    const r = 6 * s;
    const tip = { x: p.x, y: p.y + 4.5 * s };
    const tail = { x: p.x, y: p.y - 4.5 * s };
    const wingL = { x: p.x - 2 * s, y: p.y - 4.5 * s };
    const wingR = { x: p.x + 2 * s, y: p.y - 4.5 * s };

    return [
      { type: "circle", center: p, radius: r },
      { type: "polyline", points: [tip, wingL, tail, wingR], closed: true },
      { type: "hatch", loops: [{ points: [tip, tail, wingR] }], fill: { kind: "solid" } },
      {
        type: "text",
        position: { x: p.x, y: p.y + r + 0.5 * s },
        content: "N",
        hAlign: "center",
        vAlign: "top",
        scale: s,
        styleOverride: { textHeight: 3.5 },
      },
    ];
  },
});
