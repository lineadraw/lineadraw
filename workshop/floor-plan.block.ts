// Floor plan — walls on a grid. The grid is Tekla-style positions ("0 4200
// 3600") with auto-incrementing labels, like the Grid block. Every grid
// segment is a wall, keyed by grid names: "A/1-2" is the wall on gridline A
// between 1 and 2, "1/A-B" the one on gridline 1 between A and B.
// Per-wall thickness, eccentricity and on/off live in the `walls` data
// param as sparse overrides, edited from each wall's hover menu.
//
// Doors and windows are their own blocks (@lineadraw/plan-door,
// @lineadraw/plan-window) LIVING ON the plan: the plan publishes its wall
// geometry through `expose`, each opening publishes the hole it needs, and
// the plan cuts its walls where `hosted` says. Corners and T-junctions join
// cleanly: each wall end runs to the far face of the walls across it, and
// the solids are unioned before hatching.
//
// Needs Linea with hosted blocks (document version 24): input tables,
// handles, `data` params, `expose` / `hosted`, union / difference.
import { defineBlock } from "lineadraw";
import { difference, union } from "lineadraw/helpers";

/** A wall's override in the `walls` data param (absent = the defaults). */
type WallOverride = { t?: number; e?: number; off?: boolean };

type Pt = [number, number];

/** One wall as the plan publishes it (plan-local mm). `a` → `b` runs along
 * the gridline; `n` is its +side (right for vertical walls, up for
 * horizontal ones) — the eccentricity `e` moves the wall that way. */
type WallGeom = {
  a: Pt;
  b: Pt;
  n: Pt;
  t: number;
  e: number;
  off: boolean;
};

/** What openings publish (their `expose`): a hole along wall `wall`,
 * `at` mm from its start, `width` mm long. */
type Cut = { wall: string; at: number; width: number };

export default defineBlock({
  id: "@lineadraw/floor-plan",
  name: "Floor plan",
  description:
    "Walls on a grid, with per-wall thickness, eccentricity and on/off from each wall's hover menu. Hosts @lineadraw/plan-door and @lineadraw/plan-window, which cut its walls.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["architecture", "plan", "wall", "floor plan"],
  params: [
    { type: "label", name: "gridHeading", label: "Grid" },
    {
      type: "numberList",
      name: "xs",
      label: "X positions",
      hint: 'Relative distances, Tekla-style: "0 4200 3600" or "0 2*3600"',
      default: [0, 4200, 3600],
      min: 0,
    },
    {
      type: "numberList",
      name: "ys",
      label: "Y positions",
      default: [0, 3600, 3000],
      min: 0,
    },
    {
      type: "stringList",
      name: "xLabels",
      label: "X labels",
      hint: "The last label keeps incrementing: A → B, C…",
      default: ["A"],
    },
    { type: "stringList", name: "yLabels", label: "Y labels", default: ["1"] },
    {
      type: "boolean",
      name: "showGrid",
      label: "Show grid",
      default: true,
    },
    {
      type: "number",
      name: "bubble",
      label: "Bubble size",
      default: 400,
      min: 50,
      suffix: "mm",
    },
    { type: "label", name: "wallHeading", label: "Walls" },
    {
      type: "number",
      name: "thickness",
      label: "Thickness",
      hint: "Default wall thickness; a wall's hover menu overrides it",
      default: 200,
      min: 20,
      suffix: "mm",
    },
    {
      type: "number",
      name: "eccentricity",
      label: "Eccentricity",
      hint: "Default offset of walls from their gridline (right / up positive)",
      default: 0,
      suffix: "mm",
    },
    {
      type: "hatchPattern",
      name: "hatch",
      label: "Hatch",
      default: "ANSI31",
    },
    {
      type: "number",
      name: "hatchScale",
      label: "Hatch scale",
      default: 20,
      min: 0.01,
    },
    { type: "data", name: "walls", default: {} as Record<string, WallOverride> },
  ],
  inputs: [{ name: "origin", type: "point", label: "Plan origin (grid A/1)" }],
  previewInputs: { origin: [0, 0] },

  // What doors and windows read: the walls that stand, by grid name.
  expose: ({ params }) => {
    const walls: Record<string, WallGeom> = {};
    for (const [k, w] of Object.entries(wallTable(params)))
      if (!w.off) walls[k] = w;
    return { walls };
  },

  handles: ({ params }) => {
    const { xs, ys, xl, yl } = gridOf(params);
    const walls = wallTable(params);
    const ext = gridExtent(params);
    return [
      // Every wall — the disabled ones too, so they can come back.
      ...Object.entries(walls).map(([k, w]) => {
        const [a, b] = centerline(w);
        const set = (patch: WallOverride) => ({
          params: {
            walls: { ...params.walls, [k]: { ...params.walls[k], ...patch } },
          },
        });
        return {
          id: `wall:${k}`,
          label: `Wall ${k}`,
          kind: "line" as const,
          from: a,
          to: b,
          fixed: true,
          menu: [
            {
              field: { type: "boolean", label: "Enabled" },
              value: !w.off,
              set: (on: boolean) => set({ off: !on }),
            },
            {
              field: { type: "number", label: "Thickness", min: 20, suffix: "mm" },
              value: w.t,
              set: (t: number) => set({ t }),
            },
            {
              field: { type: "number", label: "Eccentricity", suffix: "mm" },
              value: w.e,
              set: (e: number) => set({ e }),
            },
          ],
          actions: [
            {
              label: "Reset to defaults",
              icon: "refresh-cw" as const,
              run: () => {
                const { [k]: _, ...rest } = params.walls;
                return { params: { walls: rest } };
              },
            },
          ],
        };
      }),
      // Gridline arrows past the bubbles: drag to move a gridline (the
      // spacings before and after it change, the rest of the grid stays).
      ...xs.slice(1).map((x, i) => ({
        id: `x:${i + 1}`,
        label: `Gridline ${xl[i + 1]}`,
        at: [x, ext.y0 - 3 * params.bubble] as Pt,
        shape: "arrow" as const,
        direction: 0,
        along: { origin: [xs[i], 0] as Pt, direction: [1, 0] as Pt, min: 1 },
        drag: ({ value }: { value: number | undefined }) =>
          value === undefined ? undefined : { params: { xs: moveLine(params.xs, i + 1, value) } },
      })),
      ...ys.slice(1).map((y, j) => ({
        id: `y:${j + 1}`,
        label: `Gridline ${yl[j + 1]}`,
        at: [ext.x0 - 3 * params.bubble, y] as Pt,
        shape: "arrow" as const,
        direction: Math.PI / 2,
        along: { origin: [0, ys[j]] as Pt, direction: [0, 1] as Pt, min: 1 },
        drag: ({ value }: { value: number | undefined }) =>
          value === undefined ? undefined : { params: { ys: moveLine(params.ys, j + 1, value) } },
      })),
    ];
  },

  draw: ({ params, hosted }) => {
    const walls = wallTable(params);
    const standing = Object.entries(walls).filter(([, w]) => !w.off);
    const cuts = hosted
      .map((h) => (h.exposed as { cut?: Cut } | null)?.cut)
      .filter((c): c is Cut => !!c);

    const pieces: Pt[][] = [];
    for (const [k, w] of standing) {
      const len = lengthOf(w);
      const [ext0, ext1] = endExtensions(k, w, walls);
      const solid = wallRect(w, -ext0, len + ext1);
      const holes = cuts
        .filter((c) => c.wall === k)
        .map((c) => wallRect({ ...w, t: w.t + 2 }, c.at, c.at + c.width));
      for (const ring of difference(solid, ...holes))
        pieces.push(ring.map((p) => [p.x, p.y] as Pt));
    }
    const solid = union(...pieces);

    return [
      ...(solid.length > 0
        ? [
            {
              type: "hatch" as const,
              loops: solid.map((points) => ({ points })),
              fill: {
                kind: "pattern" as const,
                name: params.hatch,
                angle: 0,
                scale: params.hatchScale,
              },
            },
          ]
        : []),
      ...solid.map((points) => ({
        type: "polyline" as const,
        points,
        closed: true,
      })),
      ...(params.showGrid ? gridLines(params) : []),
    ];
  },
});

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

