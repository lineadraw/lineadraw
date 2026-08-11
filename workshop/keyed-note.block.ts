// Keyed note — a numbered bubble (circle or hexagon) with a leader and
// arrowhead pointing at the noted detail; builds keynote legends.
import { defineBlock } from "lineadraw";
import { add, dist, norm, polar, rotate, scale as sc, sub, toRad } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/keyed-note",
  name: "Keyed note",
  description:
    "Draws a keynote bubble with a leader arrow pointing at the target.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["annotation", "note", "detail"],
  params: [
    { name: "scale", label: "Scale", type: "number", default: 1 },
    { name: "label", label: "Note no.", type: "string", default: "1" },
    {
      name: "shape",
      label: "Shape",
      type: "enum",
      default: "circle",
      options: [
        { value: "circle", label: "Circle" },
        { value: "hexagon", label: "Hexagon" },
      ],
    },
  ],
  place: ["Target point", "Bubble position"],
  previewInputs: [
    [0, 0],
    [8, 5],
  ],
  draw: ({ params, inputs: [target, bubble] }) => {
    const { scale, label, shape } = params;
    const r = 3.5 * scale;
    const gap = dist(target, bubble);
    const out: ModelObject[] = [];

    if (shape === "hexagon")
      out.push({
        type: "polyline",
        points: [0, 60, 120, 180, 240, 300].map((a) => add(bubble, polar(toRad(a), r))),
        closed: true,
      });
    else out.push({ type: "circle", center: bubble, radius: r });

    out.push({
      type: "text",
      position: bubble,
      content: label,
      hAlign: "center",
      vAlign: "center",
      scale,
    });

    if (gap > r + 1e-9) {
      const toTarget = norm(sub(target, bubble));
      const edge = add(bubble, sc(toTarget, r));
      const back = sc(toTarget, -2.5 * scale); // arrowhead legs point back up the leader
      out.push({ type: "line", a: edge, b: target });
      out.push({ type: "line", a: target, b: add(target, rotate(back, 0.3)) });
      out.push({ type: "line", a: target, b: add(target, rotate(back, -0.3)) });
    }
    return out;
  },
});
