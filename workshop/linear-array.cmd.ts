// Linear Array — repeats the current selection along a picked
// displacement vector, N copies at cumulative multiples of it.
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/linear-array",
  name: "Linear Array",
  description: "Copies the selection N times along a picked vector.",
  version: "1.0.1",
  authors: ["Linea Team"],
  tags: ["edit", "array", "utility"],
  run: async ({ document, editor }) => {
    if (!editor) throw new Error("Linear Array needs the editor");
    const ids = editor.state().selectedIds;
    if (!ids.length) {
      editor.toast("Nothing selected", "error");
      return;
    }
    const base = await editor.pickPoint({ label: "Base point" });
    const target = await editor.pickPoint({
      label: "Displacement to first copy",
    });
    const count = Math.round(
      parseFloat(await editor.prompt("Number of copies", { initial: "3" })),
    );
    if (!Number.isFinite(count) || count < 1) {
      editor.toast("Invalid copy count", "error");
      return;
    }

    const made = document.array(ids, count, {
      x: target.x - base.x,
      y: target.y - base.y,
    });
    editor.toast(
      `Created ${made.length} object(s) in ${count} copies`,
      "success",
    );
  },
});
