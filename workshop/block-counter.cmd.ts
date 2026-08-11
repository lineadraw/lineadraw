// Block Counter — counts block instances per definition and places the
// tally as a tab-aligned table text at a picked point (bill of materials
// starting point: bolts, piles, fixings...).
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/block-counter",
  name: "Block Counter",
  description:
    "Counts block instances per definition and places a table of the tally.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["schedule", "blocks", "utility"],
  run: async ({ document, pickPoint, prompt, showToast }) => {
    const blocks = document.query({ type: "block" });
    if (!blocks.length) {
      showToast("No block instances in the model", "info");
      return;
    }

    const counts = new Map<string, number>();
    for (const b of blocks)
      if (b.type === "block")
        counts.set(b.definitionId, (counts.get(b.definitionId) ?? 0) + 1);

    const rows = [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([def, count]) => `${def}\t${count}`);

    const position = await pickPoint("Table position (top-left)");
    const scale =
      parseFloat(await prompt("Annotation scale", { initial: "50" })) || 50;

    document.add([
      {
        type: "text",
        position,
        content: ["BLOCK\tPCS", ...rows].join("\n"),
        hAlign: "right",
        vAlign: "bottom",
        scale,
      },
    ]);
    showToast(
      `${blocks.length} instance(s) of ${counts.size} definition(s)`,
      "success",
    );
  },
});
