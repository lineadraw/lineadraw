// Drawing frame

import { defineBlock } from "lineadraw";

export default defineBlock({
  id: "@lineadraw/frame",
  name: "Drawing frame",
  description: "Draws a drawing frame.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["annotation", "drawing"],
  params: [
    {
      name: "size",
      label: "Size",
      type: "enum",
      default: "A4",
      options: [
        { value: "A1" },
        { value: "A2" },
        { value: "A3" },
        { value: "A4" },
        { value: "Custom" },
      ],
    },
    {
      name: "orientation",
      label: "Orientation",
      type: "enum",
      default: "Portrait",
      options: [{ value: "Portrait" }, { value: "Landscape" }],
    },
    {
      name: "width",
      label: "Width",
      type: "number",
      default: 210,
      min: 1,
    },
    {
      name: "height",
      label: "Height",
      type: "number",
      default: 297,
      min: 1,
    },
  ],
  paramVisibility: ({ params }) => {
    const { size } = params;
    return {
      orientation: size !== "Custom",
      width: size === "Custom",
      height: size === "Custom",
    };
  },
  draw: ({ params }) => {
    const { size, orientation, width, height } = params;

    let w = size === "Custom" ? width : 1;
    let h = size === "Custom" ? height : 1;

    if (size !== "Custom" && paperSizes[size]) {
      const paper = paperSizes[size];
      w = orientation === "Portrait" ? paper.w : paper.h;
      h = orientation === "Portrait" ? paper.h : paper.w;
    }

    return [
      {
        type: "polyline",
        points: [
          [5, 5],
          [w - 5, 5],
          [w - 5, h - 5],
          [5, h - 5],
        ],
        closed: true,
      },
    ];
  },
});

const paperSizes: Record<string, { w: number; h: number }> = {
  A1: { w: 594, h: 891 },
  A2: { w: 420, h: 594 },
  A3: { w: 297, h: 420 },
  A4: { w: 210, h: 297 },
};
