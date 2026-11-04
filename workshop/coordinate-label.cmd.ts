// Coordinate Label — pick points and place X/Y coordinate texts with a
// leader pointing at each picked point. Escape finishes the loop.
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/coordinate-label",
  name: "Coordinate Label",
  description: "Places X/Y coordinate labels with leaders at picked points.",
  version: "1.0.1",
  authors: ["Linea Team"],
  tags: ["annotation", "coordinates", "utility"],
  run: async ({ document, editor }) => {
    if (!editor) throw new Error("Coordinate Label needs the editor");
    const scale =
      parseFloat(await editor.prompt("Annotation scale", { initial: "50" })) ||
      50;

    let count = 0;
    try {
      for (;;) {
        const target = await editor.pickPoint({
          label: "Point to label (Esc to finish)",
        });
        const at = await editor.pickPoint({ label: "Text position" });
        document.add([
          {
            type: "text",
            position: at,
            content: `X=${target.x.toFixed(0)}\nY=${target.y.toFixed(0)}`,
            hAlign: at.x >= target.x ? "left" : "right",
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
    editor.toast(
      count ? `Labeled ${count} point(s)` : "Nothing labeled",
      count ? "success" : "info",
    );
  },
});
