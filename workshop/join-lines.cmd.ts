// Join Lines — merges selected straight lines whose endpoints touch into
// polylines (closed when the chain loops back on itself). The joined
// polyline lands on the first line's layer.
import { defineCommand } from "lineadraw";

const TOL = 0.01; // endpoint match tolerance, mm

export default defineCommand({
  id: "@lineadraw/join-lines",
  name: "Join Lines",
  description: "Joins touching selected lines into polylines.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["edit", "polyline", "utility"],
  run: async ({ document, selection, showToast }) => {
    const ids = selection();
    if (!ids.length) {
      showToast("Nothing selected", "error");
      return;
    }
    const pool = document
      .query({ ids, type: "line" })
      .flatMap((o) => (o.type === "line" ? [o] : []));
    if (pool.length < 2) {
      showToast("Select at least two lines", "error");
      return;
    }
    const near = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y) <= TOL;
    const layerName = new Map(
      document.listLayers().map((l) => [l.id, l.name]),
    );

    const used = new Set<string>();
    let chains = 0;
    let joined = 0;
    for (const seed of pool) {
      if (used.has(seed.id)) continue;
      used.add(seed.id);
      const chain: Vec2[] = [seed.a, seed.b];
      const members = [seed.id];

      let grew = true;
      while (grew) {
        grew = false;
        for (const cand of pool) {
          if (used.has(cand.id)) continue;
          const head = chain[0];
          const tail = chain[chain.length - 1];
          if (near(cand.a, tail)) chain.push(cand.b);
          else if (near(cand.b, tail)) chain.push(cand.a);
          else if (near(cand.a, head)) chain.unshift(cand.b);
          else if (near(cand.b, head)) chain.unshift(cand.a);
          else continue;
          used.add(cand.id);
          members.push(cand.id);
          grew = true;
        }
      }
      if (members.length < 2) continue; // lone line — leave it be

      const closed = chain.length > 3 && near(chain[0], chain[chain.length - 1]);
      document.add([
        {
          type: "polyline",
          points: closed ? chain.slice(0, -1) : chain,
          closed,
          layer: layerName.get(seed.layerId),
        },
      ]);
      document.remove(members);
      chains++;
      joined += members.length;
    }

    showToast(
      joined
        ? `Joined ${joined} lines into ${chains} polyline(s)`
        : "No touching lines found",
      joined ? "success" : "info",
    );
  },
});
