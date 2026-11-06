// Waterproofing Block — a membrane band along the picked point chain: a
// closed outline offset `width` to the left (mitered corners, flat end
// caps) with every other `segLength` stretch of each segment filled solid.
import { defineBlock } from "lineadraw";
import type {
  HatchInput,
  PolylineInput,
  PolylineVertexInput,
  Vec2,
} from "lineadraw";
import { sub, add, scale, norm, len, rotate } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/waterproofing",
  name: "Waterproofing",
  description:
    "Draws a waterproofing membrane band along picked points: a closed outline of the given width, filled in alternating solid segments.",
  version: "1.0.1",
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
  previewInputs: [
    [0, 80],
    [0, 0],
    [80, 0],
  ],
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

    const outline: PolylineInput = {
      type: "polyline",
      points: [...pts, ...offsetChain(pts, width).reverse()],
      closed: true,
    };
    const hatch: HatchInput = {
      type: "hatch",
      loops: pts
        .slice(1)
        .flatMap((b, i) => getLoops(pts[i], b, width, segLength))
        .map((points) => ({ points })),
      fill: { kind: "solid" },
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

/** The filled stretches of one segment: every other one of
 * ceil(length / step) equal pieces, each a quad `width` to the left. */
const getLoops = (
  start: Vec2,
  end: Vec2,
  width: number,
  step: number,
): PolylineVertexInput[][] => {
  const length = len(sub(end, start));
  const dir = norm(sub(end, start));
  const normal = rotate(dir, Math.PI / 2);
  const n = Math.ceil(length / step);

  const loops: PolylineVertexInput[][] = [];
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
