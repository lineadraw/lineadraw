// Plan door — a hinged door LIVING ON a @lineadraw/floor-plan: click a
// wall to place it (it centres on the click), slide it along the wall with
// its diamond, resize it with the triangle at its strike side, flip the
// swing or the side it opens to with its buttons. The plan cuts the wall
// where the door says (its `expose`); deleting or copying the plan takes
// the door along.
//
// Needs Linea with hosted blocks (document version 24).
import { defineBlock } from "lineadraw";

type Pt = [number, number];
type Wall = { a: Pt; b: Pt; n: Pt; t: number; e: number };

export default defineBlock({
  id: "@lineadraw/plan-door",
  name: "Plan door",
  description:
    "A hinged door on a @lineadraw/floor-plan wall: cuts the wall, slides along it, flips swing and side.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["architecture", "plan", "door"],
  params: [
    {
      type: "string",
      name: "wall",
      label: "Wall",
      hint: 'The plan wall it sits on, by grid names ("1/A-B")',
      default: "",
    },
    {
      type: "number",
      name: "at",
      label: "Position",
      hint: "From the wall's start (its lower / left gridline) to the opening",
      default: 500,
      min: 0,
      suffix: "mm",
    },
    {
      type: "number",
      name: "width",
      label: "Width",
      default: 900,
      min: 500,
      max: 2400,
      suffix: "mm",
      presets: [800, 900, 1000, 1200],
    },
    {
      type: "enum",
      name: "swing",
      label: "Hinge",
      default: "start",
      display: "buttons",
      options: [
        { value: "start", label: "Start" },
        { value: "end", label: "End" },
      ],
    },
    {
      type: "enum",
      name: "side",
      label: "Opens to",
      default: "plus",
      display: "buttons",
      options: [
        { value: "plus", label: "Right / up" },
        { value: "minus", label: "Left / down" },
      ],
    },
  ],
  inputs: [
    {
      name: "plan",
      type: "host",
      label: "Click a plan wall",
      types: ["@lineadraw/floor-plan"],
    },
  ],

  // The hole the plan cuts.
  expose: ({ params }) => ({
    cut: { wall: params.wall, at: params.at, width: params.width },
  }),

  // The click on the plan → the nearest standing wall, centred on the click.
  attach: ({ host, point }) => nearestWall(host?.walls ?? {}, point, 900),

  handles: ({ params, host }) => {
    const w: Wall | undefined = host?.walls?.[params.wall];
    if (!w) return [];
    const g = frame(w);
    const side = params.side === "plus" ? 1 : -1;
    const flip = (patch: Record<string, string>) => () => ({ params: patch });
    return [
      {
        id: "at",
        label: "Door",
        at: g.at(params.at + params.width / 2, w.e),
        shape: "diamond",
        param: "at",
        along: {
          origin: g.at(params.width / 2, w.e),
          direction: g.u,
          min: 0,
          max: Math.max(0, g.len - params.width),
        },
        menu: ["width", "swing", "side"],
      },
      {
        id: "width",
        at: g.at(params.at + params.width, w.e),
        shape: "triangle",
        param: "width",
        along: { origin: g.at(params.at, w.e), direction: g.u, min: 500 },
      },
      {
        id: "swing",
        label: "Flip hinge",
        at: g.at(params.at + params.width / 2, w.e + side * (w.t / 2 + params.width * 0.35)),
        fixed: true,
        icon: "flip-horizontal",
        click: flip({ swing: params.swing === "start" ? "end" : "start" }),
      },
      {
        id: "side",
        label: "Open to the other side",
        at: g.at(params.at + params.width / 2, w.e - side * (w.t / 2 + 250)),
        fixed: true,
        icon: "flip-vertical",
        click: flip({ side: params.side === "plus" ? "minus" : "plus" }),
      },
    ];
  },

  draw: ({ params, host }) => {
    const w: Wall | undefined = host?.walls?.[params.wall];
    if (!w) return [];
    const g = frame(w);
    const s0 = params.at;
    const s1 = params.at + params.width;
    const side = params.side === "plus" ? 1 : -1;
    const face = w.e + (side * w.t) / 2;
    const [hingeS, strikeS] = params.swing === "start" ? [s0, s1] : [s1, s0];
    const hinge = g.at(hingeS, face);
    const strike = g.at(strikeS, face);
    const leafEnd: Pt = [
      hinge[0] + w.n[0] * side * params.width,
      hinge[1] + w.n[1] * side * params.width,
    ];
    // A quarter arc from the strike point to the open leaf, CCW.
    const a1 = Math.atan2(strike[1] - hinge[1], strike[0] - hinge[0]);
    const a2 = Math.atan2(leafEnd[1] - hinge[1], leafEnd[0] - hinge[0]);
    const ccw = (((a2 - a1) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const [startAngle, endAngle] = ccw < Math.PI ? [a1, a2] : [a2, a1];
    return [
      // Jambs across the cut wall.
      { type: "line", a: g.at(s0, w.e - w.t / 2), b: g.at(s0, w.e + w.t / 2) },
      { type: "line", a: g.at(s1, w.e - w.t / 2), b: g.at(s1, w.e + w.t / 2) },
      // The leaf, open, and its swing.
      { type: "line", a: hinge, b: leafEnd },
      { type: "arc", center: hinge, radius: params.width, startAngle, endAngle },
    ];
  },
});

/** Along-wall frame: `at(s, off)` = s mm from the wall's start, `off` mm
 * to its +side (right / up). */
const frame = (w: Wall) => {
  const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
  const u: Pt = [(w.b[0] - w.a[0]) / len, (w.b[1] - w.a[1]) / len];
  const at = (s: number, off: number): Pt => [
    w.a[0] + u[0] * s + w.n[0] * off,
    w.a[1] + u[1] * s + w.n[1] * off,
  ];
  return { len, u, at };
};

/** The standing wall nearest to `p`, with the opening centred on p. */
const nearestWall = (
  walls: Record<string, Wall>,
  p: { x: number; y: number },
  width: number,
) => {
  let best: { d: number; wall: string; at: number } | null = null;
  for (const [k, w] of Object.entries(walls)) {
    const { len, u } = frame(w);
    const s = (p.x - w.a[0]) * u[0] + (p.y - w.a[1]) * u[1];
    const c = Math.max(0, Math.min(len, s));
    const d = Math.hypot(w.a[0] + u[0] * c - p.x, w.a[1] + u[1] * c - p.y);
    if (!best || d < best.d)
      best = {
        d,
        wall: k,
        at: Math.round(Math.max(0, Math.min(len - width, s - width / 2))),
      };
  }
  return best ? { wall: best.wall, at: best.at } : {};
};
