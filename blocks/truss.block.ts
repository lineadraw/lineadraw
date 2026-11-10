// Truss — a parametric roof / floor truss in elevation. Pitched, mono-pitch
// or parallel chords; Pratt, Howe or Warren webbing. Members are drawn at
// their real depth and merged into one clean outline (a polygon union), so
// joints read as on a fabrication drawing. Drag the span, the height and
// the heel; add or remove panels with the + / − buttons. The bay and
// overall dimensions, the pitch, the member marks and the member list all
// follow.
//
// Local frame: the left support is the pivot, the bottom chord's axis runs
// along +X.
import { defineBlock } from "lineadraw";
import type { BlockChildInput, Vec2 } from "lineadraw";
import { add, dist, norm, scale as sc, sub, union } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/truss",
  name: "Truss",
  description:
    "A parametric truss in elevation: pitched, mono or parallel chords with Pratt, Howe or Warren webbing, merged member outlines, dimensions and a member list.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "truss", "roof", "timber", "steel", "parametric"],
  params: [
    { type: "label", name: "geometryHeading", label: "Geometry" },
    {
      type: "enum",
      name: "shape",
      label: "Shape",
      default: "pitched",
      display: "buttons",
      options: [
        { value: "pitched", label: "Pitched" },
        { value: "mono", label: "Mono" },
        { value: "parallel", label: "Parallel" },
      ],
    },
    {
      type: "enum",
      name: "web",
      label: "Webbing",
      default: "howe",
      display: "buttons",
      options: [
        { value: "pratt", label: "Pratt" },
        { value: "howe", label: "Howe" },
        { value: "warren", label: "Warren" },
      ],
    },
    {
      type: "number",
      name: "span",
      label: "Span",
      hint: "Between the supports, along the bottom chord axis",
      default: 12000,
      min: 1000,
      step: 100,
      suffix: "mm",
    },
    {
      type: "number",
      name: "height",
      label: "Height",
      hint: "Chord axis to chord axis at the highest point",
      default: 2400,
      min: 200,
      step: 100,
      suffix: "mm",
    },
    {
      type: "number",
      name: "heel",
      label: "Heel",
      hint: "Chord axis to chord axis at the low support; 0 = a triangle",
      default: 600,
      min: 0,
      step: 50,
      suffix: "mm",
    },
    {
      type: "number",
      name: "panels",
      label: "Panels",
      hint: "Bays along the bottom chord (a pitched truss takes an even number)",
      default: 8,
      min: 1,
      max: 40,
      integer: true,
    },
    { type: "label", name: "membersHeading", label: "Members" },
    {
      type: "row",
      name: "depths",
      label: "Depth",
      items: [
        {
          type: "number",
          name: "chord",
          label: "Chord",
          default: 150,
          min: 10,
          suffix: "mm",
        },
        {
          type: "number",
          name: "webDepth",
          label: "Web",
          default: 100,
          min: 10,
          suffix: "mm",
        },
      ],
    },
    { type: "boolean", name: "axes", label: "Member axes", default: false },
    { type: "label", name: "annotationHeading", label: "Annotation" },
    {
      type: "number",
      name: "scale",
      label: "Drawing scale",
      hint: "Sizes the texts, dimensions and supports (1:N)",
      default: 50,
      min: 1,
      prefix: "1:",
      presets: [20, 50, 100],
    },
    {
      type: "boolean",
      name: "dimensions",
      label: "Dimensions",
      default: true,
    },
    { type: "boolean", name: "marks", label: "Member marks", default: true },
    { type: "boolean", name: "list", label: "Member list", default: true },
  ],

  paramVisibility: ({ params }) => ({ heel: params.shape !== "parallel" }),

  handles: ({ params }) => {
    const g = geometry(params);
    const k = params.scale;
    const step = params.shape === "pitched" ? 2 : 1;
    const below = -params.chord / 2 - 4 * k;
    return [
      {
        id: "span",
        label: "Span",
        at: [g.span, 0],
        shape: "triangle",
        param: "span",
        along: { origin: [0, 0], direction: [1, 0], min: 1000 },
      },
      {
        id: "height",
        label: "Height",
        at: g.peak,
        shape: "triangle",
        param: "height",
        along: { origin: [g.peak.x, 0], direction: [0, 1], min: 200 },
        menu: ["shape", "web", "panels"],
      },
      ...(params.shape === "parallel"
        ? []
        : [
            {
              id: "heel",
              label: "Heel",
              at: [0, g.heel] as [number, number],
              shape: "triangle" as const,
              param: "heel" as const,
              along: {
                origin: [0, 0] as [number, number],
                direction: [0, 1] as [number, number],
                min: 0,
                max: g.height,
              },
            },
          ]),
      {
        id: "fewer",
        label: "Fewer panels",
        at: [g.span / 2 - 3 * k, below],
        fixed: true,
        icon: "minus",
        click: () =>
          g.n - step >= step ? { params: { panels: g.n - step } } : undefined,
      },
      {
        id: "more",
        label: "More panels",
        at: [g.span / 2 + 3 * k, below],
        fixed: true,
        icon: "plus",
        click: () =>
          g.n + step <= 40 ? { params: { panels: g.n + step } } : undefined,
      },
    ];
  },

  draw: ({ params }) => {
    const g = geometry(params);
    const k = params.scale;
    const out: BlockChildInput[] = [];

    // The members at their depth, merged: one outline, clean joints.
    for (const ring of union(...g.members.map((m) => [bar(m)])))
      out.push({ type: "polyline", points: ring, closed: true });
    if (params.axes)
      for (const m of g.members)
        out.push({ type: "line", a: m.a, b: m.b, lineType: "center" });

    // Supports: pinned at the pivot, a roller at the far end.
    const seat = -params.chord / 2;
    const s = 2.5 * k;
    for (const [x, roller] of [
      [0, false],
      [g.span, true],
    ] as const) {
      out.push({
        type: "polyline",
        closed: true,
        points: [
          [x, seat],
          [x - s * 0.6, seat - s],
          [x + s * 0.6, seat - s],
        ],
      });
      const y = seat - s - (roller ? 0.35 * s : 0);
      if (roller)
        for (const dx of [-0.35, 0.35])
          out.push({
            type: "circle",
            center: [x + dx * s, seat - s - 0.175 * s],
            radius: 0.175 * s,
          });
      out.push({ type: "line", a: [x - s, y], b: [x + s, y] });
    }

    if (params.marks)
      for (const m of g.members) {
        const dir = norm(sub(m.b, m.a));
        // Above the member (left of its direction, members run left → right
        // or upward), clear of its edge.
        // The bottom chord's goes under it, off the webs that land there.
        const side = m.kind === "Bottom chord" ? -1 : 1;
        const off = sc({ x: -dir.y, y: dir.x }, side * (m.depth / 2 + 1.2 * k));
        out.push({
          type: "text",
          position: add(sc(add(m.a, m.b), 0.5), off),
          content: m.mark,
          hAlign: "center",
          vAlign: "center",
          rotation: Math.atan2(dir.y, dir.x),
          scale: k,
        });
      }

    if (params.dimensions) {
      const under = seat - s - 6 * k;
      // Bays, then the span, under the supports.
      out.push({
        type: "dimension",
        points: g.bottom,
        offset: under,
        scale: k,
      });
      if (g.n > 1)
        out.push({
          type: "dimension",
          points: [g.bottom[0], g.bottom[g.n]],
          offset: under - 8 * k,
          scale: k,
        });
      // Heights, measured vertically: the heel on the left, the peak beside
      // the nearer end.
      const rise = (p: Vec2, offset: number): BlockChildInput => ({
        type: "dimension",
        points: [{ x: p.x, y: 0 }, p],
        rotation: Math.PI / 2,
        offset,
        scale: k,
      });
      const side = params.chord / 2 + 8 * k;
      const heeled = g.heel > 0 && params.shape !== "parallel";
      if (heeled || params.shape === "parallel") out.push(rise(g.top[0], side));
      if (params.shape === "mono") out.push(rise(g.peak, -side));
      else if (params.shape === "pitched")
        // Left of the truss too, outside the heel's dimension.
        out.push(rise(g.peak, g.peak.x + side + (heeled ? 8 * k : 0)));
      // The pitch, on the first rafter.
      if (g.pitch > 1e-6) {
        const a = g.top[0];
        const b = g.top[1];
        const dir = norm(sub(b, a));
        out.push({
          type: "text",
          position: add(
            sc(add(a, b), 0.5),
            sc({ x: -dir.y, y: dir.x }, params.chord / 2 + 5 * k),
          ),
          content: `${((g.pitch * 180) / Math.PI).toFixed(1)}°`,
          hAlign: "center",
          vAlign: "center",
          rotation: g.pitch,
          scale: k,
        });
      }
    }

    if (params.list) {
      const rows = schedule(g.members);
      const total = rows.reduce((sum, r) => sum + r.qty * r.length, 0);
      out.push({
        type: "table",
        position: [0, seat - s - (params.dimensions ? 26 : 6) * k],
        columns: [14, 30, 12, 22],
        rows: rows.length + 2,
        headerRows: 1,
        scale: k,
        cells: [
          ["Mark", "Member", "Qty", "Length"],
          ...rows.map((r) => [
            r.mark,
            r.kind,
            { content: String(r.qty), hAlign: "right" as const },
            { content: String(r.length), hAlign: "right" as const },
          ]),
          [
            { content: "Total", span: { cols: 3, rows: 1 } },
            "",
            "",
            {
              content: `${(total / 1000).toFixed(2)} m`,
              hAlign: "right" as const,
            },
          ],
        ],
      });
    }
    return out;
  },
});

