// Select Similar — pick one reference object and select everything of the
// same type (block instances match per definition), optionally restricted
// to the same layer.
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/select-similar",
  name: "Select Similar",
  description:
    "Selects all objects of the same type (and block definition) as a picked one.",
  version: "1.0.1",
  authors: ["Linea Team"],
  tags: ["selection", "filter", "utility"],
  run: async ({ document, editor }) => {
    if (!editor) throw new Error("Select Similar needs the editor");
    const id = await editor.pickObject({ label: "Reference object" });
    const [ref] = document.listObjects({ ids: [id] });
    if (!ref) {
      editor.toast("Object not found", "error");
      return;
    }
    const matchLayer = (
      await editor.prompt("Match layer too? (y/N)", { initial: "n" })
    )
      .trim()
      .toLowerCase()
      .startsWith("y");

    const matches = document.listObjects({}).filter((o) => {
      if (o.type !== ref.type) return false;
      if (matchLayer && o.layerId !== ref.layerId) return false;
      if (ref.type === "block" && o.type === "block")
        return o.definitionId === ref.definitionId;
      return true;
    });

    editor.setSelection(matches.map((o) => o.id));
    const what =
      ref.type === "block" ? `block ${ref.definitionId}` : ref.type;
    editor.toast(`Selected ${matches.length} × ${what}`, "success");
  },
});
