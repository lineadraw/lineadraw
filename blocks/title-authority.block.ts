// Title authority
import { defineBlock } from "lineadraw";

const style1: Partial<Text> = {
  hAlign: "right",
  vAlign: "top",
  styleOverride: { widthFactor: 0.8, textHeight: 1.5 },
};

const style2: Partial<Text> = {
  hAlign: "right",
  vAlign: "top",
  styleOverride: { widthFactor: 0.8, textHeight: 3.5 },
};

const lang_labels = {
  en: {
    dist_vill: "DISTRICT/VILLAGE",
    block_estate: "BLOCK/ESTATE",
    building_lot: "BUILDING LOT",
    auth_notes: "AUTHORIZATION NOTES",
    building_action: "BUILDING ACTION",
    drawing_category: "DRAWING CATEGORY",
    archiving_code: "ARCHIVING CODE",
  },
  fi: {
    dist_vill: "K.OSA/KYLÄ",
    block_estate: "KORTTELI/TILA",
    building_lot: "TONTTI/RNRO",
    auth_notes: "RAKENNUSLUVAN TUNNUS",
    building_action: "RAKENNUSTOIMENPIDE",
    drawing_category: "PIIRUSTUSLAJI",
    archiving_code: "JUOKSEVA NRO",
  },
};

export default defineBlock({
  id: "@lineadraw/title-authority",
  name: "Title authority",
  description:
    "Draws a sheet title block filled from text-field authority parameters",
  version: "1.0.0",
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
    {
      name: "dist_vill",
      label: "District/Village",
      type: "string",
      default: "",
    },
    {
      name: "block_estate",
      label: "Block/Estate",
      type: "string",
      default: "",
    },
    {
      name: "building_lot",
      label: "Building Lot",
      type: "string",
      default: "",
    },
    {
      name: "auth_notes",
      label: "Auth Notes",
      type: "string",
      default: "",
    },
    {
      name: "building_action",
      label: "Build Action",
      type: "string",
      default: "NEW BUILDING",
    },
    {
      name: "drawing_category",
      label: "Drawing cat.",
      type: "string",
      default: "STRUCTURAL DRAWING",
    },
    {
      name: "archiving_code",
      label: "Code",
      type: "string",
      default: "",
    },
  ],
  draw: ({ params }) => {
    const {
      lang,
      dist_vill,
      block_estate,
      building_lot,
      auth_notes,
      building_action,
      drawing_category,
      archiving_code,
    } = params;
    const labels = lang_labels[lang] ?? lang_labels["en"];
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
      {
        type: "line",
        a: [-184, 8.5],
        b: [0, 8.5],
      },
      {
        type: "line",
        a: [-94, 0],
        b: [-94, 17],
      },
      {
        type: "line",
        a: [-21, 0],
        b: [-21, 8.5],
      },
      {
        type: "text",
        position: [-183, 14.5],
        content: labels.dist_vill,
        ...style1,
      },
      {
        type: "text",
        position: [-183, 9.5],
        content: dist_vill,
        ...style2,
      },
      {
        type: "text",
        position: [-153, 14.5],
        content: labels.block_estate,
        ...style1,
      },
      {
        type: "text",
        position: [-153, 9.5],
        content: block_estate,
        ...style2,
      },
      {
        type: "text",
        position: [-123, 14.5],
        content: labels.building_lot,
        ...style1,
      },
      {
        type: "text",
        position: [-123, 9.5],
        content: building_lot,
        ...style2,
      },
      {
        type: "text",
        position: [-93, 14.5],
        content: labels.auth_notes,
        ...style1,
      },
      {
        type: "text",
        position: [-93, 9.5],
        content: auth_notes,
        ...style2,
      },
      {
        type: "text",
        position: [-183, 6],
        content: labels.building_action,
        ...style1,
      },
      {
        type: "text",
        position: [-183, 1],
        content: building_action,
        ...style2,
      },
      {
        type: "text",
        position: [-93, 6],
        content: labels.drawing_category,
        ...style1,
      },
      {
        type: "text",
        position: [-93, 1],
        content: drawing_category,
        ...style2,
      },
      {
        type: "text",
        position: [-20, 6],
        content: labels.archiving_code,
        ...style1,
      },
      {
        type: "text",
        position: [-20, 1],
        content: archiving_code,
        ...style2,
      },
    ];
  },
});
