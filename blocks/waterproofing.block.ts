// Waterproofing Block — a membrane band along the picked point chain: a
// closed outline offset ±width/2 (mitered corners, flat end caps — like the
// Rebar outline but with no bending radius) plus a dashed centerline.
import { defineBlock } from "lineadraw";
import type { Polyline, Vec2 } from "lineadraw";
import { sub, add, scale, norm, len, rotate } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/waterproofing",
  name: "Waterproofing",
  description:
    "Draws a waterproofing membrane band along picked points: a closed outline of the given width with a dashed centerline.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "waterproofing", "membrane", "detail"],
  params: [
    { name: "width", label: "Width", type: "number", default: 10, min: 0.1 },
    {
      name: "segLength",
      label: "Seg. length",
      type: "number",
      default: 20,
      min: 0.1,
    },
  ],
  // A short L-run reads as a membrane band; the stand-in picks would zigzag
  // through 16 grid points.
  previewInputs: [[0, 40], [0, 0], [80, 0]],
  place: async ({ pickPoint }) => {
    const points: Vec2[] = [];
    try {
      for (;;) points.push(await pickPoint(`Point ${points.length + 1}`));
    } catch (e) {
      // Escape finishes the collection; rethrowing the cancel rejection when
      // there's no band yet lets the insert tool exit instead of placing.
      if (points.length < 2) throw e;
    }
    return points;
  },
  draw: ({ params, inputs }) => {
    const { width, segLength } = params;
    // Drop consecutive duplicate picks — zero-length segments break offsets.
    const pts: Vec2[] = [];
    for (const v of inputs) {
      if (pts.length === 0 || len(sub(v, pts[pts.length - 1])) > EPS)
        pts.push(v);
    }
    if (pts.length < 2) return [];

    const left = offsetChain(pts, width);

    const outline: Polyline = {
      type: "polyline",
      points: [...pts, ...left.reverse()],
      closed: true,
    };

    const loops: {
      points: readonly PolylineVertexLike[];
    }[] = [];

    for (let i = 0; i < pts.length - 1; i++) {
      const segmentLoops = getLoops(pts[i], pts[i + 1], width, segLength).map(
        (loop) => ({
          points: loop,
        }),
      );
      loops.push(...segmentLoops);
    }

    const hatch: Hatch = {
      type: "hatch",
      loops: loops,
      fill: {
        kind: "solid",
      },
    };
    return [outline, hatch];
  },
});

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

/**
 * Offset an open chain by h (+ = left of travel, − = right): endpoints move
 * perpendicular to their segment, interior corners miter (plain
 * perpendicular offset when the segments are near-collinear).
 */
const offsetChain = (pts: Vec2[], h: number): Vec2[] => {
  const dirs = pts.slice(0, -1).map((p, i) => norm(sub(pts[i + 1], p)));
  return pts.map((p, i) => {
    if (i === 0) return add(p, scale(leftNormal(dirs[0]), h));
    if (i === pts.length - 1) return add(p, scale(leftNormal(dirs[i - 1]), h));
    const n1 = leftNormal(dirs[i - 1]);
    const n2 = leftNormal(dirs[i]);
    const m = intersect(
      add(p, scale(n1, h)),
      dirs[i - 1],
      add(p, scale(n2, h)),
      dirs[i],
    );
    return m ?? add(p, scale(n1, h));
  });
};

const getLoops = (
  start: Vec2,
  end: Vec2,
  width: number,
  step: number,
): PolylineVertexLike[][] => {
  const length = len(sub(end, start));
  const dir = norm(sub(end, start));
  const normal = rotate(dir, Math.PI / 2);
  const n = Math.ceil(length / step);

  const loops: PolylineVertexLike[][] = [];
  for (let i = 0; i < n; i += 2) {
    const t0 = (i / n) * length;
    const t1 = ((i + 1) / n) * length;
    const p0 = add(start, scale(dir, t0));
    const p1 = add(start, scale(dir, t1));
    loops.push([
      p0,
      p1,
      add(p1, scale(normal, width)),
      add(p0, scale(normal, width)),
    ]);
  }

  return loops;
};
