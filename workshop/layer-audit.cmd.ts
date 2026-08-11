// Layer Audit — lists every layer with its object count and offers to
// remove the empty, non-current ones.
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/layer-audit",
  name: "Layer Audit",
  description:
    "Shows object counts per layer and removes empty layers on confirmation.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["layers", "cleanup", "utility"],
  run: async ({ document, prompt, showToast }) => {
    const layers = document.listLayers();
    const rows = layers.map((l) => ({
      ...l,
      count: document.query({ layer: l.id }).length,
    }));
    const summary = rows.map((l) => `${l.name}: ${l.count}`).join(", ");

    const empties = rows.filter((l) => l.count === 0 && !l.current);
    if (!empties.length) {
      showToast(`${layers.length} layer(s) — ${summary}`, "info");
      return;
    }

    const answer = (
      await prompt(
        `${summary}. Remove ${empties.length} empty layer(s): ${empties
          .map((l) => l.name)
          .join(", ")}? (y/N)`,
        { initial: "n" },
      )
    )
      .trim()
      .toLowerCase();
    if (!answer.startsWith("y")) {
      showToast("Layers left unchanged", "info");
      return;
    }
    for (const l of empties) document.removeLayer(l.id);
    showToast(`Removed ${empties.length} empty layer(s)`, "success");
  },
});
