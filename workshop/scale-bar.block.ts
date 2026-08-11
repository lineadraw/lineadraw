// Scale bar — alternating filled/open segments in model space with meter
// labels at the ticks. `drawing` is the drawing-scale denominator (50 for
// 1:50); it sizes the bar height and the tick texts so they print right.
import { defineBlock } from "lineadraw";

export default defineBlock({
  id: "@lineadraw/scale-bar",
  name: "Scale bar",
  description:
    "Draws a graphic scale bar with alternating segments and meter labels.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["architecture", "site", "annotation", "sheet"],
  params: [
    { name: "drawing", label: "Drawing scale 1:", type: "number", default: 50, min: 1 },
    { name: "segment", label: "Segment (mm)", type: "number", default: 1000, min: 1 },
    { name: "segments", label: "Segments", type: "number", default: 4, min: 1 },
  ],
  place: ["Left end"],
  previewInputs: [[0, 0]],
  draw: ({ params, inputs: [p] }) => {
    const { drawing, segment, segments } = params;
    const n = Math.max(1, Math.round(segments));
    const h = 1.5 * drawing; // 1.5 mm on paper
    const total = n * segment;

    const out: ModelObject[] = [
      {
        type: "polyline",
        points: [p, { x: p.x + total, y: p.y }, { x: p.x + total, y: p.y + h }, { x: p.x, y: p.y + h }],
        closed: true,
      },
    ];
    for (let i = 0; i < n; i++) {
      const x0 = p.x + i * segment;
      if (i > 0) out.push({ type: "line", a: { x: x0, y: p.y }, b: { x: x0, y: p.y + h } });
      if (i % 2 === 0)
        out.push({
          type: "hatch",
          loops: [
            {
              points: [
                { x: x0, y: p.y },
                { x: x0 + segment, y: p.y },
                { x: x0 + segment, y: p.y + h },
                { x: x0, y: p.y + h },
              ],
            },
          ],
          fill: { kind: "solid" },
        });
    }
    for (let i = 0; i <= n; i++) {
      const meters = (i * segment) / 1000;
      out.push({
        type: "text",
        position: { x: p.x + i * segment, y: p.y + h + 0.5 * drawing },
        content: i === n ? `${meters} m` : `${meters}`,
        hAlign: "center",
        vAlign: "top",
        scale: drawing,
      });
    }
    return out;
  },
});
