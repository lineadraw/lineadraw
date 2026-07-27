import { defineBlock } from "lineadraw";
import { sub, norm, dist, add, scale, range } from "lineadraw/helpers";

export default defineBlock({
  id: "f25fab58-dc9a-4113-89f1-e998bb0e4aeb",
  name: "Rebar section",
  params: [
    {
      name: "size",
      label: "Size",
      type: "number",
      default: 10,
    },
    {
      name: "place",
      label: "Place",
      type: "enum",
      default: "bySpacing",
      options: [
        { value: "byNumber", label: "By number" },
        { value: "bySpacing", label: "By spacing" },
      ]
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
    }
  ],
  place: ["Start point", "End point"],
  draw: ({ params, inputs }) => {
    const { size, place, num, spacing } = params;
    const [start, end] = inputs;

    const dir = norm(sub(end, start))
    const length = dist(start, end)

    const n = place === "byNumber" ? num : length / Math.max(spacing, 1) + 1;
    const s = place === "byNumber" ? length / Math.max(num - 1, 1) : spacing;

    return [
      {
        type: "hatch",
        loops: range(n).map((i) => getLoop(scale(dir, i * s), size)),
        fill: { kind: "solid" },
        scale: 1
      }
    ];
  },
});


const getLoop = (position: Vec2, size: number) => ({
  points: [
    { x: position.x - size / 2, y: position.y, bulge: 1 },
    { x: position.x + size / 2, y: position.y, bulge: 1 },
    { x: position.x - size / 2, y: position.y, bulge: 0 }
  ]
})
