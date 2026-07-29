// Rebar Block — a bent bar through picked points: the centerline polyline
// with bending-radius fillets at the corners and a 30° one-sided end tick
// at each end, or a closed outline (offset ±size/2, flat end caps) when
// thickness is shown. A corner's bend falls
// back to a sharp corner when its tangent length doesn't fit on the
// previous segment (minus what the previous bend used) or the next one.
import { defineBlock } from "lineadraw";
import type { Line, Polyline, PolylineVertexLike, Vec2 } from "lineadraw";
import { sub, add, scale, norm, len, rotate } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/rebar",
  name: "Rebar",
  description:
    "Draws a bent rebar through picked points: the centerline with bending-radius fillets and end ticks, or the true-thickness outline for the selected bar size.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "concrete", "reinforcement", "rebar"],
  params: [
    {
      name: "size",
      label: "Size",
      type: "enum",
      default: "12",
      options: ["6", "8", "10", "12", "16", "20", "25", "32"],
    },
    {
      name: "showThickness",
      label: "Thickness",
      type: "boolean",
      default: true,
    },
  ],
  // A classic U-bar; the stand-in picks would zigzag through 16 grid points.
  previewInputs: [[0, 60], [0, 0], [100, 0], [100, 60]],
  place: async ({ pickPoint }) => {
    const points: Vec2[] = [];
    try {
      for (;;) points.push(await pickPoint(`Point ${points.length + 1}`));
    } catch (e) {
      // Escape finishes the collection; rethrowing the cancel rejection when
      // there's no bar yet lets the insert tool exit instead of placing.
      if (points.length < 2) throw e;
    }
    return points;
  },
  draw: ({ params, inputs }) => {
    // Drop consecutive duplicate picks — zero-length segments carry no bend.
    const pts: Vec2[] = [];
    for (const v of inputs) {
      if (pts.length === 0 || len(sub(v, pts[pts.length - 1])) > EPS)
        pts.push(v);
    }
    if (pts.length < 2) return [];

    const entry = bendRadii.find((d) => d[0] === params.size);
    const r = entry ? entry[1] : 0;
    const corners = buildCorners(pts, r);

    if (!params.showThickness) {
      const points: PolylineVertexLike[] = [{ ...pts[0], bulge: 0 }];
      for (const c of corners) {
        if (c.kind === "sharp") points.push({ ...c.p, bulge: 0 });
        else points.push({ ...c.a, bulge: c.bulge }, { ...c.b, bulge: 0 });
      }
      points.push({ ...pts[pts.length - 1], bulge: 0 });
      const line: Polyline = { type: "polyline", points, closed: false };
      // End marks: one 30° tick per end (one-sided arrow), both on the same
      // side of the bar. `into` points from the end back along its segment;
      // the mirrored rotation sign keeps the ticks on one visual side.
      const size = Number(params.size);
      const tick = (end: Vec2, into: Vec2, sign: 1 | -1): Line => ({
        type: "line",
        a: end,
        b: add(end, scale(rotate(norm(into), sign * (Math.PI / 6)), size * 4)),
      });
      return [
        line,
        tick(pts[0], sub(pts[1], pts[0]), 1),
        tick(
          pts[pts.length - 1],
          sub(pts[pts.length - 2], pts[pts.length - 1]),
          -1,
        ),
      ];
    }

    // Closed outline: left side forward, far end cap, right side back, the
    // closing edge is the near end cap.
    const h = Number(params.size) / 2;
    const elems = buildElements(pts, corners);
    const outline: Polyline = {
      type: "polyline",
      points: [
        ...toPoints(offsetSide(elems, h)),
        ...toPoints(reversed(offsetSide(elems, -h))),
      ],
      closed: true,
    };
    return [outline];
  },
});

// size → centerline bending radius (mm)
const bendRadii = [
  ["6", 14],
  ["8", 18],
  ["10", 23],
  ["12", 27],
  ["16", 36],
  ["20", 90],
  ["25", 113],
  ["32", 144],
] as const;

const EPS = 1e-6;

/** Left-hand unit normal of a unit direction. */
const leftNormal = (d: Vec2): Vec2 => ({ x: -d.y, y: d.x });

/** Intersection of two (point, direction) lines; null when near-parallel. */
const intersect = (p1: Vec2, d1: Vec2, p2: Vec2, d2: Vec2): Vec2 | null => {
  const det = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(det) < 1e-9) return null;
  const s = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / det;
  return add(p1, scale(d1, s));
};

type Corner =
  | { kind: "sharp"; p: Vec2 }
  | { kind: "arc"; a: Vec2; b: Vec2; bulge: number; center: Vec2; r: number };

/**
 * Fillet the interior corners with radius r. Greedy along the bar: a corner
 * keeps its bend only when the tangent length fits what's left of the
 * previous segment and the full next segment; otherwise it stays sharp.
 */
