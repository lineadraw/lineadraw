// Block Counter — counts block instances per definition and places the
// tally as a tab-aligned table text at a picked point (bill of materials
// starting point: bolts, piles, fixings...).
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/block-counter",
  name: "Block Counter",
  description:
    "Counts block instances per definition and places a table of the tally.",
  version: "1.0.1",
  authors: ["Linea Team"],
  tags: ["schedule", "blocks", "utility"],
  run: async ({ document, editor }) => {
    if (!editor) throw new Error("Block Counter needs the editor");
    const blocks = document.listObjects({ type: "block" });
    if (!blocks.length) {
      editor.toast("No block instances in the model", "info");
      return;
    }

    const counts = new Map<string, number>();
    for (const b of blocks)
      if (b.type === "block")
        counts.set(b.definitionId, (counts.get(b.definitionId) ?? 0) + 1);

    const rows = [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([def, count]) => `${def}\t${count}`);

    const position = await editor.pickPoint({
      label: "Table position (top-left)",
    });
    const scale =
      parseFloat(await editor.prompt("Annotation scale", { initial: "50" })) ||
      50;

    document.add([
      {
        type: "text",
        position,
        content: ["BLOCK\tPCS", ...rows].join("\n"),
        hAlign: "left",
        vAlign: "top",
        scale,
      },
    ]);
    editor.toast(
      `${blocks.length} instance(s) of ${counts.size} definition(s)`,
      "success",
    );
  },
});
