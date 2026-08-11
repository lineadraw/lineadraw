// Duplicate Cleaner — finds objects whose geometry coincides exactly
// (within 0.01 mm) with an earlier object of the same type on the same
// layer, and removes them. Scoped to the selection when one is active.
import { defineCommand } from "lineadraw";

const r = (v: number) => Math.round(v * 100) / 100;
const pt = (p: Vec2) => `${r(p.x)},${r(p.y)}`;

const keyOf = (o: ExistingObject): string | null => {
  switch (o.type) {
    case "line": {
      const ends = [pt(o.a), pt(o.b)].sort();
      return `line|${o.layerId}|${ends.join("|")}`;
    }
    case "circle":
      return `circle|${o.layerId}|${pt(o.center)}|${r(o.radius)}`;
    case "arc":
      return `arc|${o.layerId}|${pt(o.center)}|${r(o.radius)}|${r(o.startAngle)}|${r(o.endAngle)}`;
    case "point":
      return `point|${o.layerId}|${pt(o.p)}`;
    case "text":
      return `text|${o.layerId}|${pt(o.position)}|${r(o.rotation)}|${o.content}`;
    case "polyline":
      return `pl|${o.layerId}|${o.closed}|${o.points
        .map((p) => `${pt(p)},${r(p.bulge)}`)
        .join(";")}`;
    default:
      return null; // hatches, dimensions, blocks etc. are left alone
  }
};

export default defineCommand({
  id: "@lineadraw/duplicate-cleaner",
  name: "Duplicate Cleaner",
  description:
    "Removes exactly overlapping duplicate lines, circles, arcs, texts, points and polylines.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["cleanup", "utility"],
  run: async ({ document, selection, showToast }) => {
    const sel = selection();
    const objects = sel.length ? document.query({ ids: sel }) : document.query({});

    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const o of objects) {
      const key = keyOf(o);
      if (key === null) continue;
      if (seen.has(key)) dupes.push(o.id);
      else seen.add(key);
    }

    if (!dupes.length) {
      showToast("No duplicates found", "info");
      return;
    }
    document.remove(dupes);
    showToast(`Removed ${dupes.length} duplicate(s)`, "success");
  },
});
