// Narrow Selection — with a mixed selection active, lists the object
// types in it (block instances grouped per definition) and keeps only the
// chosen group selected, so the properties panel shows a uniform set.
// Answer the prompt with the group's number or a type-name prefix.
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/narrow-selection",
  name: "Narrow Selection",
  description:
    "Keeps only objects of one type (or block definition) in the current selection.",
  version: "2.0.2",
  authors: ["Linea Team"],
  tags: ["selection", "filter", "utility"],
  // Always asks which group to keep: agents and headless runs are told so.
  requiresEditor: true,
  run: async ({ document, editor }) => {
    if (!editor) throw new Error("Narrow Selection needs the editor");
    const ids = editor.state().selectedIds;
    if (!ids.length) {
      editor.toast("Nothing selected", "error");
      return;
    }

    // One group per object type; block instances split per definition so
    // "narrow to Axis" and "narrow to Grid" stay distinct choices.
    const groups = new Map<string, { label: string; ids: string[] }>();
    for (const o of document.listObjects({ ids })) {
      const key = o.type === "block" ? `block:${o.definitionId}` : o.type;
      const g = groups.get(key) ?? {
        label:
          o.type === "block" ? `block ${o.definitionId.slice(0, 8)}` : o.type,
        ids: [],
      };
      g.ids.push(o.id);
      groups.set(key, g);
    }
    if (groups.size < 2) {
      editor.toast("Selection is already a single type", "info");
      return;
    }

    const entries = [...groups.values()];
    const menu = entries
      .map((g, i) => `${i + 1}: ${g.label} ×${g.ids.length}`)
      .join("   ");
    const answer = (
      await editor.prompt(`Keep which? ${menu}`, {
        placeholder: "number or type",
      })
    )
      .trim()
      .toLowerCase();
    const chosen =
      entries[parseInt(answer, 10) - 1] ??
      entries.find((g) => g.label.toLowerCase().startsWith(answer));
    if (!chosen) {
      editor.toast(`No group matches "${answer}"`, "error");
      return;
    }

    editor.setSelection(chosen.ids);
    editor.toast(`Selected ${chosen.ids.length} × ${chosen.label}`, "success");
  },
});
