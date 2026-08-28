// Drawing frame

import { defineBlock } from "lineadraw";

export default defineBlock({
  id: "@lineadraw/frame",
  name: "Drawing frame",
  description: "Draws a drawing frame.",
  version: "1.2.0",
  authors: ["Linea Team"],
  tags: ["sheet", "frame", "annotation", "drawing"],
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
        { value: "xA4", label: "Multiple of A4" },
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
    {
      name: "x",
      label: "N in width",
      type: "number",
      default: 1,
      min: 1,
    },
    {
      name: "y",
      label: "N in height",
      type: "number",
      default: 1,
      min: 1,
    },
    {
      name: "m",
      label: "Margin",
      type: "number",
      default: 5,
    },
    {
      name: "showSeparators",
      label: "Show ticks",
      type: "boolean",
      default: true,
    },
    {
      name: "showOuter",
      label: "Show outer",
      type: "boolean",
      default: false,
    },
  ],
  paramVisibility: ({ params }) => {
    const { size } = params;
    return {
      orientation: size !== "Custom" && size !== "xA4",
      width: size === "Custom",
      height: size === "Custom",
      x: size === "xA4",
      y: size === "xA4",
      showSeparators: size === "xA4",
    };
  },
  draw: ({ params }) => {
    const {
      size,
      orientation,
      width,
      height,
      x,
      y,
      m,
      showSeparators,
      showOuter,
    } = params;

    let w = 20;
    let h = 20;
    const separators: Line[] = [];

    if (size === "Custom") {
      w = width;
      h = height;
    } else if (size === "xA4") {
      w = 210 * x;
      h = 297 * y;

      for (let i = 1; i < x; i++) {
        const x = i * 210;
        separators.push(
          { type: "line", a: [x, 0], b: [x, m] },
          { type: "line", a: [x, h], b: [x, h - m] },
        );
      }
      for (let i = 1; i < y; i++) {
        const y = i * 297;
        separators.push(
          { type: "line", a: [0, y], b: [m, y] },
          { type: "line", a: [w, y], b: [w - m, y] },
        );
      }
    } else if (paperSizes[size]) {
      const paper = paperSizes[size];
      w = orientation === "Portrait" ? paper.w : paper.h;
      h = orientation === "Portrait" ? paper.h : paper.w;
    }

    return [
      ...(showOuter
        ? [
            {
              type: "polyline",
              points: [
                [0, 0],
                [w, 0],
                [w, h],
                [0, h],
              ],
              closed: true,
            } as Polyline,
          ]
        : []),
      {
        type: "polyline",
        points: [
          [m, m],
          [w - m, m],
          [w - m, h - m],
          [m, h - m],
        ],
        closed: true,
      },
      ...(showSeparators ? separators : []),
    ];
  },
});

const paperSizes: Record<string, { w: number; h: number }> = {
  A1: { w: 594, h: 841 },
  A2: { w: 420, h: 594 },
  A3: { w: 297, h: 420 },
  A4: { w: 210, h: 297 },
};
