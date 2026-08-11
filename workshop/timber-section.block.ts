// Timber section — rectangle spanned by two corner picks with the ISO
// material convention inside: crossed diagonals for sawn timber,
// lamination lines for glulam, alternating-grain bands for CLT.
import { defineBlock } from "lineadraw";

export default defineBlock({
  id: "@lineadraw/timber-section",
  name: "Timber section",
  description:
    "Draws a timber cross-section: sawn (diagonals), glulam (lamellas), or CLT (bands).",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "timber", "section", "material"],
  params: [
    {
      name: "type",
      label: "Type",
      type: "enum",
      default: "sawn",
      options: [
        { value: "sawn", label: "Sawn timber" },
        { value: "glulam", label: "Glulam" },
        { value: "clt", label: "CLT" },
      ],
    },
    { name: "lamella", label: "Lamella height", type: "number", default: 45, min: 1 },
  ],
  place: ["First corner", "Opposite corner"],
  previewInputs: [
    [0, 0],
    [140, 300],
  ],
  draw: ({ params, inputs: [p1, p2] }) => {
    const x0 = Math.min(p1.x, p2.x);
    const x1 = Math.max(p1.x, p2.x);
    const y0 = Math.min(p1.y, p2.y);
    const y1 = Math.max(p1.y, p2.y);
    const w = x1 - x0;
    const h = y1 - y0;
    if (w < 1e-9 || h < 1e-9) return [];

    const out: ModelObject[] = [
      {
        type: "polyline",
        points: [
          { x: x0, y: y0 },
          { x: x1, y: y0 },
          { x: x1, y: y1 },
          { x: x0, y: y1 },
        ],
        closed: true,
      },
    ];

    if (params.type === "sawn") {
      out.push({ type: "line", a: { x: x0, y: y0 }, b: { x: x1, y: y1 } });
      out.push({ type: "line", a: { x: x0, y: y1 }, b: { x: x1, y: y0 } });
      return out;
    }

    if (params.type === "glulam") {
      for (let y = y0 + params.lamella; y < y1 - 1e-9; y += params.lamella)
        out.push({ type: "line", a: { x: x0, y }, b: { x: x1, y } });
      return out;
    }

    // CLT: bands with alternating grain direction (line hatches at 0°/90°).
    const count = Math.max(3, Math.min(7, Math.round(h / params.lamella)));
    const bh = h / count;
    for (let i = 0; i < count; i++) {
      const by0 = y0 + i * bh;
      const by1 = by0 + bh;
      if (i > 0) out.push({ type: "line", a: { x: x0, y: by0 }, b: { x: x1, y: by0 } });
      out.push({
        type: "hatch",
        loops: [
          {
            points: [
              { x: x0, y: by0 },
              { x: x1, y: by0 },
              { x: x1, y: by1 },
              { x: x0, y: by1 },
            ],
          },
        ],
        fill: { kind: "lines", angle: i % 2 ? Math.PI / 2 : 0, spacing: i % 2 ? 30 : bh / 3 },
      });
    }
    return out;
  },
});
