// PVL
import { defineBlock } from "lineadraw";

export default defineBlock({
  id: "@lineadraw/pvl",
  name: "PVL",
  description: "Draws a Peikko PVL connection loop.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "connection", "pvl"],
  params: [
    {
      name: "view",
      label: "View",
      type: "enum",
      default: "top",
      options: [
        { value: "front", label: "Front" },
        { value: "left", label: "Left" },
        { value: "right", label: "Right" },
        { value: "top", label: "Top" },
      ],
    },
    {
      name: "size",
      label: "Size",
      type: "enum",
      default: "pvl80",
      options: [
        { value: "pvl80", label: "PVL80" },
        { value: "pvl100", label: "PVL100" },
        { value: "pvl120", label: "PVL120" },
      ],
    },
    {
      name: "bending",
      label: "Bending",
      type: "enum",
      default: "straight",
      options: [
        { value: "left90", label: "Left 90°" },
        { value: "left45", label: "Left 45°" },
        { value: "straight", label: "Straight" },
        { value: "right45", label: "Right 45°" },
        { value: "right90", label: "Right 90°" },
      ],
    },
  ],
  draw: () => {
    return [
      {
        type: "circle",
        center: [0, 0],
        radius: 10,
      },
    ];
  },
});
