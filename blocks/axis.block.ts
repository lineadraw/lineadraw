// Grid axis

import { defineBlock } from "lineadraw";
import { sub, norm, add, scale as sc } from "lineadraw/helpers";

export default defineBlock({
  id: "2ee7ebef-052e-44ca-a576-0acd0d45d6ac",
  name: "Axis",
  description: "Draws an axis line",
  version: "1.0.0",
  authors: ["Lineadraw Team"],
  tags: ["architecture", "structural", "axis"],
  params: [
    {
      name: "scale",
      label: "Scale",
      type: "number",
      default: 10,
    },
    {
      name: "label",
      label: "Label",
      type: "string",
      default: "A",
    },
    {
      name: "labelPos",
      label: "Label pos.",
      type: "enum",
      default: "start",
      options: [
        { value: "start", label: "Start" },
        { value: "end", label: "End" },
        { value: "both", label: "Both" },
      ]
    },
  ],
  place: ["Start point", "End point"],
  draw: ({ params, inputs }) => {
    const { scale, label, labelPos } = params;
    const [start, end] = inputs

    const dir = norm(sub(end, start));
    const atStart = labelPos === "start" || labelPos === "both";
    const atEnd = labelPos === "end" || labelPos === "both"

    return [
      {
        type: "line",
        a: atStart ? add(start, sc(dir, 5 * scale)) : start,
        b: atEnd ? add(end, sc(dir, -5 * scale)) : end,
        lineType: "center"
      },
      ...(atStart ? getLabel(start, label, scale) : []),
      ...(atEnd ? getLabel(end, label, scale) : [])
    ];
  },
});

const getLabel = (pos: Vec2Like, label: string, scale: number): ModelObject[] => {
  return [
    {
      type: "circle",
      center: pos,
      radius: 5 * scale
    },
    {
      type: "text",
      position: pos,
      content: label,
      scale: scale,
      styleOverride: {
        textHeight: 5
      }
    }
  ]
}
