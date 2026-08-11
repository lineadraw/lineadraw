// Renumber Marks — re-sequences the selected marks in spatial order:
// text objects get new contents, block instances with a string `label`
// param get new labels. The first label sets prefix, start and padding
// ("A01" continues A02, A03, …). Order follows the dominant direction of
// the selection (left→right when it is wider than tall, else top→bottom).
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/renumber-marks",
  name: "Renumber Marks",
  description:
    "Re-sequences selected texts and labeled blocks spatially from a first label.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["annotation", "numbering", "utility"],
  run: async ({ document, selection, prompt, showToast }) => {
    const ids = selection();
    if (!ids.length) {
      showToast("Nothing selected", "error");
      return;
    }
    const first = (
      await prompt('First label (e.g. "1" or "A01")', { initial: "1" })
    ).trim();
    const m = first.match(/^(.*?)(\d+)$/);
    if (!m) {
      showToast("Label must end with a number", "error");
      return;
    }
    const prefix = m[1];
    const start = parseInt(m[2], 10);
    const pad = m[2].length;

    type Mark = { obj: ExistingObject; x: number; y: number };
    const marks: Mark[] = [];
    for (const obj of document.query({ ids })) {
      if (obj.type === "text") {
        marks.push({ obj, x: obj.position.x, y: obj.position.y });
      } else if (obj.type === "block" && typeof obj.params.label === "string") {
        const b = document.measure(obj.id).bbox;
        if (b)
          marks.push({ obj, x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });
      }
    }
    if (!marks.length) {
      showToast("No texts or labeled blocks in the selection", "error");
      return;
    }

    const xs = marks.map((k) => k.x);
    const ys = marks.map((k) => k.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    marks.sort(spanX >= spanY ? (a, b) => a.x - b.x : (a, b) => b.y - a.y);

    document.update(
      marks.map(({ obj }, i) => {
        const label = prefix + String(start + i).padStart(pad, "0");
        return obj.type === "text"
          ? { id: obj.id, content: label }
          : { id: obj.id, params: { ...(obj as { params: object }).params, label } };
      }),
    );
    showToast(`Renumbered ${marks.length} mark(s) from ${first}`, "success");
  },
});