// ——————————————————————————— Geometry ———————————————————————————

type Kind = "Top chord" | "Bottom chord" | "Vertical" | "Diagonal";
type Member = { a: Vec2; b: Vec2; depth: number; kind: Kind; mark: string };

type Params = {
  shape: string;
  web: string;
  span: number;
  height: number;
  heel: number;
  panels: number;
  chord: number;
  webDepth: number;
};

/** The node lines and the members between them, from the parameters. */
function geometry(p: Params) {
  const pitched = p.shape === "pitched";
  const span = Math.max(p.span, 1);
  const height = Math.max(p.height, 1);
  const heel = p.shape === "parallel" ? height : Math.min(p.heel, height);
  // A pitched truss needs a node under the ridge: an even panel count.
  const n = pitched
    ? Math.max(2, 2 * Math.round(p.panels / 2))
    : Math.max(1, Math.round(p.panels));
  const w = span / n;
  const topY = (x: number) =>
    pitched
      ? heel + (height - heel) * (1 - Math.abs((2 * x) / span - 1))
      : p.shape === "mono"
        ? heel + ((height - heel) * x) / span
        : height;
  const bottom: Vec2[] = [];
  const top: Vec2[] = [];
  for (let i = 0; i <= n; i++) {
    bottom.push({ x: i * w, y: 0 });
    top.push({ x: i * w, y: topY(i * w) });
  }
  const peak = pitched ? top[n / 2] : p.shape === "mono" ? top[n] : top[n >> 1];

  const members: Member[] = [];
  const counts: Record<string, number> = {};
  // Same mark for equal lengths of a kind (a symmetric truss repeats).
  const marks = new Map<string, string>();
  const prefix = {
    "Top chord": "T",
    "Bottom chord": "B",
    Vertical: "V",
    Diagonal: "D",
  };
  // Chord segments, so a web lying on a chord (a heel-less end) is dropped.
  const taken = new Set<string>();
  const key = (a: Vec2, b: Vec2) =>
    [a, b]
      .map((q) => `${Math.round(q.x)},${Math.round(q.y)}`)
      .sort()
      .join("|");
  const put = (a: Vec2, b: Vec2, kind: Kind, depth: number) => {
    const length = Math.round(dist(a, b));
    if (length < 1) return;
    const id = `${kind}:${length}`;
    let mark = marks.get(id);
    if (!mark) {
      counts[kind] = (counts[kind] ?? 0) + 1;
      mark = prefix[kind] + counts[kind];
      marks.set(id, mark);
    }
    members.push({ a, b, depth, kind, mark });
  };

  put(bottom[0], bottom[n], "Bottom chord", p.chord);
  if (pitched) {
    put(top[0], top[n / 2], "Top chord", p.chord);
    put(top[n / 2], top[n], "Top chord", p.chord);
  } else put(top[0], top[n], "Top chord", p.chord);
  for (let i = 0; i < n; i++) {
    taken.add(key(top[i], top[i + 1]));
    taken.add(key(bottom[i], bottom[i + 1]));
  }
  const web = (a: Vec2, b: Vec2, kind: Kind) => {
    if (taken.has(key(a, b))) return;
    taken.add(key(a, b));
    put(a, b, kind, p.webDepth);
  };

  for (let i = 0; i <= n; i++)
    if (p.web !== "warren" || i === 0 || i === n)
      web(bottom[i], top[i], "Vertical");
  for (let i = 0; i < n; i++) {
    // Rising toward the ridge (Howe), falling toward it (Pratt), or
    // alternating (Warren). "Toward the ridge" is rightward in the left
    // half of a pitched truss and everywhere in a mono or parallel one.
    const leftHalf = !pitched || i < n / 2;
    const rising =
      p.web === "warren" ? i % 2 === 0 : (p.web === "howe") === leftHalf;
    if (rising) web(bottom[i], top[i + 1], "Diagonal");
    else web(top[i], bottom[i + 1], "Diagonal");
  }

  return {
    span,
    height,
    heel,
    n,
    bottom,
    top,
    peak,
    members,
    pitch: Math.atan2(top[1].y - top[0].y, w),
  };
}

/** A member as a rectangle about its axis, run half a depth past each node
 * so the union closes the joints. */
function bar(m: Member): Vec2[] {
  const dir = norm(sub(m.b, m.a));
  const h = m.depth / 2;
  const nrm = { x: -dir.y * h, y: dir.x * h };
  const a = sub(m.a, sc(dir, h));
  const b = add(m.b, sc(dir, h));
  return [add(a, nrm), add(b, nrm), sub(b, nrm), sub(a, nrm)];
}

/** The member list: one row per mark, in drawing order. */
function schedule(members: readonly Member[]) {
  const rows = new Map<
    string,
    { mark: string; kind: Kind; qty: number; length: number }
  >();
  for (const m of members) {
    const row = rows.get(m.mark);
    if (row) row.qty++;
    else
      rows.set(m.mark, {
        mark: m.mark,
        kind: m.kind,
        qty: 1,
        length: Math.round(dist(m.a, m.b)),
      });
  }
  return [...rows.values()];
}
