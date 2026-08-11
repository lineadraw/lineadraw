// Measure Selection — sums the curve length and enclosed area of the
// current selection and reports the totals in a toast.
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@lineadraw/measure-selection",
  name: "Measure Selection",
  description: "Shows the total length and area of the selected objects.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["measure", "utility"],
  run: async ({ document, selection, showToast }) => {
    const ids = selection();
    if (!ids.length) {
      showToast("Nothing selected", "error");
      return;
    }

    let length = 0;
    let area = 0;
    let withLength = 0;
    let withArea = 0;
    for (const id of ids) {
      const m = document.measure(id);
      if (m.length != null) {
        length += m.length;
        withLength++;
      }
      if (m.area != null) {
        area += m.area;
        withArea++;
      }
    }

    const parts = [`${ids.length} object(s)`];
    if (withLength)
      parts.push(
        length >= 1000
          ? `length ${(length / 1000).toFixed(2)} m`
          : `length ${length.toFixed(1)} mm`,
      );
    if (withArea) parts.push(`area ${(area / 1e6).toFixed(3)} m²`);
    if (!withLength && !withArea) parts.push("nothing measurable");
    showToast(parts.join(" — "), "info");
  },
});
