// Floor plan — walls on a grid, with rooms. The grid is Tekla-style
// positions ("0 4200 3600") with auto-incrementing labels, like the Grid
// block; "+" buttons between the bubbles insert a gridline (named "A.1",
// so no existing name changes), the arrows past the bubbles move one, and
// the arrow's menu removes it. Every grid segment is a wall, keyed by grid
// names: "A/1-2" is the wall on gridline A between 1 and 2. Per-wall
// thickness, eccentricity and on/off are sparse overrides in the `walls`
// data param, edited from each wall's hover menu.
//
// Rooms are the spaces the walls enclose (a disabled wall merges two):
// each gets a label with an optional name — from the small handle at the
// label — and its net area.
//
// Doors and windows are their own blocks (@lineadraw/floor-plan-door,
// @lineadraw/floor-plan-window) LIVING ON the plan. The plan publishes its
// gridlines and the walls standing on them (`expose`); an opening sits on a
// gridline at a position along it, so it can slide across wall ends and
// span several segments; the plan cuts every wall the opening overlaps.
// Corners and T-junctions join cleanly: each wall end runs to the far face
// of the walls across it, and the solids are unioned before hatching.
//
// Needs Linea with hosted blocks (document version 24): input tables,
// handles, `data` params, `expose` / `hosted`, union / difference.
import { defineBlock } from "lineadraw";
import { difference, union } from "lineadraw/helpers";

/** A wall's override in the `walls` data param (absent = the defaults). */
type WallOverride = { t?: number; e?: number; off?: boolean };

/** A room's settings in the `rooms` data param, by its room key. */
type RoomOverride = { name?: string };

type Pt = [number, number];

/** One wall (plan-local mm). `a` → `b` runs along its gridline; `n` is
 * its +side (right for walls on X gridlines, up for walls on Y ones) —
 * the eccentricity `e` moves the wall that way. `line` is the gridline,
 * `from` / `to` the wall's span along it. */
type WallGeom = {
  key: string;
  line: string;
  a: Pt;
  b: Pt;
  n: Pt;
  t: number;
  e: number;
  off: boolean;
  from: number;
  to: number;
};

/** A gridline as the plan publishes it: positions along it are measured
 * from the plan origin in direction `u` (y for X gridlines, x for Y ones);
 * `at(s)` = `origin + u·s`. `segments` are the walls standing on it. */
type LineGeom = {
  origin: Pt;
  u: Pt;
  n: Pt;
  segments: { from: number; to: number; t: number; e: number }[];
};

/** What openings publish (their `expose`): a hole `width` mm long on
 * gridline `line`, starting `at` mm along it. */
type Cut = { line: string; at: number; width: number };

