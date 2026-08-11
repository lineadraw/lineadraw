// Match line / centerline — a labeled line between two points: a heavy
// dashed match line where a plan splits across sheets, or a center-style
// line with a CL label.
import { defineBlock } from "lineadraw";
import { add, dist, norm, scale as sc, sub } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/match-line",
  name: "Match line",
  description:
    "Draws a labeled match line (dashed) or centerline between two points.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["architecture", "annotation", "sheet"],
  params: [
    { name: "scale", label: "Scale", type: "number", default: 1 },
    {
      name: "type",
      label: "Type",
      type: "enum",
      default: "match",
      options: [
        { value: "match", label: "Match line" },
        { value: "center", label: "Centerline" },
      ],
    },
    { name: "label", label: "Label", type: "string", default: "MATCH LINE" },
  ],
  place: ["Start point", "End point"],
  previewInputs: [
    [0, 0],
    [30, 0],
  ],
  draw: ({ params, inputs: [p1, p2] }) => {
    const { scale, type, label } = params;
    const length = dist(p1, p2);
    if (length < 1e-9) return [];
    const d = norm(sub(p2, p1));

    let rot = Math.atan2(d.y, d.x);
    let up = { x: -d.y, y: d.x };
    if (rot > Math.PI / 2 || rot <= -Math.PI / 2) {
      rot += Math.PI;
      up = sc(up, -1);
    }

    const out: ModelObject[] = [
      type === "match"
        ? { type: "line", a: p1, b: p2, lineType: "dashed", lineWidth: 0.5 }
        : { type: "line", a: p1, b: p2, lineType: "center" },
    ];
    if (label.trim() !== "")
      out.push({
        type: "text",
        position: add(add(p1, sc(d, length / 2)), sc(up, 0.7 * scale)),
        content: label,
        rotation: rot,
        hAlign: "center",
        vAlign: "top",
        scale,
      });
    return out;
  },
});
