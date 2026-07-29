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
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["selection", "filter", "utility"],
  run: async ({ document, selection, setSelection, prompt, showToast }) => {
    const ids = selection();
    if (!ids.length) {
      showToast("Nothing selected", "error");
      return;
    }

    // One group per object type; block instances split per definition so
    // "narrow to Axis" and "narrow to Grid" stay distinct choices.
    const groups = new Map<string, { label: string; ids: string[] }>();
    for (const o of document.query({ ids })) {
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
      showToast("Selection is already a single type", "info");
      return;
    }

    const entries = [...groups.values()];
    const menu = entries
      .map((g, i) => `${i + 1}: ${g.label} ×${g.ids.length}`)
      .join("   ");
    const answer = (
      await prompt(`Keep which? ${menu}`, { placeholder: "number or type" })
    )
      .trim()
      .toLowerCase();
    const chosen =
      entries[parseInt(answer, 10) - 1] ??
      entries.find((g) => g.label.toLowerCase().startsWith(answer));
    if (!chosen) {
      showToast(`No group matches "${answer}"`, "error");
      return;
    }

    setSelection(chosen.ids);
    showToast(`Selected ${chosen.ids.length} × ${chosen.label}`, "success");
  },
});
