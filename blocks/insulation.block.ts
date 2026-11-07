// Insulation Block — fills the band of `width` on the LEFT of the picked
// point chain with the standard insulation symbol: a ~60° triangle zigzag
// for hard (rigid) insulation, or a rectangular zigzag (square wave) with
// rounded corners for soft (batt) insulation. Each segment gets its own
// whole number of teeth, starting and ending on the base, so the pattern
// runs on unbroken through the corners; on the inside of a corner the top
// vertices stop at the miter instead of crossing the next segment's band.
// Vertices sit exactly on the two edges and fillets only cut inward, so the
// rendering never exceeds `width`.
import { defineBlock } from "lineadraw";
import type { PolylineInput, PolylineVertexInput, Vec2 } from "lineadraw";
import { sub, add, scale, len } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/insulation",
  name: "Insulation",
  description:
    "Draws the standard insulation symbol of the given width along picked points: a triangle zigzag for hard (rigid) insulation, a rounded square wave for soft (batt) insulation.",
  // 1.1.0: an editable point chain (add / remove points) instead of a line.
  version: "1.1.0",
  authors: ["Linea Team"],
  tags: ["architecture", "structural", "insulation", "detail"],
  params: [
    { name: "width", label: "Width", type: "number", default: 100, min: 1 },
    {
      name: "type",
      label: "Type",
      type: "enum",
      default: "hard",
      options: [
        { value: "soft", label: "Soft insulation" },
        { value: "hard", label: "Hard insulation" },
      ],
    },
  ],
  inputs: [
    { name: "path", label: "Insulation points", type: "points", min: 2 },
  ],
  previewInputs: {
    path: [
      [0, 0],
      [500, 0],
    ],
  },
  draw: ({ params, inputs }) => {
    const { width } = params;
    if (width <= 0) return [];
    const hard = params.type === "hard";
    // Drop consecutive duplicate picks — zero-length segments break miters.
    const path: Vec2[] = [];
    for (const v of inputs.path)
      if (!path.length || len(sub(v, path[path.length - 1])) > 1e-9)
        path.push(v);
    // How far the top edge stops short of each vertex (inside corners).
    const inset = path.map((p, i) =>
      insideInset(path[i - 1], p, path[i + 1], width),
    );
    const chain: Vec2[] = [];
    let shortestRun = Infinity; // soft: the narrowest run of any segment
    for (let i = 0; i + 1 < path.length; i++) {
      const band = bandOf(path[i], path[i + 1], width, inset[i], inset[i + 1]);
      let seg: Vec2[];
      if (hard) seg = hardTeeth(band, width);
      else {
        const wave = softWave(band, width);
        seg = wave.points;
        shortestRun = Math.min(shortestRun, wave.run);
      }
      // Segments share their joint vertex (both start/end on the base), and
      // top points clamped at an inside corner can coincide: skip repeats.
      for (const q of seg) {
        const last = chain[chain.length - 1];
        if (!last || len(sub(q, last)) > 1e-9) chain.push(q);
      }
    }
    if (chain.length < 2) return [];
    if (hard) {
      const zigzag: PolylineInput = {
        type: "polyline",
        points: chain.map((p) => ({ ...p, bulge: 0 })),
        closed: false,
      };
      return [zigzag];
    }
    // Corner radius width/4, capped so short runs stay fully rounded instead
    // of snapping back to sharp when the fillet wouldn't fit.
    const wave: PolylineInput = {
      type: "polyline",
      points: filletChain(chain, Math.min(width / 4, 0.499 * shortestRun)),
      closed: false,
    };
    return [wave];
  },
});

/** One segment's band, base a→b with the top `width` to its left, by
 * station t along it. The top is usable in [lo, hi]: it stops short of
 * an inside corner. */
const bandOf = (
  a: Vec2,
  b: Vec2,
  width: number,
  startInset: number,
  endInset: number,
) => {
  const v = sub(b, a);
  const length = len(v);
  const d = length < 1e-9 ? { x: 1, y: 0 } : scale(v, 1 / length);
  const n = { x: -d.y, y: d.x };
  const lo = Math.min(startInset, length / 2);
  const hi = Math.max(length - endInset, length / 2);
  const base = (t: number): Vec2 => add(a, scale(d, t));
  return {
    length,
    lo,
    hi,
    base,
    /** Clamped into [lo, hi]. */
    top: (t: number): Vec2 =>
      add(base(Math.min(Math.max(t, lo), hi)), scale(n, width)),
  };
};
type Band = ReturnType<typeof bandOf>;

