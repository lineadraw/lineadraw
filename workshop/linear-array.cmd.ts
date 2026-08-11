// Linear Array — repeats the current selection along a picked
// displacement vector, N copies at cumulative multiples of it.
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/linear-array",
  name: "Linear Array",
  description: "Copies the selection N times along a picked vector.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["edit", "array", "utility"],
  run: async ({ document, selection, pickPoint, prompt, showToast }) => {
    const ids = selection();
    if (!ids.length) {
      showToast("Nothing selected", "error");
      return;
    }
    const base = await pickPoint("Base point");
    const target = await pickPoint("Displacement to first copy");
    const count = Math.round(
      parseFloat(await prompt("Number of copies", { initial: "3" })),
    );
    if (!Number.isFinite(count) || count < 1) {
      showToast("Invalid copy count", "error");
      return;
    }

    const made = document.array(ids, count, {
      x: target.x - base.x,
      y: target.y - base.y,
    });
    showToast(`Created ${made.length} object(s) in ${count} copies`, "success");
  },
});
