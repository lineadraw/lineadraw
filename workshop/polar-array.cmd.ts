// Polar Array — distributes copies of the current selection around a
// picked center, evenly filling the full circle.
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/polar-array",
  name: "Polar Array",
  description:
    "Copies the selection around a center point, evenly over 360°.",
  version: "1.0.1",
  authors: ["Linea Team"],
  tags: ["edit", "array", "utility"],
  run: async ({ document, editor }) => {
    if (!editor) throw new Error("Polar Array needs the editor");
    const ids = editor.state().selectedIds;
    if (!ids.length) {
      editor.toast("Nothing selected", "error");
      return;
    }
    const center = await editor.pickPoint({ label: "Center point" });
    const total = Math.round(
      parseFloat(
        await editor.prompt("Total items (including original)", {
          initial: "6",
        }),
      ),
    );
    if (!Number.isFinite(total) || total < 2) {
      editor.toast("Need at least 2 items", "error");
      return;
    }

    const step = (2 * Math.PI) / total;
    let created = 0;
    for (let i = 1; i < total; i++) {
      const copies = document.copy(ids, { x: 0, y: 0 });
      document.rotate(copies, i * step, center);
      created += copies.length;
    }
    editor.toast(
      `Created ${created} object(s) in ${total - 1} copies`,
      "success",
    );
  },
});