type GridParams = {
  xs: readonly number[];
  ys: readonly number[];
  xLabels: readonly string[];
  yLabels: readonly string[];
  bubble: number;
};

const gridOf = (p: GridParams) => {
  const xs = positions(p.xs);
  const ys = positions(p.ys);
  return {
    xs,
    ys,
    xl: expandLabels(p.xLabels, xs.length),
    yl: expandLabels(p.yLabels, ys.length),
  };
};

const gridExtent = (p: GridParams) => {
  const { xs, ys } = gridOf(p);
  return {
    x0: Math.min(0, ...xs),
    x1: Math.max(0, ...xs),
    y0: Math.min(0, ...ys),
    y1: Math.max(0, ...ys),
  };
};

/** Gridlines with label bubbles past the walls (bottom / left). */
const gridLines = (p: GridParams) => {
  const { xs, ys, xl, yl } = gridOf(p);
  const { x0, x1, y0, y1 } = gridExtent(p);
  const r = p.bubble / 2;
  const over = 1.5 * p.bubble;
  const bubble = (c: Pt, label: string) => [
    { type: "circle" as const, center: c, radius: r },
    {
      type: "text" as const,
      position: c,
      content: label,
      styleOverride: { textHeight: r },
    },
  ];
  return [
    ...xs.flatMap((x, i) => [
      {
        type: "line" as const,
        a: [x, y0 - over] as Pt,
        b: [x, y1 + over / 2] as Pt,
        lineType: "center",
      },
      ...bubble([x, y0 - over - r], xl[i]),
    ]),
    ...ys.flatMap((y, j) => [
      {
        type: "line" as const,
        a: [x0 - over, y] as Pt,
        b: [x1 + over / 2, y] as Pt,
        lineType: "center",
      },
      ...bubble([x0 - over - r, y], yl[j]),
    ]),
  ];
};

/** Move gridline `i` (≥ 1) by `value` measured from gridline i-1: its
 * spacing becomes `value`, the next one absorbs the change. */
