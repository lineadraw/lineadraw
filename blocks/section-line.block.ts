// Example block definition - a door swing.

import { defineBlock } from "lineadraw";

export default defineBlock({
  id: "@lineadraw/section-line",
  name: "Section line",
  description: "Draws a section line with a label",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["architecture", "structural", "section", "annotation"],
  dependencies: ["@lineadraw/section-mark"],
  params: [
    {
      name: "scale",
      label: "Scale",
      type: "number",
      default: 1,
    },
    {
      name: "label",
      label: "Label",
      type: "string",
      default: "A",
    },
    {
      name: "text_rotation",
      label: "Text rotation",
      type: "number",
      default: 0,
    },
  ],
  place: ["Start point", "End point"],
  previewInputs: [
    [0, 0],
    [3, 0],
  ],
  draw: ({ params, inputs }) => {
    const { scale, label, text_rotation } = params;
    const [start, end] = inputs;
    const rotation = Math.atan2(end.y - start.y, end.x - start.x);

    return [
      {
        type: "block",
        definitionId: "@lineadraw/section-mark",
        params: {
          label: label,
          mirror: true,
          text_rotation,
        },
        inputs: [start],
        scale,
        rotation,
      },
      {
        type: "block",
        definitionId: "@lineadraw/section-mark",
        params: {
          label: label,
          mirror: false,
          text_rotation,
        },
        inputs: [end],
        scale,
        rotation,
      },
    ];
  },
});
