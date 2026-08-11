// Offset Polyline — creates a copy of a picked line or straight-segment
// polyline offset by a distance (positive = left of the travel
// direction), with mitered corners.
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/offset-polyline",
  name: "Offset Polyline",
  description:
    "Offsets a line or straight polyline by a distance (+ = left of direction).",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["edit", "polyline", "utility"],
  run: async ({ document, pickObject, prompt, showToast }) => {
    const id = await pickObject("Line or polyline to offset");
    const [obj] = document.query({ ids: [id] });
    let pts: Vec2[];
    let closed = false;
    if (obj?.type === "line") {
      pts = [obj.a, obj.b];
    } else if (obj?.type === "polyline") {
      if (obj.points.some((p) => p.bulge !== 0)) {
        showToast("Polylines with arc segments are not supported", "error");
        return;
      }
      pts = obj.points.map((p) => ({ x: p.x, y: p.y }));
      closed = obj.closed;
    } else {
      showToast("Pick a line or a polyline", "error");
      return;
    }

    const d = parseFloat(
      await prompt("Distance (+ = left of direction)", { initial: "100" }),
    );
    if (!Number.isFinite(d) || d === 0) {
      showToast("Invalid distance", "error");
      return;
    }

    const n = pts.length;
    const segs = closed ? n : n - 1;
    const dirs: Vec2[] = [];
    const offs: Vec2[] = []; // per-segment offset vector (left normal × d)
    for (let i = 0; i < segs; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      if (l < 1e-9) {
        showToast("Zero-length segment — cannot offset", "error");
        return;
      }
      const dir = { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
      dirs.push(dir);
      offs.push({ x: -dir.y * d, y: dir.x * d });
    }

    // Intersection of the offset lines of segments i (incoming) and k
    // (outgoing) — the mitered corner at vertex k.
    const miter = (i: number, k: number): Vec2 => {
      const A = { x: pts[i].x + offs[i].x, y: pts[i].y + offs[i].y };
      const B = { x: pts[k].x + offs[k].x, y: pts[k].y + offs[k].y };
      const u = dirs[i];
      const v = dirs[k];
      const cross = u.x * v.y - u.y * v.x;
      if (Math.abs(cross) < 1e-9) return B; // collinear — plain offset
      const t = ((B.x - A.x) * v.y - (B.y - A.y) * v.x) / cross;
      return { x: A.x + t * u.x, y: A.y + t * u.y };
    };

    const out: Vec2[] = [];
    for (let j = 0; j < n; j++) {
      if (closed) out.push(miter((j - 1 + segs) % segs, j % segs));
      else if (j === 0)
        out.push({ x: pts[0].x + offs[0].x, y: pts[0].y + offs[0].y });
      else if (j === n - 1)
        out.push({
          x: pts[j].x + offs[segs - 1].x,
          y: pts[j].y + offs[segs - 1].y,
        });
      else out.push(miter(j - 1, j));
    }

    const layerName = new Map(document.listLayers().map((l) => [l.id, l.name]));
    document.add([
      { type: "polyline", points: out, closed, layer: layerName.get(obj.layerId) },
    ]);
    showToast(`Offset by ${d} mm`, "success");
  },
});
