// Area Label — pick closed shapes one after another and place a text with
// each one's area in m². Escape finishes the loop.
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/area-label",
  name: "Area Label",
  description: "Labels picked closed shapes with their area in m².",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["measure", "annotation", "utility"],
  run: async ({ document, pickObject, pickPoint, prompt, showToast }) => {
    const scale =
      parseFloat(await prompt("Annotation scale", { initial: "50" })) || 50;

    let count = 0;
    try {
      for (;;) {
        const id = await pickObject("Closed shape (Esc to finish)");
        const area = document.measure(id).area;
        if (area == null) {
          showToast("That object has no area — pick a closed shape", "error");
          continue;
        }
        const position = await pickPoint("Label position");
        document.add([
          {
            type: "text",
            position,
            content: `${(area / 1e6).toFixed(2)} m²`,
            hAlign: "center",
            vAlign: "center",
            scale,
          },
        ]);
        count++;
      }
    } catch {
      // Escape — done collecting.
    }
    showToast(
      count ? `Labeled ${count} shape(s)` : "Nothing labeled",
      count ? "success" : "info",
    );
  },
});
