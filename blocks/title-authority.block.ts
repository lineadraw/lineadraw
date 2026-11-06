// Title authority — the permit strip of a sheet title block, 184 × 17 mm,
// inserted at its bottom-right corner. The layout is data: frame lines,
// captions (per language) and fields (one string param each).
import { defineBlock } from "lineadraw";
import type { TextInput } from "lineadraw";

/** Inner frame lines [x1, y1, x2, y2]. */
const lines = [
  [-184, 8.5, 0, 8.5],
  [-94, 0, -94, 17],
  [-21, 0, -21, 8.5],
];

/** Captions at 1.5 mm: [x, y, English, Finnish]. */
const captions: [number, number, string, string][] = [
  [-183, 14.5, "DISTRICT/VILLAGE", "K.OSA/KYLÄ"],
  [-153, 14.5, "BLOCK/ESTATE", "KORTTELI/TILA"],
  [-123, 14.5, "BUILDING LOT", "TONTTI/RNRO"],
  [-93, 14.5, "AUTHORIZATION NOTES", "RAKENNUSLUVAN TUNNUS"],
  [-183, 6, "BUILDING ACTION", "RAKENNUSTOIMENPIDE"],
  [-93, 6, "DRAWING CATEGORY", "PIIRUSTUSLAJI"],
  [-20, 6, "ARCHIVING CODE", "JUOKSEVA NRO"],
];

/** Fields: [param, label, x, y, text height, default]. */
const fields: [string, string, number, number, number, string][] = [
  ["dist_vill", "District/Village", -183, 9.5, 3.5, ""],
  ["block_estate", "Block/Estate", -153, 9.5, 3.5, ""],
  ["building_lot", "Building Lot", -123, 9.5, 3.5, ""],
  ["auth_notes", "Auth Notes", -93, 9.5, 3.5, ""],
  ["building_action", "Build Action", -183, 1, 3.5, "NEW BUILDING"],
  ["drawing_category", "Drawing cat.", -93, 1, 3.5, "STRUCTURAL DRAWING"],
  ["archiving_code", "Code", -20, 1, 3.5, ""],
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
  id: "@lineadraw/title-authority",
  name: "Title authority",
  description:
    "Draws a sheet title block filled from text-field authority parameters",
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
          [0, 17],
          [-184, 17],
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
