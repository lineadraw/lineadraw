// Break line — interruption symbol between two points: a straight line
// with a zigzag jog at the middle, or an S-curve for freehand-style
// breaks (pipes, timber).
import { defineBlock } from "lineadraw";
import { add, dist, norm, scale as sc, sub } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/break-line",
  name: "Break line",
  description:
    "Draws a break/interruption line: zigzag jog or S-curve at the middle.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["architecture", "structural", "annotation", "detail"],
  params: [
    { name: "scale", label: "Scale", type: "number", default: 1 },
    {
      name: "style",
      label: "Style",
      type: "enum",
      default: "zigzag",
      options: [
        { value: "zigzag", label: "Zigzag" },
        { value: "curve", label: "S-curve" },
      ],
    },
  ],
  place: ["Start point", "End point"],
  previewInputs: [
    [0, 0],
    [20, 0],
  ],
  draw: ({ params, inputs: [p1, p2] }) => {
    const { scale, style } = params;
    const length = dist(p1, p2);
    if (length < 1e-9) return [];
    const d = norm(sub(p2, p1));
    const n = { x: -d.y, y: d.x };
    const at = (t: number) => add(p1, sc(d, t));
    const mid = length / 2;
    const g = Math.min(3 * scale, length / 4); // half-length of the jog
    const h = 3 * scale;

    if (style === "zigzag")
      return [
        {
          type: "polyline",
          points: [
            p1,
            at(mid - g),
            add(at(mid - g / 2), sc(n, h)),
            add(at(mid + g / 2), sc(n, -h)),
            at(mid + g),
            p2,
          ],
        },
      ];

    // S-curve: two opposite arcs around the middle.
    return [
      {
        type: "polyline",
        points: [
          { ...p1, bulge: 0 },
          { ...at(mid - g), bulge: 0.6 },
          { ...at(mid), bulge: -0.6 },
          { ...at(mid + g), bulge: 0 },
          { ...p2, bulge: 0 },
        ],
      },
    ];
  },
});
