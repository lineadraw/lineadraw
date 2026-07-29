// Insulation Block — fills the rectangle of `width` on the LEFT of the
// picked line with the standard insulation symbol: a ~60° triangle zigzag
// for hard (rigid) insulation, or a rectangular zigzag (square wave) with
// rounded corners for soft (batt) insulation. Vertices sit exactly on the
// two edges and fillets only cut inward, so the rendering never exceeds
// `width`.
import { defineBlock } from "lineadraw";
import type { Polyline, PolylineVertexLike } from "lineadraw";
import { sub, add, scale, len } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/insulation",
  name: "Insulation",
  description:
    "Draws insulation with a triangle zigzag for hard insulation or a rectangular zigzag for soft insulation.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "insulation", "building"],
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
  place: ["Start point", "End point"],
  draw: ({ params, inputs: [p1, p2] }) => {
    const v = sub(p2, p1);
    const length = len(v);
    const width = params.width;
    if (length < 1e-9 || width <= 0) return [];
    const d = scale(v, 1 / length);
    const n = { x: -d.y, y: d.x }; // left of p1→p2
    const at = (t: number, w: number): Vec2 =>
      add(add(p1, scale(d, t)), scale(n, w));

    if (params.type === "hard") {
      // Triangle zigzag between the two long edges: an EVEN segment count
      // lands the last vertex back on the base edge; the span targets a 60°
      // tooth slope.
      const span = width / Math.tan(Math.PI / 3);
      const nSeg = Math.max(2, 2 * Math.round(length / (2 * span)));
      const s = length / nSeg;
      const points: PolylineVertexLike[] = [];
      for (let i = 0; i <= nSeg; i++)
        points.push({ ...at(i * s, i % 2 ? width : 0), bulge: 0 });
      const zigzag: Polyline = { type: "polyline", points, closed: false };
      return [zigzag];
    }

    // Soft: rectangular zigzag — full-width vertical legs joined by runs on
    // alternating edges, corners rounded. An ODD leg count starts up from the
    // base and ends back on it; the run targets width/2 (period ≈ width).
    const runs = Math.max(
      1,
      2 * Math.round((length / (width / 2) - 1) / 2) + 1,
    );
    const a = length / runs;
    const base: Vec2[] = [];
    for (let j = 0; j <= runs; j++) {
      const from = j % 2 ? width : 0;
      base.push(at(j * a, from), at(j * a, width - from));
    }
    // Corner radius width/4, capped so short runs stay fully rounded instead
    // of snapping back to sharp when the fillet wouldn't fit.
    const rc = Math.min(width / 4, 0.499 * a);
    const wave: Polyline = {
      type: "polyline",
      points: filletChain(base, rc),
      closed: false,
    };
    return [wave];
  },
});

/**
 * Fillet the interior corners of a point chain with radius rc (bulge arcs).
 * A corner stays sharp when its tangent length doesn't fit half of either
 * leg — the fillet only ever cuts INTO the corner, never past it.
 */
const filletChain = (pts: Vec2[], rc: number): PolylineVertexLike[] => {
  const out: PolylineVertexLike[] = [{ ...pts[0], bulge: 0 }];
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
