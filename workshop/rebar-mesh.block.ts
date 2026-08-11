// Rebar mesh — plan symbol for a reinforcement mesh area: a dashed extent
// rectangle spanned by the two picked corners, a diagonal across it, and
// the mesh designation written along the diagonal.
import { defineBlock } from "lineadraw";
import { add, dist, norm, scale as sc, sub } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/rebar-mesh",
  name: "Rebar mesh",
  description:
    "Marks a mesh reinforcement area: diagonal with designation over a dashed extent.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "concrete", "rebar", "mesh", "annotation"],
  params: [
    { name: "label", label: "Mesh", type: "string", default: "B500K 8-150" },
    { name: "scale", label: "Text scale", type: "number", default: 50 },
    { name: "outline", label: "Extent rectangle", type: "boolean", default: true },
  ],
  place: ["First corner", "Opposite corner"],
  previewInputs: [
    [0, 0],
    [2000, 1200],
  ],
  draw: ({ params, inputs: [p1, p2] }) => {
    const { label, scale, outline } = params;
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
      { type: "line", a: p1, b: p2 },
      {
        type: "text",
        position: add(add(p1, sc(d, length / 2)), sc(up, 0.5 * scale)),
        content: label,
        rotation: rot,
        hAlign: "center",
        vAlign: "top",
        scale,
      },
    ];
    if (outline)
      out.push({
        type: "polyline",
        points: [p1, { x: p2.x, y: p1.y }, p2, { x: p1.x, y: p2.y }],
        closed: true,
        lineType: "dashed",
      });
    return out;
  },
});