const buildCorners = (pts: Vec2[], r: number): Corner[] => {
  const corners: Corner[] = [];
  let consumedPrev = 0; // previous-corner tangent already on this segment
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const vIn = sub(p, pts[i - 1]);
    const vOut = sub(pts[i + 1], p);
    const lIn = len(vIn);
    const lOut = len(vOut);
    const sharp = () => {
      corners.push({ kind: "sharp", p });
      consumedPrev = 0;
    };
    if (lIn < EPS || lOut < EPS) {
      sharp();
      continue;
    }
    const dIn = scale(vIn, 1 / lIn);
    const dOut = scale(vOut, 1 / lOut);
    const crossZ = dIn.x * dOut.y - dIn.y * dOut.x;
    const dot = dIn.x * dOut.x + dIn.y * dOut.y;
    const turn = Math.atan2(Math.abs(crossZ), dot); // 0 = straight, π = back
    // Collinear: nothing to bend. Doubling back: the tangent explodes.
    if (turn < 1e-4 || turn > Math.PI - 1e-4) {
      sharp();
      continue;
    }
    const t = r * Math.tan(turn / 2);
    if (r <= 0 || t > lIn - consumedPrev - EPS || t > lOut - EPS) {
      sharp();
      continue;
    }
    const a = sub(p, scale(dIn, t));
    const b = add(p, scale(dOut, t));
    const side = Math.sign(crossZ); // +1 left turn (CCW arc), -1 right
    corners.push({
      kind: "arc",
      a,
      b,
      bulge: side * Math.tan(turn / 4),
      center: add(a, scale(leftNormal(dIn), side * r)),
      r,
    });
    consumedPrev = t;
  }
  return corners;
};

type Elem =
  | { kind: "line"; a: Vec2; b: Vec2 }
  | { kind: "arc"; a: Vec2; b: Vec2; bulge: number; center: Vec2; r: number };

/** The filleted centerline as straight/arc elements, degenerates dropped. */
const buildElements = (pts: Vec2[], corners: Corner[]): Elem[] => {
  const elems: Elem[] = [];
  let cursor = pts[0];
  const lineTo = (b: Vec2) => {
    if (len(sub(b, cursor)) > EPS) elems.push({ kind: "line", a: cursor, b });
    cursor = b;
  };
  for (const c of corners) {
    if (c.kind === "sharp") {
      lineTo(c.p);
    } else {
      lineTo(c.a);
      elems.push(c);
      cursor = c.b;
    }
  }
  lineTo(pts[pts.length - 1]);
  return elems;
};

type PathVertex = { p: Vec2; bulge: number };

/**
 * Offset the element path by h (+ = left of travel, − = right). Arc corners
 * stay tangent-continuous (same bulge, radius r∓h); sharp corners miter,
 * falling back to a bevel when the offset lines are near-parallel.
 */
const offsetSide = (elems: Elem[], h: number): PathVertex[] => {
  const verts: PathVertex[] = [];
  const push = (p: Vec2, bulge = 0) => {
    const last = verts[verts.length - 1];
    if (last && len(sub(last.p, p)) < 1e-4) {
      if (bulge !== 0) last.bulge = bulge;
      return;
    }
    verts.push({ p, bulge });
  };
  let prevLine: { a: Vec2; d: Vec2 } | null = null;
  for (const e of elems) {
    if (e.kind === "line") {
      const d = norm(sub(e.b, e.a));
      const n = leftNormal(d);
      const a = add(e.a, scale(n, h));
      const b = add(e.b, scale(n, h));
      if (prevLine && verts.length > 0) {
        // Sharp corner between two straights: miter the offset lines.
        const m = intersect(prevLine.a, prevLine.d, a, d);
        if (m) verts[verts.length - 1].p = m;
        else push(a);
      } else {
        push(a);
      }
      push(b);
      prevLine = { a, d };
    } else {
      const side = e.bulge > 0 ? 1 : -1; // CCW arc: left offset is inside
      const rOff = e.r - side * h;
      push(add(e.center, scale(norm(sub(e.a, e.center)), rOff)), e.bulge);
      push(add(e.center, scale(norm(sub(e.b, e.center)), rOff)));
      prevLine = null;
    }
  }
  return verts;
};

/** Reverse a bulged vertex path (arcs flip direction and shift a vertex). */
const reversed = (verts: PathVertex[]): PathVertex[] => {
  const out: PathVertex[] = [];
  for (let k = verts.length - 1; k >= 0; k--)
    out.push({ p: verts[k].p, bulge: k > 0 ? -verts[k - 1].bulge : 0 });
  return out;
};

const toPoints = (verts: PathVertex[]): PolylineVertexLike[] =>
  verts.map((v) => ({ x: v.p.x, y: v.p.y, bulge: v.bulge }));
