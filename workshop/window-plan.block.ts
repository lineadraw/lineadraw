// Window (plan) — a window in a wall opening: jamb lines across the wall
// thickness (on the LEFT of the pick direction), wall-face lines between
// them, and single or double glazing lines.
import { defineBlock } from "lineadraw";
import { add, dist, norm, scale as sc, sub } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/window-plan",
  name: "Window (plan)",
  description: "Draws a window symbol across a wall opening in plan.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["architecture", "plan", "window"],
  params: [
    { name: "thickness", label: "Wall thickness", type: "number", default: 200, min: 1 },
    {
      name: "glazing",
      label: "Glazing",
      type: "enum",
      default: "single",
      options: [
        { value: "single", label: "Single line" },
        { value: "double", label: "Double line" },
      ],
    },
  ],
  place: ["Jamb point 1", "Jamb point 2"],
  previewInputs: [
    [0, 0],
    [1200, 0],
  ],
  draw: ({ params, inputs: [p1, p2] }) => {
    const { thickness } = params;
    const length = dist(p1, p2);
    if (length < 1e-9) return [];
    const d = norm(sub(p2, p1));
    const n = { x: -d.y, y: d.x }; // left of p1→p2
    const at = (t: number, w: number) => add(add(p1, sc(d, t)), sc(n, w));

    const out: ModelObject[] = [
      { type: "line", a: at(0, 0), b: at(0, thickness) },
      { type: "line", a: at(length, 0), b: at(length, thickness) },
      { type: "line", a: at(0, 0), b: at(length, 0) },
      { type: "line", a: at(0, thickness), b: at(length, thickness) },
    ];
    if (params.glazing === "single")
      out.push({ type: "line", a: at(0, thickness / 2), b: at(length, thickness / 2) });
    else {
      out.push({ type: "line", a: at(0, thickness / 2 - 15), b: at(length, thickness / 2 - 15) });
      out.push({ type: "line", a: at(0, thickness / 2 + 15), b: at(length, thickness / 2 + 15) });
    }
    return out;
  },
});
