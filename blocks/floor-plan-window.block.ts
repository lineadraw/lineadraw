// Plan window — a window LIVING ON a @lineadraw/floor-plan. Click a wall
// to place it (it centres on the click). Drag its diamond anywhere: it
// snaps to the nearest standing wall on any gridline — slide it along a
// wall, across wall ends, or onto another wall. Resize it with the
// triangle. The plan cuts every wall the window overlaps (its `expose`);
// deleting or copying the plan takes the window along.
//
// Needs Linea with hosted blocks (document version 24).
import { defineBlock } from "lineadraw";

type Pt = [number, number];
/** A gridline as @lineadraw/floor-plan publishes it. */
type Line = {
  origin: Pt;
  u: Pt;
  n: Pt;
  segments: { from: number; to: number; t: number; e: number }[];
};

export default defineBlock({
  id: "@lineadraw/floor-plan-window",
  name: "Floor plan Window",
  description:
    "A window on a @lineadraw/floor-plan: cuts the wall, drags onto any wall, resizes along it.",
  version: "1.2.0",
  authors: ["Linea Team"],
  tags: ["architecture", "plan", "window"],
  params: [
    {
      type: "string",
      name: "line",
      label: "Gridline",
      hint: "The plan gridline it sits on (its label)",
      default: "",
    },
    {
      type: "number",
      name: "at",
      label: "Position",
      hint: "Along the gridline, from the plan origin to the opening",
      default: 500,
      suffix: "mm",
    },
    {
      type: "number",
      name: "width",
      label: "Width",
      default: 1200,
      min: 300,
      max: 12000,
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

  // Previews and thumbnails: a 3 m stretch of wall on a stand-in plan
  // (what a plan's `expose` would publish), the opening attached at its
  // middle; `preview: true` makes draw add the wall around the opening.
  previewHost: {
    preview: true,
    lines: {
      "1": {
        origin: [0, 0],
        u: [1, 0],
        n: [0, 1],
        segments: [{ from: -1500, to: 1500, t: 200, e: 0 }],
      },
    },
  },

  expose: ({ params }) => ({
    cut: { line: params.line, at: params.at, width: params.width },
  }),

  attach: ({ host, point, params }) =>
    place(host?.lines ?? {}, [point.x, point.y], params.width) ?? {},

  handles: ({ params, host }) => {
    const lines: Record<string, Line> = host?.lines ?? {};
    const line = lines[params.line];
    const seg = line && seat(line, params.at, params.width);
    if (!line || !seg) return [];
    const at = frame(line);
    return [
      {
        id: "move",
        label: "Window",
        at: at(params.at + params.width / 2, seg.e),
        shape: "diamond",
        // Free: snaps to the nearest wall on any gridline.
        drag: ({ point }: { point: { x: number; y: number } }) => {
          const p = place(lines, [point.x, point.y], params.width);
          return p ? { params: p } : undefined;
        },
        menu: ["width", "glass"],
      },
      {
        id: "width",
        at: at(params.at + params.width, seg.e),
        shape: "triangle",
        param: "width",
        along: { origin: at(params.at, seg.e), direction: line.u, min: 300 },
      },
    ];
  },

  draw: ({ params, host }) => {
    const line: Line | undefined = host?.lines?.[params.line];
    const seg = line && seat(line, params.at, params.width);
    if (!line || !seg) return [];
    const at = frame(line);
    const s0 = params.at;
    const s1 = params.at + params.width;
    const h = seg.t / 2;
    const gl = params.glass / 2;
    const along = (off: number) => ({
      type: "line" as const,
      a: at(s0, seg.e + off),
      b: at(s1, seg.e + off),
    });
    return [
      ...(host?.preview ? previewWall(at, seg, s0, s1) : []),
      // Jambs, the two wall faces across the opening, and the glass.
      { type: "line", a: at(s0, seg.e - h), b: at(s0, seg.e + h) },
      { type: "line", a: at(s1, seg.e - h), b: at(s1, seg.e + h) },
      along(-h),
      along(h),
      along(-gl),
      ...(gl > 0 ? [along(gl)] : []),
    ];
  },
});

/** Preview only: the wall either side of the opening (a real plan draws
 * its own walls). */
const previewWall = (
  at: (s: number, off: number) => Pt,
  seg: { from: number; to: number; t: number; e: number },
  s0: number,
  s1: number,
) => {
  const [lo, hi] = [seg.e - seg.t / 2, seg.e + seg.t / 2];
  const piece = (a: number, b: number) => [
    { type: "line" as const, a: at(a, lo), b: at(b, lo) },
    { type: "line" as const, a: at(a, hi), b: at(b, hi) },
    { type: "line" as const, a: at(a, lo), b: at(a, hi) },
  ];
  return [...piece(seg.from, s0), ...piece(seg.to, s1)];
};

/** `at(s, off)`: `s` mm along the gridline, `off` mm to its +side. */
const frame =
  (l: Line) =>
  (s: number, off: number): Pt => [
    l.origin[0] + l.u[0] * s + l.n[0] * off,
    l.origin[1] + l.u[1] * s + l.n[1] * off,
  ];

/** The wall segment the opening overlaps most — its thickness and
 * eccentricity are the ones the opening draws with. */
const seat = (l: Line, at: number, width: number) => {
  let best: (Line["segments"][number] & { overlap: number }) | null = null;
  for (const s of l.segments) {
    const overlap = Math.min(s.to, at + width) - Math.max(s.from, at);
    if (overlap > 0 && (!best || overlap > best.overlap))
      best = { ...s, overlap };
  }
  return best;
};

/** The standing wall nearest to `p` on any gridline → the gridline and the
 * opening's start, centred on p and kept within the walls on that line. */
const place = (lines: Record<string, Line>, p: Pt, width: number) => {
  let best: { d: number; line: string; at: number } | null = null;
  for (const [name, l] of Object.entries(lines)) {
    if (l.segments.length === 0) continue;
    const s = (p[0] - l.origin[0]) * l.u[0] + (p[1] - l.origin[1]) * l.u[1];
    const off = (p[0] - l.origin[0]) * l.n[0] + (p[1] - l.origin[1]) * l.n[1];
    for (const seg of l.segments) {
      const along = Math.max(seg.from, Math.min(seg.to, s));
      const d = Math.hypot(along - s, off - seg.e);
      if (!best || d < best.d) {
        const lo = Math.min(...l.segments.map((x) => x.from));
        const hi = Math.max(...l.segments.map((x) => x.to));
        best = {
          d,
          line: name,
          at: Math.round(Math.max(lo, Math.min(hi - width, s - width / 2))),
        };
      }
    }
  }
  return best ? { line: best.line, at: best.at } : null;
};