export default defineBlock({
  id: "@lineadraw/floor-plan",
  name: "Floor plan",
  description:
    "Walls on a grid with room labels and areas. Per-wall thickness, eccentricity and on/off from each wall's hover menu; '+' buttons insert gridlines. Hosts @lineadraw/floor-plan-door and @lineadraw/floor-plan-window, which cut its walls.",
  version: "1.1.0",
  authors: ["Linea Team"],
  tags: ["architecture", "plan", "wall", "floor plan", "room"],
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
    { type: "boolean", name: "showGrid", label: "Show grid", default: true },
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
    { type: "hatchPattern", name: "hatch", label: "Hatch", default: "ANSI31" },
    {
      type: "number",
      name: "hatchScale",
      label: "Hatch scale",
      default: 20,
      min: 0.01,
    },
    { type: "label", name: "roomHeading", label: "Rooms" },
    { type: "boolean", name: "showRooms", label: "Room labels", default: true },
    {
      type: "number",
      name: "roomText",
      label: "Text height",
      default: 250,
      min: 10,
      suffix: "mm",
    },
    {
      type: "number",
      name: "areaDecimals",
      label: "Area decimals",
      default: 1,
      min: 0,
      max: 3,
      integer: true,
    },
    {
      type: "data",
      name: "walls",
      default: {} as Record<string, WallOverride>,
    },
    {
      type: "data",
      name: "rooms",
      default: {} as Record<string, RoomOverride>,
    },
  ],
  paramVisibility: ({ params }) => ({
    bubble: params.showGrid,
    roomText: params.showRooms,
    areaDecimals: params.showRooms,
  }),
  inputs: [
    { name: "origin", type: "point", label: "Plan origin (first gridlines)" },
  ],
  previewInputs: { origin: [0, 0] },

  // What doors and windows read: the gridlines and the walls standing on
  // them.
  expose: ({ params }) => ({ lines: linesOf(params) }),

  handles: ({ params }) => [
    ...wallHandles(params),
    ...gridHandles(params),
    ...(params.showRooms ? roomHandles(params) : []),
  ],

  draw: ({ params, hosted }) => {
    const cuts = hosted
      .map((h) => (h.exposed as { cut?: Cut } | null)?.cut)
      .filter((c): c is Cut => !!c && typeof c.line === "string");
    const rings = solidOf(params, cuts);
    const rooms = params.showRooms ? roomsOf(params) : [];

    return [
      ...(rings.length > 0
        ? [
            {
              type: "hatch" as const,
              loops: rings.map((points) => ({ points })),
              fill: {
                kind: "pattern" as const,
                name: params.hatch,
                angle: 0,
                scale: params.hatchScale,
              },
            },
          ]
        : []),
      ...rings.map((points) => ({
        type: "polyline" as const,
        points,
        closed: true,
      })),
      ...rooms.flatMap((r) => roomLabel(params, r)),
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

/** Where the label bubbles sit: below the X gridlines, left of the Y ones. */
const bubbleRow = (p: GridParams) => {
  const { x0, y0 } = gridExtent(p);
  const r = p.bubble / 2;
  const over = 1.5 * p.bubble;
  return { r, over, by: y0 - over - r, bx: x0 - over - r };
};

/** Gridlines with label bubbles past the walls (bottom / left). */
const gridLines = (p: GridParams) => {
  const { xs, ys, xl, yl } = gridOf(p);
  const { x0, x1, y0, y1 } = gridExtent(p);
  const { r, over, by, bx } = bubbleRow(p);
  const bubble = (c: Pt, label: string) => [
    { type: "circle" as const, center: c, radius: r },
    {
      type: "text" as const,
      position: c,
      content: label,
      // Longer labels ("A.1") shrink to stay inside the bubble.
      styleOverride: {
        textHeight: r * Math.min(1, 1.8 / Math.max(1, label.length)),
      },
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
      ...bubble([x, by], xl[i]),
    ]),
    ...ys.flatMap((y, j) => [
      {
        type: "line" as const,
        a: [x0 - over, y] as Pt,
        b: [x1 + over / 2, y] as Pt,
        lineType: "center",
      },
      ...bubble([bx, y], yl[j]),
    ]),
  ];
};

type PlanParams = GridParams & {
  thickness: number;
  eccentricity: number;
  walls: Readonly<Record<string, WallOverride>>;
};

/**
 * Gridline handles: "+" buttons between neighbouring bubbles insert a
 * gridline midway; arrows past the bubbles move one (the spacing before it
 * changes, the next absorbs it); an arrow's menu removes its gridline.
 */
const gridHandles = (params: PlanParams & GridParams) => {
  const { xs, ys, xl, yl } = gridOf(params);
  const { r, by, bx } = bubbleRow(params);
  const axes = [
    ["x", xs, xl],
    ["y", ys, yl],
  ] as const;
  return axes.flatMap(([axis, pos, labels]) => {
    const at = (s: number, off: number): Pt =>
      axis === "x" ? [s, by - off] : [bx - off, s];
    return pos.flatMap((s, i) => [
      ...(i > 0
        ? [
            {
              id: `move:${axis}:${i}`,
              label: `Gridline ${labels[i]}`,
              at: at(s, 2.2 * r),
              shape: "arrow" as const,
              direction: axis === "x" ? 0 : Math.PI / 2,
              along: {
                origin: (axis === "x"
                  ? [pos[i - 1], 0]
                  : [0, pos[i - 1]]) as Pt,
                direction: (axis === "x" ? [1, 0] : [0, 1]) as Pt,
                min: 1,
              },
              drag: ({ value }: { value: number | undefined }) =>
                value === undefined
                  ? undefined
                  : {
                      params:
                        axis === "x"
                          ? { xs: moveLine(params.xs, i, value) }
                          : { ys: moveLine(params.ys, i, value) },
                    },
              actions:
                pos.length > 2
                  ? [
                      {
                        label: `Remove gridline ${labels[i]}`,
                        icon: "minus" as const,
                        run: () => ({ params: removeLine(params, axis, i) }),
                      },
                    ]
                  : [],
            },
          ]
        : []),
      ...(i + 1 < pos.length
        ? [
            {
              id: `insert:${axis}:${i}`,
              label: `Insert a gridline between ${labels[i]} and ${labels[i + 1]}`,
              at: at((s + pos[i + 1]) / 2, 0),
              fixed: true,
              icon: "plus" as const,
              click: () => ({ params: insertLine(params, axis, i) }),
            },
          ]
        : []),
    ]);
  });
};

/** Move gridline `i` (≥ 1) to `value` mm past gridline i-1. */
const moveLine = (spacings: readonly number[], i: number, value: number) => {
  const next = [...spacings];
  const delta = Math.round(value) - next[i];
  next[i] += delta;
  if (i + 1 < next.length) next[i + 1] = Math.max(1, next[i + 1] - delta);
  return next;
};

/** A label not taken yet: "A.1", then "A.2"… */
const freshLabel = (base: string, taken: readonly string[]) => {
  for (let k = 1; ; k++) {
    const label = `${base}.${k}`;
    if (!taken.includes(label)) return label;
  }
};

/**
 * Insert a gridline midway between gridline `i` and `i + 1` of `axis`.
 * Labels become explicit (so nothing renumbers), the new one is "A.1";
 * overrides of the walls the new line splits carry over to both halves.
 */
const insertLine = (p: PlanParams, axis: "x" | "y", i: number) => {
  const { xl, yl } = gridOf(p);
  const spacings = [...(axis === "x" ? p.xs : p.ys)];
  const labels = [...(axis === "x" ? xl : yl)];
  const half = spacings[i + 1] / 2;
  spacings.splice(i + 1, 1, half, spacings[i + 1] - half);
  const fresh = freshLabel(labels[i], labels);
  const [lo, hi] = [labels[i], labels[i + 1]];
  labels.splice(i + 1, 0, fresh);
  // Walls spanning lo-hi (on the OTHER axis' gridlines) split in two.
  const walls: Record<string, WallOverride> = {};
  for (const [k, o] of Object.entries(p.walls)) {
    const m = /^(.*)\/(.*)-(.*)$/.exec(k);
    if (m && m[2] === lo && m[3] === hi) {
      walls[`${m[1]}/${lo}-${fresh}`] = o;
      walls[`${m[1]}/${fresh}-${hi}`] = o;
    } else walls[k] = o;
  }
  return axis === "x"
    ? { xs: spacings, xLabels: labels, walls }
    : { ys: spacings, yLabels: labels, walls };
};

/**
 * Remove gridline `i` of `axis`: its spacing merges into the next one (the
 * other gridlines stay put); overrides of its walls are dropped, and a
 * span that joins across it keeps the first half's override.
 */
const removeLine = (p: PlanParams, axis: "x" | "y", i: number) => {
  const { xl, yl } = gridOf(p);
  const spacings = [...(axis === "x" ? p.xs : p.ys)];
  const labels = [...(axis === "x" ? xl : yl)];
  if (i + 1 < spacings.length) spacings[i + 1] += spacings[i];
  spacings.splice(i, 1);
  const [gone, lo, hi] = [labels[i], labels[i - 1], labels[i + 1]];
  labels.splice(i, 1);
  const walls: Record<string, WallOverride> = {};
  for (const [k, o] of Object.entries(p.walls)) {
    const m = /^(.*)\/(.*)-(.*)$/.exec(k);
    if (!m) continue;
    if (m[1] === gone) continue; // a wall ON the removed gridline
    if (m[2] === lo && m[3] === gone) {
      if (hi !== undefined) walls[`${m[1]}/${lo}-${hi}`] ??= o;
      continue;
    }
    if (m[2] === gone && m[3] === hi) {
      walls[`${m[1]}/${lo}-${hi}`] ??= o;
      continue;
    }
    walls[k] = o;
  }
  return axis === "x"
    ? { xs: spacings, xLabels: labels, walls }
    : { ys: spacings, yLabels: labels, walls };
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
    out.push(
      out.length ? nextLabel(out[out.length - 1]) : String(out.length + 1),
    );
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

/** Every grid segment as a wall, keyed by grid names, overrides applied. */
const wallTable = (p: PlanParams): Record<string, WallGeom> => {
  const { xs, ys, xl, yl } = gridOf(p);
  const walls: Record<string, WallGeom> = {};
  const add = (
    key: string,
    line: string,
    a: Pt,
    b: Pt,
    n: Pt,
    from: number,
    to: number,
  ) => {
    const o = p.walls[key] ?? {};
    walls[key] = {
      key,
      line,
      a,
      b,
      n,
      from,
      to,
      t: o.t ?? p.thickness,
      e: o.e ?? p.eccentricity,
      off: o.off ?? false,
    };
  };
  xs.forEach((x, i) =>
    ys
      .slice(0, -1)
      .forEach((y, j) =>
        add(
          `${xl[i]}/${yl[j]}-${yl[j + 1]}`,
          xl[i],
          [x, y],
          [x, ys[j + 1]],
          [1, 0],
          y,
          ys[j + 1],
        ),
      ),
  );
  ys.forEach((y, j) =>
    xs
      .slice(0, -1)
      .forEach((x, i) =>
        add(
          `${yl[j]}/${xl[i]}-${xl[i + 1]}`,
          yl[j],
          [x, y],
          [xs[i + 1], y],
          [0, 1],
          x,
          xs[i + 1],
        ),
      ),
  );
  return walls;
};

/** The gridlines and their standing walls — what openings read. */
const linesOf = (p: PlanParams): Record<string, LineGeom> => {
  const { xs, ys, xl, yl } = gridOf(p);
  const lines: Record<string, LineGeom> = {};
  xs.forEach((x, i) => {
    lines[xl[i]] = { origin: [x, 0], u: [0, 1], n: [1, 0], segments: [] };
  });
  ys.forEach((y, j) => {
    lines[yl[j]] = { origin: [0, y], u: [1, 0], n: [0, 1], segments: [] };
  });
  for (const w of Object.values(wallTable(p)))
    if (!w.off)
      lines[w.line]?.segments.push({ from: w.from, to: w.to, t: w.t, e: w.e });
  return lines;
};

const dirOf = (w: WallGeom): Pt => {
  const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
  return [(w.b[0] - w.a[0]) / len, (w.b[1] - w.a[1]) / len];
};

/** The wall's solid between `from` and `to` mm along it (from its start). */
const wallRect = (w: WallGeom, from: number, to: number): Pt[] => {
  const u = dirOf(w);
  const h = w.t / 2;
  const at = (s: number, off: number): Pt => [
    w.a[0] + u[0] * s + w.n[0] * (w.e + off),
    w.a[1] + u[1] * s + w.n[1] * (w.e + off),
  ];
  return [at(from, -h), at(to, -h), at(to, h), at(from, h)];
};

const same = (p: Pt, q: Pt) =>
  Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6;

/** How far each end of wall `w` runs past its grid node: to the FAR face
 * of the standing walls across it there (a corner or T closes without a
 * gap or a stub), 0 where nothing crosses. */
const endExtensions = (
  w: WallGeom,
  walls: Record<string, WallGeom>,
): [number, number] => {
  const u = dirOf(w);
  const ext = (node: Pt, outward: 1 | -1) => {
    let best = 0;
    for (const p of Object.values(walls)) {
      if (p.key === w.key || p.off) continue;
      if (!same(p.a, node) && !same(p.b, node)) continue;
      const along = p.n[0] * u[0] + p.n[1] * u[1]; // ±1 when it crosses
      if (Math.abs(along) < 0.5) continue; // collinear — the union joins it
      best = Math.max(best, outward * along * p.e + p.t / 2);
    }
    return best;
  };
  return [ext(w.a, -1), ext(w.b, 1)];
};

/** An opening's hole in plan coordinates: its span along the gridline,
 * across the full band of the walls standing on that line (thickness and
 * eccentricity) — so it also clears a crossing wall's end where it runs
 * into the band (an opening spanning a T-junction). */
const holeOf = (lines: Record<string, LineGeom>, c: Cut): Pt[] | null => {
  const l = lines[c.line];
  const segs = l?.segments.filter(
    (s) => s.from < c.at + c.width && s.to > c.at,
  );
  if (!l || !segs || segs.length === 0) return null;
  const lo = Math.min(...segs.map((s) => s.e - s.t / 2)) - 1;
  const hi = Math.max(...segs.map((s) => s.e + s.t / 2)) + 1;
  const at = (s: number, off: number): Pt => [
    l.origin[0] + l.u[0] * s + l.n[0] * off,
    l.origin[1] + l.u[1] * s + l.n[1] * off,
  ];
  return [
    at(c.at, lo),
    at(c.at + c.width, lo),
    at(c.at + c.width, hi),
    at(c.at, hi),
  ];
};

/** The plan's wall solid as rings (outlines CCW, holes = rooms CW), with
 * every opening's hole cut out of every wall it reaches. */
const solidOf = (
  p: PlanParams,
  cuts: readonly Cut[],
): { x: number; y: number }[][] => {
  const walls = wallTable(p);
  const lines = linesOf(p);
  const holes = cuts
    .map((c) => holeOf(lines, c))
    .filter((h): h is Pt[] => h !== null);
  const pieces: Pt[][] = [];
  for (const w of Object.values(walls)) {
    if (w.off) continue;
    const [ext0, ext1] = endExtensions(w, walls);
    const solid = wallRect(w, -ext0, w.to - w.from + ext1);
    for (const ring of difference(solid, ...holes))
      pieces.push(ring.map((q) => [q.x, q.y] as Pt));
  }
  return union(...pieces);
};

/** Each wall's line handle (the disabled ones too, so they can come back),
 * with its hover menu. */
const wallHandles = (params: PlanParams) =>
  Object.values(wallTable(params)).map((w) => {
    const set = (patch: WallOverride) => ({
      params: {
        walls: {
          ...params.walls,
          [w.key]: { ...params.walls[w.key], ...patch },
        },
      },
    });
    const off = (s: number): Pt => [
      w.a[0] + w.n[0] * w.e + dirOf(w)[0] * s,
      w.a[1] + w.n[1] * w.e + dirOf(w)[1] * s,
    ];
    return {
      id: `wall:${w.key}`,
      label: `Wall ${w.key}`,
      kind: "line" as const,
      from: off(0),
      to: off(w.to - w.from),
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
            const { [w.key]: _, ...rest } = params.walls;
            return { params: { walls: rest } };
          },
        },
      ],
    };
  });

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

