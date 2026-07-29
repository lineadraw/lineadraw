import { defineBlock } from "lineadraw";
import { sub, norm, dist, scale, range } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/rebar-section",
  name: "Rebar Section",
  description:
    "Draws a row of rebars in section view (filled dots) between two picked points, distributed by count or by spacing.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "concrete", "reinforcement", "rebar", "section"],
  params: [
    {
      name: "size",
      label: "Size",
      type: "number",
      default: 10,
    },
    {
      name: "placing",
      label: "Placing",
      type: "enum",
      default: "bySpacing",
      options: [
        { value: "byNumber", label: "By number" },
        { value: "bySpacing", label: "By spacing" },
      ],
    },
    {
      name: "num",
      label: "Number",
      type: "number",
      default: 2,
    },
    {
      name: "spacing",
      label: "Spacing",
      type: "number",
      default: 150,
    },
  ],
  paramVisibility: ({ params }) => ({
    num: params.placing === "byNumber",
    spacing: params.placing === "bySpacing",
  }),
  place: ["Start point", "End point"],
  draw: ({ params, inputs }) => {
    const { size, placing, num, spacing } = params;
    const [start, end] = inputs;

    const dir = norm(sub(end, start));
    const length = dist(start, end);

    const n = placing === "byNumber" ? num : length / Math.max(spacing, 1) + 1;
    const s = placing === "byNumber" ? length / Math.max(num - 1, 1) : spacing;

    return [
      {
        type: "hatch",
        loops: range(n).map((i) => getLoop(scale(dir, i * s), size)),
        fill: { kind: "solid" },
        scale: 1,
      },
    ];
  },
});

const getLoop = (position: Vec2, size: number) => ({
  points: [
    { x: position.x - size / 2, y: position.y, bulge: 1 },
    { x: position.x + size / 2, y: position.y, bulge: 1 },
    { x: position.x - size / 2, y: position.y, bulge: 0 },
  ],
});
