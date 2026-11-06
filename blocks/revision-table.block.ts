// Revision table — 184 mm wide, inserted at its bottom-right corner: a
// caption row, then one 4.5 mm row per filled revision (up to the last
// one with a "Revision" value). The panel shows one revision's fields at a
// time, picked with "Current rev".
import { defineBlock, type ParamDef, type TextInput } from "lineadraw";
import { range } from "lineadraw/helpers";

const MAX_NUM = 9;

/** Columns: [param prefix, label, left edge x, English, Finnish]. */
const columns: [string, string, number, string, string][] = [
  ["rev", "Revision", -184, "REV.", "REV."],
  ["change", "Change", -174, "CHANGE", "MUUTOS"],
  ["date", "Date", -40, "DATE", "PVM"],
  ["changed_by", "Changed by", -20, "CHANGED BY", "MUUTTANUT"],
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
  id: "@lineadraw/revision-table",
  name: "Revision table",
  description: "Draws a revision table",
  // 1.2.0: text alignment is justification (AutoCAD meaning) since Linea
  // document v20 — values flipped so the text renders where it did.
  version: "1.2.1",
  authors: ["Linea Team"],
  tags: ["sheet", "title-block", "annotation", "layout"],
  params: () => [
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
    {
      name: "current",
      label: "Current rev",
      type: "enum",
      options: range(MAX_NUM).map((i) => ({
        value: `${i + 1}`,
        label: `${i + 1}`,
      })),
      default: "1",
    },
    ...range(MAX_NUM).flatMap((i) =>
      columns.map(([prefix, label]): ParamDef => ({
        name: prefix + (i + 1),
        label,
        type: "string",
        default: "",
      })),
    ),
  ],
  paramVisibility: ({ params }) =>
    Object.fromEntries(
      range(MAX_NUM)
        .filter((i) => i + 1 !== parseInt(params.current))
        .flatMap((i) => columns.map(([prefix]) => [prefix + (i + 1), false])),
    ),
  draw: ({ params }) => {
    const lang = params.lang === "fi" ? 4 : 3;
    let num = 0;
    for (let i = 1; i <= MAX_NUM; i++) if (params["rev" + i]) num = i;
    const h = num * 4.5 + 3.5;
    return [
      {
        type: "polyline",
        points: [
          [0, 0],
          [0, h],
          [-184, h],
          [-184, 0],
        ],
        closed: true,
      },
      ...columns.slice(1).map(([, , x]) => ({
        type: "line" as const,
        a: [x, 0] as [number, number],
        b: [x, h] as [number, number],
      })),
      ...range(num).map((i) => ({
        type: "line" as const,
        a: [-184, i * 4.5 + 3.5] as [number, number],
        b: [0, i * 4.5 + 3.5] as [number, number],
      })),
      ...columns.map((c) => text(c[2] + 1, 1, c[lang], 1.5)),
      ...range(num).flatMap((i) =>
        columns.map(([prefix, , x]) =>
          text(x + 1, (i + 1) * 4.5, String(params[prefix + (i + 1)]), 2.5),
        ),
      ),
    ];
  },
});
