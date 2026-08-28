import { defineBlock, type ParamDef } from "lineadraw";
import { range } from "lineadraw/helpers";

const style1: Partial<Text> = {
  hAlign: "right",
  vAlign: "top",
  styleOverride: { widthFactor: 0.8, textHeight: 1.5 },
};

const style2: Partial<Text> = {
  hAlign: "right",
  vAlign: "top",
  styleOverride: { widthFactor: 0.8, textHeight: 2.5 },
};

const lang_labels = {
  en: {
    rev: "REV.",
    change: "CHANGE",
    date: "DATE",
    changed_by: "CHANGED BY",
  },
  fi: {
    rev: "REV.",
    change: "MUUTOS",
    date: "PVM",
    changed_by: "MUUTTANUT",
  },
};

const MAX_NUM = 9;

export default defineBlock({
  id: "@lineadraw/revision-table",
  name: "Revision table",
  description: "Draws a revision table",
  version: "1.1.0",
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
      options: [
        ...range(MAX_NUM).map((i) => ({
          value: `${i + 1}`,
          label: `${i + 1}`,
        })),
      ],
      default: "1",
    },
    ...range(MAX_NUM).flatMap((i) => [
      {
        name: "rev" + (i + 1),
        label: "Revision",
        type: "string",
        default: "",
      } as ParamDef,
      {
        name: "change" + (i + 1),
        label: "Change",
        type: "string",
        default: "",
      } as ParamDef,
      {
        name: "date" + (i + 1),
        label: "Date",
        type: "string",
        default: "",
      } as ParamDef,
      {
        name: "changed_by" + (i + 1),
        label: "Changed by",
        type: "string",
        default: "",
      } as ParamDef,
    ]),
  ],
  paramVisibility: ({ params }) => {
    const result: Record<string, boolean> = {};
    for (let i = 1; i <= MAX_NUM; i++) {
      if (i !== parseInt(params.current)) {
        result["rev" + i] = false;
        result["change" + i] = false;
        result["date" + i] = false;
        result["changed_by" + i] = false;
      }
    }
    return result;
  },
  draw: ({ params }) => {
    const { lang } = params;
    const labels = lang_labels[lang] ?? lang_labels["en"];
    let num = 0;
    for (let i = 1; i <= MAX_NUM; i++) {
      if (params["rev" + i]) num = Math.max(num, i);
    }
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
      {
        type: "line",
        a: [-174, 0],
        b: [-174, h],
      },
      {
        type: "line",
        a: [-40, 0],
        b: [-40, h],
      },
      {
        type: "line",
        a: [-20, 0],
        b: [-20, h],
      },
      ...range(num).map(
        (i) =>
          ({
            type: "line",
            a: [-184, i * 4.5 + 3.5],
            b: [0, i * 4.5 + 3.5],
          }) as Line,
      ),
      {
        type: "text",
        position: [-183, 1],
        content: labels.rev,
        ...style1,
      },
      {
        type: "text",
        position: [-173, 1],
        content: labels.change,
        ...style1,
      },
      {
        type: "text",
        position: [-39, 1],
        content: labels.date,
        ...style1,
      },
      {
        type: "text",
        position: [-19, 1],
        content: labels.changed_by,
        ...style1,
      },
      ...range(num).flatMap((i) => [
        {
          type: "text",
          position: [-183, (i + 1) * 4.5],
          content: params["rev" + (i + 1)] ?? "te",
          ...style2,
        } as Text,
        {
          type: "text",
          position: [-173, (i + 1) * 4.5],
          content: params["change" + (i + 1)] ?? "te",
          ...style2,
        } as Text,
        {
          type: "text",
          position: [-39, (i + 1) * 4.5],
          content: params["date" + (i + 1)] ?? "te",
          ...style2,
        } as Text,
        {
          type: "text",
          position: [-19, (i + 1) * 4.5],
          content: params["changed_by" + (i + 1)] ?? "te",
          ...style2,
        } as Text,
      ]),
    ];
  },
});
