// Select Similar — pick one reference object and select everything of the
// same type (block instances match per definition), optionally restricted
// to the same layer.
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/select-similar",
  name: "Select Similar",
  description:
    "Selects all objects of the same type (and block definition) as a picked one.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["selection", "filter", "utility"],
  run: async ({ document, pickObject, setSelection, prompt, showToast }) => {
    const id = await pickObject("Reference object");
    const [ref] = document.query({ ids: [id] });
    if (!ref) {
      showToast("Object not found", "error");
      return;
    }
    const matchLayer = (
      await prompt("Match layer too? (y/N)", { initial: "n" })
    )
      .trim()
      .toLowerCase()
      .startsWith("y");

    const matches = document.query({}).filter((o) => {
      if (o.type !== ref.type) return false;
      if (matchLayer && o.layerId !== ref.layerId) return false;
      if (ref.type === "block" && o.type === "block")
        return o.definitionId === ref.definitionId;
      return true;
    });

    setSelection(matches.map((o) => o.id));
    const what =
      ref.type === "block" ? `block ${ref.definitionId}` : ref.type;
    showToast(`Selected ${matches.length} × ${what}`, "success");
  },
});
