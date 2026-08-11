// Door swing — plan symbol: the leaf drawn open at the given angle and
// the swing arc from the strike point to the leaf end. Picked along the
// opening: hinge first, then the strike side.
import { defineBlock } from "lineadraw";
import { add, dist, norm, rotate, scale as sc, sub, toRad } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/door",
  name: "Door",
  description: "Draws a door swing (leaf + arc) across a wall opening.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["architecture", "plan", "door"],
  params: [
    {
      name: "swing",
      label: "Swing",
      type: "enum",
      default: "left",
      options: [
        { value: "left", label: "Left of opening direction" },
        { value: "right", label: "Right of opening direction" },
      ],
    },
    { name: "angle", label: "Opening angle", type: "number", default: 90, min: 10, max: 180 },
  ],
  place: ["Hinge point", "Strike point"],
  previewInputs: [
    [0, 0],
    [900, 0],
  ],
  draw: ({ params, inputs: [hinge, strike] }) => {
    const w = dist(hinge, strike);
    if (w < 1e-9) return [];
    const d = norm(sub(strike, hinge));
    const s = params.swing === "left" ? 1 : -1;
    const theta = toRad(params.angle);
    const a0 = Math.atan2(d.y, d.x);
    const leafEnd = add(hinge, rotate(sc(d, w), s * theta));

    return [
      { type: "line", a: hinge, b: leafEnd },
      {
        type: "arc",
        center: hinge,
        radius: w,
        startAngle: s > 0 ? a0 : a0 - theta,
        endAngle: s > 0 ? a0 + theta : a0,
      },
    ];
  },
});
