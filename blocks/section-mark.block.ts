// Section mark

import { defineBlock } from "lineadraw";

export default defineBlock({
  id: "@lineadraw/section-mark",
  name: "Section mark",
  description: "Draws a section mark with a label",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["architecture", "structural", "section", "annotation"],
  params: [
    {
      name: "label",
      label: "Label",
      type: "string",
      default: "A",
    },
    {
      name: "mirror",
      label: "Mirror",
      type: "boolean",
      default: false,
    },
  ],
  draw: ({ params }) => {
    const { label, mirror } = params;
    const k = mirror ? -1 : 1;
    return [
      {
        type: "polyline",
        points: [
          [0, 0],
          [7 * k, 0],
          [7 * k, 7],
          [8.5 * k, 4],
        ],
      },
      {
        type: "text",
        position: [3.5 * k, 3.5],
        content: label,
      },
    ];
  },
});
