import { defineBlock } from "lineadraw";

export default defineBlock({
  id: "84088ce6-e8a5-4ea7-8f11-3d6fce0ef167",
  name: "Grid",
  description: "Draws a grid of axes",
  version: "1.0.0",
  authors: ["Lineadraw Team"],
  tags: ["architecture", "structural", "axis"],
  params: [
    {
      type: "string",
      name: "xs",
      label: "X positions",
      default: "0 2*7200",
    },
    {
      type: "string",
      name: "ys",
      label: "Y positions",
      default: "0 2*6000",
    },
    {
      type: "string",
      name: "xLabels",
      label: "X labels",
      default: "A B",
    },
    {
      type: "string",
      name: "yLabels",
      label: "Y labels",
      default: "1 2",
    },
  ],
  draw: ({ params }) => {
    const { xs, ys, xLabels, yLabels } = params;
    return [
      {
        type: "block",
        definitionId: "2ee7ebef-052e-44ca-a576-0acd0d45d6ac",
        inputs: [
          [0, 0],
          [100, 0]
        ]
      }
    ];
  },
});
