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

/** Captions at 1.5 mm: [x, y (top), English, Finnish]. */
const captions: [number, number, string, string][] = [
  [-183, 58.5, "PROJECT NAME", "KOHDE"],
  [-93, 58.5, "DRAWING CONTENT", "PIIRUSTUKSEN SISÄLTÖ"],
  [-20, 58.5, "SCALES", "MITTAKAAVAT"],
  [-183, 33, "DRAWER", "PIIRT."],
  [-138, 33, "DESIGNER", "SUUN."],
  [-183, 24.5, "CHECKER", "TARK."],
  [-138, 24.5, "DATE", "PVM"],
  [-93, 16, "PROJECT NUMBER", "TYÖNUMERO"],
  [-36, 16, "DESIGN GROUP", "S. ALA"],
  [-93, 7.5, "DWG. NO.", "PIIR. NRO."],
  [-36, 7.5, "PAGE", "SIVU"],
  [-13, 7.5, "REVISION", "MUUTOS"],
];

/** Fields: [param, label, x, y (top of the text), text height, default,
 *  multiline]. */
const fields: [string, string, number, number, number, string, boolean?][] = [
  ["project_name", "Project name", -183, 56, 3.5, "", true],
  ["drawing_content", "Drawing content", -93, 56, 3.5, "", true],
  ["scales", "Scales", -20, 56, 3.5, "", true],
  ["drawer_name", "Drawer", -183, 29.5, 2.5, ""],
  ["designer_name", "Designer", -138, 29.5, 2.5, ""],
  ["checker_name", "Checker", -183, 21, 2.5, ""],
  ["date", "Date", -138, 21, 2.5, ""],
  ["project_number", "Project Num", -93, 13.5, 3.5, ""],
  ["design_group", "Design Group", -36, 13.5, 3.5, "STR"],
  ["drawing_number", "Dwg. Number", -93, 5, 3.5, ""],
  ["page", "Page", -36, 5, 3.5, ""],
  ["revision", "Revision", -13, 5, 3.5, ""],
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
  vAlign: "top",
  styleOverride: { widthFactor: 0.8, textHeight },
});

export default defineBlock({
  id: "@lineadraw/title",
  name: "Title",
  description:
    "Draws a sheet title block filled from text-field parameters: project, site, designer and drawing information.",
  // 2.0.0: project name, drawing content and scales are one multiline
  // field each (were numbered single-line fields); all text hangs from its
  // top edge.
  version: "2.0.0",
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
    ...fields.map(([name, label, , , , value, multiline]) => ({
      name,
      label,
      type: "string" as const,
      default: value,
      ...(multiline && { multiline }),
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