type RoomParams = PlanParams & {
  rooms: Readonly<Record<string, RoomOverride>>;
  roomText: number;
  areaDecimals: number;
};

type Room = { key: string; at: Pt; area: number; name?: string };

const signedArea = (r: readonly { x: number; y: number }[]) =>
  r.reduce((a, q, i) => {
    const n = r[(i + 1) % r.length];
    return a + (q.x * n.y - n.x * q.y) / 2;
  }, 0);

const inside = (r: readonly { x: number; y: number }[], p: Pt) => {
  let hit = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [a, b] = [r[i], r[j]];
    if (
      a.y > p[1] !== b.y > p[1] &&
      p[0] < ((b.x - a.x) * (p[1] - a.y)) / (b.y - a.y) + a.x
    )
      hit = !hit;
  }
  return hit;
};

/**
 * The rooms: the holes of the wall solid WITHOUT openings (a door doesn't
 * merge two rooms). Each is keyed by the first grid cell inside it ("A/1"
 * = between gridlines A and the next, 1 and the next) — stable while walls
 * come and go — and labelled at its centroid (the cell's centre when the
 * centroid falls outside, as in an L-shaped room).
 */
const roomsOf = (p: RoomParams): Room[] => {
  // `draw` and `handles` both need the rooms for the same values: compute
  // once (the wall solid behind them is the costly part).
  const key = JSON.stringify([
    p.xs,
    p.ys,
    p.xLabels,
    p.yLabels,
    p.thickness,
    p.eccentricity,
    p.walls,
    p.rooms,
  ]);
  if (key === lastRooms.key) return lastRooms.rooms;
  const rooms = computeRooms(p);
  lastRooms = { key, rooms };
  return rooms;
};
let lastRooms: { key: string; rooms: Room[] } = { key: "", rooms: [] };

