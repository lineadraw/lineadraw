// Chain Dimension — pick measurement points one after another (Escape to
// finish), then place the dimension line; creates one chained linear
// dimension through all the points.
import { defineCommand } from "lineadraw";
import type { Vec2 } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/chain-dimension",
  name: "Chain Dimension",
  description:
    "Creates a chained linear dimension through successively picked points.",
  version: "1.0.1",
  authors: ["Linea Team"],
  tags: ["dimension", "annotation", "utility"],
  run: async ({ document, editor }) => {
    if (!editor) throw new Error("Chain Dimension needs the editor");
    const points: Vec2[] = [];
    try {
      for (;;)
        points.push(
          await editor.pickPoint({
            label: `Point ${points.length + 1} (Esc to finish)`,
          }),
        );
    } catch (e) {
      if (points.length < 2) throw e; // cancelled for real
    }
    const linePos = await editor.pickPoint({
      label: "Dimension line position",
    });
    const scale =
      parseFloat(await editor.prompt("Drawing scale 1:", { initial: "50" })) ||
      50;

    // The dimension line through linePos measures along the perpendicular
    // of (linePos − points[0]); offset is signed, + = left of that axis.
    const v = { x: linePos.x - points[0].x, y: linePos.y - points[0].y };
    const vLen = Math.hypot(v.x, v.y);
    let rotation: number | undefined;
    let offset = 0;
    if (vLen >= 1e-9) {
      let ux = -v.y / vLen;
      let uy = v.x / vLen;
      if (ux < 0 || (ux === 0 && uy < 0)) {
        ux = -ux;
        uy = -uy;
      }
      rotation = Math.atan2(uy, ux);
      offset = v.x * -uy + v.y * ux;
    }

    document.add([
      {
        type: "dimension",
        points,
        rotation,
        offset,
        scale,
      },
    ]);
    editor.toast(`Dimension chain through ${points.length} points`, "success");
  },
});
