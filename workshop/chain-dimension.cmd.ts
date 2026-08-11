// Chain Dimension — pick measurement points one after another (Escape to
// finish), then place the dimension line; creates one chained linear
// dimension through all the points.
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/chain-dimension",
  name: "Chain Dimension",
  description:
    "Creates a chained linear dimension through successively picked points.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["dimension", "annotation", "utility"],
  run: async ({ document, pickPoint, prompt, showToast }) => {
    const points: Vec2[] = [];
    try {
      for (;;)
        points.push(
          await pickPoint(`Point ${points.length + 1} (Esc to finish)`),
        );
    } catch (e) {
      if (points.length < 2) throw e; // cancelled for real
    }
    const linePos = await pickPoint("Dimension line position");
    const scale =
      parseFloat(await prompt("Drawing scale 1:", { initial: "50" })) || 50;

    document.add([
      {
        type: "dimension",
        points,
        offset: { x: linePos.x - points[0].x, y: linePos.y - points[0].y },
        scale,
      },
    ]);
    showToast(`Dimension chain through ${points.length} points`, "success");
  },
});
