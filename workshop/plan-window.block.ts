// Plan window — a window LIVING ON a @lineadraw/floor-plan: click a wall to
// place it (it centres on the click), slide it along the wall with its
// diamond, resize it with the triangle at its end. The plan cuts the wall
// where the window says (its `expose`); deleting or copying the plan takes
// the window along.
//
// Needs Linea with hosted blocks (document version 24).
import { defineBlock } from "lineadraw";

type Pt = [number, number];
type Wall = { a: Pt; b: Pt; n: Pt; t: number; e: number };

export default defineBlock({
  id: "@lineadraw/plan-window",
  name: "Plan window",
  description:
    "A window on a @lineadraw/floor-plan wall: cuts the wall, draws the glass, slides and resizes along it.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["architecture", "plan", "window"],
  params: [
    {
      type: "string",
      name: "wall",
      label: "Wall",
      hint: 'The plan wall it sits on, by grid names ("C/1-2")',
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
      default: 1200,
      min: 300,
      max: 6000,
      suffix: "mm",
      presets: [600, 900, 1200, 1500, 1800],
    },
    {
      type: "number",
      name: "glass",
      label: "Glass gap",
      hint: "Distance between the two glass lines",
      default: 60,
      min: 0,
      suffix: "mm",
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

  expose: ({ params }) => ({
    cut: { wall: params.wall, at: params.at, width: params.width },
  }),

  attach: ({ host, point }) => nearestWall(host?.walls ?? {}, point, 1200),

  handles: ({ params, host }) => {
    const w: Wall | undefined = host?.walls?.[params.wall];
    if (!w) return [];
    const g = frame(w);
    return [
      {
        id: "at",
        label: "Window",
        at: g.at(params.at + params.width / 2, w.e),
        shape: "diamond",
        param: "at",
        along: {
          origin: g.at(params.width / 2, w.e),
          direction: g.u,
          min: 0,
          max: Math.max(0, g.len - params.width),
        },
        menu: ["width", "glass"],
      },
      {
        id: "width",
        at: g.at(params.at + params.width, w.e),
        shape: "triangle",
        param: "width",
        along: { origin: g.at(params.at, w.e), direction: g.u, min: 300 },
      },
    ];
  },

  draw: ({ params, host }) => {
    const w: Wall | undefined = host?.walls?.[params.wall];
    if (!w) return [];
    const g = frame(w);
    const s0 = params.at;
    const s1 = params.at + params.width;
    const h = w.t / 2;
    const gl = params.glass / 2;
    const along = (off: number) => ({
      type: "line" as const,
      a: g.at(s0, w.e + off),
      b: g.at(s1, w.e + off),
    });
    return [
      // Jambs, the two wall faces across the opening, and the glass.
      { type: "line", a: g.at(s0, w.e - h), b: g.at(s0, w.e + h) },
      { type: "line", a: g.at(s1, w.e - h), b: g.at(s1, w.e + h) },
      along(-h),
      along(h),
      along(-gl),
      ...(gl > 0 ? [along(gl)] : []),
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
