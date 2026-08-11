// Coordinate Label — pick points and place X/Y coordinate texts with a
// leader pointing at each picked point. Escape finishes the loop.
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/coordinate-label",
  name: "Coordinate Label",
  description: "Places X/Y coordinate labels with leaders at picked points.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["annotation", "coordinates", "utility"],
  run: async ({ document, pickPoint, prompt, showToast }) => {
    const scale =
      parseFloat(await prompt("Annotation scale", { initial: "50" })) || 50;

    let count = 0;
    try {
      for (;;) {
        const target = await pickPoint("Point to label (Esc to finish)");
        const at = await pickPoint("Text position");
        document.add([
          {
            type: "text",
            position: at,
            content: `X=${target.x.toFixed(0)}\nY=${target.y.toFixed(0)}`,
            hAlign: at.x >= target.x ? "right" : "left",
            vAlign: "center",
            leaderLines: [[target, at]],
            scale,
          },
        ]);
        count++;
      }
    } catch {
      // Escape — done collecting.
    }
    showToast(
      count ? `Labeled ${count} point(s)` : "Nothing labeled",
      count ? "success" : "info",
    );
  },
});
