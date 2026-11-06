// Title designer — the project/drawing strip of a sheet title block,
// 184 × 59.5 mm, inserted at its bottom-right corner. The layout is data:
// frame lines, captions (per language) and fields (one string param each).
import { defineBlock } from "lineadraw";
import type { TextInput } from "lineadraw";

/** Inner frame lines [x1, y1, x2, y2]. */
const lines = [
  [-94, 0, -94, 59.5],
  [-184, 17, 0, 17],
  [-184, 25.5, -94, 25.5],
  [-184, 34, -94, 34],
  [-94, 8.5, 0, 8.5],
  [-139, 17, -139, 34],
  [-37, 0, -37, 17],
  [-14, 0, -14, 8.5],
];

/** Captions at 1.5 mm: [x, y, English, Finnish]. */
const captions: [number, number, string, string][] = [
  [-183, 57, "PROJECT NAME", "KOHDE"],
  [-93, 57, "DRAWING CONTENT", "PIIRUSTUKSEN SISÄLTÖ"],
  [-20, 57, "SCALES", "MITTAKAAVAT"],
  [-183, 31.5, "DRAWER", "PIIRT."],
  [-138, 31.5, "DESIGNER", "SUUN."],
  [-183, 23, "CHECKER", "TARK."],
  [-138, 23, "DATE", "PVM"],
  [-93, 14.5, "PROJECT NUMBER", "TYÖNUMERO"],
  [-36, 14.5, "DESIGN GROUP", "S. ALA"],
  [-93, 6, "DWG. NO.", "PIIR. NRO."],
  [-36, 6, "PAGE", "SIVU"],
  [-13, 6, "REVISION", "MUUTOS"],
];

/** Fields: [param, label, x, y, text height, default]. */
const fields: [string, string, number, number, number, string][] = [
  ["project_name_1", "Name 1", -183, 52, 3.5, ""],
  ["project_name_2", "Name 2", -183, 46.5, 3.5, ""],
  ["project_name_3", "Name 3", -183, 41, 3.5, ""],
  ["project_name_4", "Name 4", -183, 35.5, 3.5, ""],
  ["drawing_content_1", "Content 1", -93, 52, 3.5, ""],
  ["drawing_content_2", "Content 2", -93, 46.5, 3.5, ""],
  ["drawing_content_3", "Content 3", -93, 41, 3.5, ""],
  ["drawing_content_4", "Content 4", -93, 35.5, 3.5, ""],
  ["drawing_content_5", "Content 5", -93, 30, 3.5, ""],
  ["scales_1", "Scales 1", -20, 52, 3.5, ""],
  ["scales_2", "Scales 2", -20, 46.5, 3.5, ""],
  ["drawer_name", "Drawer", -183, 27, 2.5, ""],
  ["designer_name", "Designer", -138, 27, 2.5, ""],
  ["checker_name", "Checker", -183, 18.5, 2.5, ""],
  ["date", "Date", -138, 18.5, 2.5, ""],
  ["project_number", "Project Num", -93, 10, 3.5, ""],
  ["design_group", "Design Group", -36, 10, 3.5, "STR"],
  ["drawing_number", "Dwg. Number", -93, 1.5, 3.5, ""],
  ["page", "Page", -36, 1.5, 3.5, ""],
  ["revision", "Revision", -13, 1.5, 3.5, ""],
];

const text = (
  x: number,
  y: number,
  content: string,
  textHeight: number,
): TextInput => ({
  type: "text",
  position: [x, y],
  content,
  hAlign: "left",
  vAlign: "bottom",
  styleOverride: { widthFactor: 0.8, textHeight },
});

export default defineBlock({
  id: "@lineadraw/title-designer",
  name: "Title designer",
  description:
    "Draws a sheet title block filled from text-field parameters: project, site, designer and drawing information.",
  // 1.1.0: text alignment is justification (AutoCAD meaning) since Linea
  // document v20 — values flipped so the text renders where it did.
  version: "1.1.1",
  authors: ["Linea Team"],
  tags: ["sheet", "title-block", "annotation", "layout"],
  params: [
    {
      name: "lang",
      label: "Language",
      type: "enum",
      options: [
        { value: "en", label: "English" },
        { value: "fi", label: "Finnish" },
      ],
      default: "en",
    },
    ...fields.map(([name, label, , , , value]) => ({
      name,
      label,
      type: "string" as const,
      default: value,
    })),
  ],
  draw: ({ params }) => {
    const lang = params.lang === "fi" ? 3 : 2;
    return [
      {
        type: "polyline",
        points: [
          [0, 0],
          [0, 59.5],
          [-184, 59.5],
          [-184, 0],
        ],
        closed: true,
      },
      ...lines.map(([x1, y1, x2, y2]) => ({
        type: "line" as const,
        a: [x1, y1] as [number, number],
        b: [x2, y2] as [number, number],
      })),
      ...captions.map((c) => text(c[0], c[1], c[lang], 1.5)),
      ...fields.map(([name, , x, y, h]) => text(x, y, String(params[name]), h)),
    ];
  },
});