const moveLine = (spacings: readonly number[], i: number, value: number) => {
  const next = [...spacings];
  const delta = Math.round(value) - next[i];
  next[i] += delta;
  if (i + 1 < next.length) next[i + 1] = Math.max(1, next[i + 1] - delta);
  return next;
};

/** [0, 4200, 3600] → [0, 4200, 7800]: relative distances summed. */
const positions = (distances: readonly number[]): number[] => {
  let at = 0;
  return distances.map((d) => (at += d));
};

/** Labels padded to n by incrementing the last one. */
const expandLabels = (labels: readonly string[], n: number): string[] => {
  const out = labels.filter(Boolean).slice(0, n);
  while (out.length < n)
    out.push(out.length ? nextLabel(out[out.length - 1]) : String(out.length + 1));
  return out;
};

/** "8" → "9", "A" → "B", "Z" → "AA", "A1" → "A2". */
const nextLabel = (s: string): string => {
  const num = /^(.*?)(\d+)$/.exec(s);
  if (num) return num[1] + String(parseInt(num[2], 10) + 1);
  const alpha = /^(.*?)([A-Za-z]+)$/.exec(s);
  if (!alpha) return s;
  const chars = alpha[2].split("");
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i] === "Z" || chars[i] === "z") {
      chars[i] = chars[i] === "Z" ? "A" : "a";
      continue;
    }
    chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
    return alpha[1] + chars.join("");
  }
  return alpha[1] + (alpha[2][0] === "Z" ? "A" : "a") + chars.join("");
};

// ---------------------------------------------------------------------------
// Walls
// ---------------------------------------------------------------------------

type PlanParams = GridParams & {
  thickness: number;
  eccentricity: number;
  walls: Readonly<Record<string, WallOverride>>;
};

/** Every grid segment as a wall, keyed by grid names, overrides applied. */
const wallTable = (p: PlanParams): Record<string, WallGeom> => {
  const { xs, ys, xl, yl } = gridOf(p);
  const walls: Record<string, WallGeom> = {};
  const add = (k: string, a: Pt, b: Pt, n: Pt) => {
    const o = p.walls[k] ?? {};
    walls[k] = {
      a,
      b,
      n,
      t: o.t ?? p.thickness,
      e: o.e ?? p.eccentricity,
      off: o.off ?? false,
    };
  };
  xs.forEach((x, i) =>
    ys.slice(0, -1).forEach((y, j) =>
      add(`${xl[i]}/${yl[j]}-${yl[j + 1]}`, [x, y], [x, ys[j + 1]], [1, 0]),
    ),
  );
  ys.forEach((y, j) =>
    xs.slice(0, -1).forEach((x, i) =>
      add(`${yl[j]}/${xl[i]}-${xl[i + 1]}`, [x, y], [xs[i + 1], y], [0, 1]),
    ),
  );
  return walls;
};

const lengthOf = (w: WallGeom) => Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
const dirOf = (w: WallGeom): Pt => {
  const len = lengthOf(w);
  return [(w.b[0] - w.a[0]) / len, (w.b[1] - w.a[1]) / len];
};

/** The wall's centerline (the gridline moved by its eccentricity). */
const centerline = (w: WallGeom): [Pt, Pt] => [
  [w.a[0] + w.n[0] * w.e, w.a[1] + w.n[1] * w.e],
  [w.b[0] + w.n[0] * w.e, w.b[1] + w.n[1] * w.e],
];

/** The wall's solid between `from` and `to` mm along it (from its start). */
const wallRect = (w: WallGeom, from: number, to: number): Pt[] => {
  const u = dirOf(w);
  const at = (s: number, off: number): Pt => [
    w.a[0] + u[0] * s + w.n[0] * (w.e + off),
    w.a[1] + u[1] * s + w.n[1] * (w.e + off),
  ];
  return [at(from, -w.t / 2), at(to, -w.t / 2), at(to, w.t / 2), at(from, w.t / 2)];
};

const same = (p: Pt, q: Pt) => Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6;

/**
 * How far each end of wall `k` runs past its grid node: to the FAR face of
 * the standing walls across it there (a corner or T closes without a gap or
 * a stub), 0 where nothing crosses. Thickness and eccentricity of the
 * crossing walls both count.
 */
const endExtensions = (
  k: string,
  w: WallGeom,
  walls: Record<string, WallGeom>,
): [number, number] => {
  const u = dirOf(w);
  const ext = (node: Pt, outward: 1 | -1) => {
    let best = 0;
    for (const [other, p] of Object.entries(walls)) {
      if (other === k || p.off) continue;
      if (!same(p.a, node) && !same(p.b, node)) continue;
      const along = p.n[0] * u[0] + p.n[1] * u[1]; // ±1 when it crosses
      if (Math.abs(along) < 0.5) continue; // collinear — the union joins it
      const c = along * p.e; // its centerline, along this wall's direction
      best = Math.max(best, outward * c + p.t / 2);
    }
    return best;
  };
  return [ext(w.a, -1), ext(w.b, 1)];
};
