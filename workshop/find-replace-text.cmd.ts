// Find & Replace Text — replaces every occurrence of a substring in text
// objects; scoped to the selection when one is active, otherwise the
// whole model.
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/find-replace-text",
  name: "Find & Replace Text",
  description:
    "Replaces a substring in all texts (selection if active, else whole model).",
  version: "1.0.1",
  authors: ["Linea Team"],
  tags: ["text", "edit", "utility"],
  run: async ({ document, editor }) => {
    if (!editor) throw new Error("Find & Replace Text needs the editor");
    const find = await editor.prompt("Find");
    if (find === "") {
      editor.toast("Nothing to find", "error");
      return;
    }
    const replace = await editor.prompt("Replace with", { initial: "" });

    const sel = editor.state().selectedIds;
    const texts = document.listObjects({
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
      editor.toast(`"${find}" not found`, "info");
      return;
    }
    document.update(patches);
    editor.toast(`Replaced in ${patches.length} text(s)`, "success");
  },
});