/** At a left turn (the band's side) the two bands' top edges cross
 * `width · tan(turn / 2)` before the corner; 0 at ends and right turns. */
const insideInset = (
  prev: Vec2 | undefined,
  p: Vec2,
  next: Vec2 | undefined,
  width: number,
): number => {
  if (!prev || !next) return 0;
  const vIn = sub(p, prev);
  const vOut = sub(next, p);
  const cross = vIn.x * vOut.y - vIn.y * vOut.x;
  if (cross <= 0) return 0;
  const turn = Math.atan2(cross, vIn.x * vOut.x + vIn.y * vOut.y);
  return width * Math.tan(Math.min(turn, 3) / 2);
};

/** Hard: a triangle zigzag between the base and the top. An EVEN segment
 * count lands the last vertex back on the base; the span targets a 60°
 * tooth slope. Apexes past an inside corner's miter stop at it. */
const hardTeeth = ({ length, base, top }: Band, width: number): Vec2[] => {
  if (length < 1e-9) return [];
  const span = width / Math.tan(Math.PI / 3);
  const nSeg = Math.max(2, 2 * Math.round(length / (2 * span)));
  const points: Vec2[] = [];
  for (let i = 0; i <= nSeg; i++) {
    const t = (i / nSeg) * length;
    points.push(i % 2 ? top(t) : base(t));
  }
  return points;
};

/** Soft: a rectangular zigzag — full-width legs joined by runs on
 * alternating edges (corners rounded later) over the stretch where the top
 * is usable, the base running straight on into inside corners. An ODD run
 * count starts up from the base and ends back on it; the run targets
 * width/2 (period ≈ width). */
const softWave = (
  { length, lo, hi, base, top }: Band,
  width: number,
): { points: Vec2[]; run: number } => {
  if (length < 1e-9) return { points: [], run: Infinity };
  const stretch = hi - lo;
  if (stretch < 1e-9) return { points: [base(0), base(length)], run: Infinity };
  const runs = Math.max(1, 2 * Math.round((stretch / (width / 2) - 1) / 2) + 1);
  const a = stretch / runs;
  const points: Vec2[] = [base(0)];
  for (let j = 0; j <= runs; j++) {
    const t = lo + j * a;
    if (j % 2) points.push(top(t), base(t));
    else points.push(base(t), top(t));
  }
  points.push(base(length));
  return { points, run: a };
};

/**
 * Fillet the interior corners of a point chain with radius rc (bulge arcs).
 * A corner stays sharp when its tangent length doesn't fit half of either
 * leg — the fillet only ever cuts INTO the corner, never past it.
 */
const filletChain = (pts: Vec2[], rc: number): PolylineVertexInput[] => {
  const out: PolylineVertexInput[] = [{ ...pts[0], bulge: 0 }];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const vIn = sub(p, pts[i - 1]);
    const vOut = sub(pts[i + 1], p);
    const lIn = len(vIn);
    const lOut = len(vOut);
    const dIn = scale(vIn, 1 / lIn);
    const dOut = scale(vOut, 1 / lOut);
    const crossZ = dIn.x * dOut.y - dIn.y * dOut.x;
    const dot = dIn.x * dOut.x + dIn.y * dOut.y;
    const turn = Math.atan2(Math.abs(crossZ), dot);
    const t = rc * Math.tan(turn / 2);
    if (turn < 1e-4 || turn > Math.PI - 1e-4 || t > lIn / 2 || t > lOut / 2) {
      out.push({ ...p, bulge: 0 });
      continue;
    }
    out.push({
      ...sub(p, scale(dIn, t)),
      bulge: Math.sign(crossZ) * Math.tan(turn / 4),
    });
    out.push({ ...add(p, scale(dOut, t)), bulge: 0 });
  }
  out.push({ ...pts[pts.length - 1], bulge: 0 });
  return out;
};
