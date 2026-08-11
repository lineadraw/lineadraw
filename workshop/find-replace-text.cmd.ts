// Find & Replace Text — replaces every occurrence of a substring in text
// objects; scoped to the selection when one is active, otherwise the
// whole model.
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/find-replace-text",
  name: "Find & Replace Text",
  description:
    "Replaces a substring in all texts (selection if active, else whole model).",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["text", "edit", "utility"],
  run: async ({ document, selection, prompt, showToast }) => {
    const find = await prompt("Find");
    if (find === "") {
      showToast("Nothing to find", "error");
      return;
    }
    const replace = await prompt("Replace with", { initial: "" });

    const sel = selection();
    const texts = document.query({
      type: "text",
      content: find,
      ...(sel.length ? { ids: sel } : {}),
    });

    const patches = texts.flatMap((t) =>
      t.type === "text"
        ? [{ id: t.id, content: t.content.split(find).join(replace) }]
        : [],
    );
    if (!patches.length) {
      showToast(`"${find}" not found`, "info");
      return;
    }
    document.update(patches);
    showToast(`Replaced in ${patches.length} text(s)`, "success");
  },
});