const computeRooms = (p: RoomParams): Room[] => {
  const { xs, ys, xl, yl } = gridOf(p);
  const rooms: Room[] = [];
  for (const ring of solidOf(p, [])) {
    const area = signedArea(ring);
    if (area >= 0) continue; // an outline, not a room
    let cell: { key: string; c: Pt } | null = null;
    for (let j = 0; j + 1 < ys.length && !cell; j++)
      for (let i = 0; i + 1 < xs.length && !cell; i++) {
        const c: Pt = [(xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2];
        if (inside(ring, c)) cell = { key: `${xl[i]}/${yl[j]}`, c };
      }
    if (!cell) continue;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < ring.length; i++) {
      const [a, b] = [ring[i], ring[(i + 1) % ring.length]];
      const f = a.x * b.y - b.x * a.y;
      cx += (a.x + b.x) * f;
      cy += (a.y + b.y) * f;
    }
    const centroid: Pt = [cx / (6 * area), cy / (6 * area)];
    rooms.push({
      key: cell.key,
      at: inside(ring, centroid) ? centroid : cell.c,
      area: -area / 1e6,
      name: p.rooms[cell.key]?.name,
    });
  }
  return rooms;
};

/** A room's label: its name (when it has one) over its area. */
const roomLabel = (p: RoomParams, r: Room) => {
  const h = p.roomText;
  const area = {
    type: "text" as const,
    position: (r.name ? [r.at[0], r.at[1] - h * 0.75] : r.at) as Pt,
    content: `${r.area.toFixed(p.areaDecimals)} m²`,
    styleOverride: { textHeight: h * 0.8 },
  };
  return r.name
    ? [
        {
          type: "text" as const,
          position: [r.at[0], r.at[1] + h * 0.6] as Pt,
          content: r.name,
          styleOverride: { textHeight: h },
        },
        area,
      ]
    : [area];
};

/** A small handle under each room label: its menu names the room. */
const roomHandles = (params: RoomParams) =>
  roomsOf(params).map((r) => ({
    id: `room:${r.key}`,
    label: `Room ${r.key}`,
    at: [r.at[0], r.at[1] - params.roomText * 1.8] as Pt,
    shape: "circle" as const,
    fixed: true,
    menu: [
      {
        field: { type: "string", label: "Name", placeholder: "Living room" },
        value: r.name ?? "",
        // A blank name drops the key: `data` holds JSON, and undefined isn't.
        set: (name: string) => {
          const { name: _, ...rest } = params.rooms[r.key] ?? {};
          return {
            params: {
              rooms: {
                ...params.rooms,
                [r.key]: name ? { ...rest, name } : rest,
              },
            },
          };
        },
      },
    ],
  }));
