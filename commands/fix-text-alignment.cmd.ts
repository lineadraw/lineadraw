// Fix Text Alignment — Linea 0.36 (document v20) made text alignment mean
// JUSTIFICATION, as in AutoCAD: "right" puts the right edge on the point,
// so the text sits LEFT of it. Drawings were converted automatically, but
// block scripts can't be: their text renders mirrored around its point.
// Select instances of the affected blocks and run this — it swaps the
// literal values in each block's source (hAlign left↔right, vAlign
// top↔bottom) and every instance re-evaluates in place, one undo step.
//
// Only literal values (`hAlign: "right"`) are rewritten; computed ones
// (`hAlign: side`) are reported for a manual fix. Linea library blocks
// (@lineadraw/…) are skipped — update those from the Marketplace instead.
// The fixed source is marked, so running it twice can't flip it back.
// Headless (SDK / agents): every block in the document.
import { defineCommand } from "lineadraw";

const MARK = "// linea: text alignment is justification (document v20)";
const H: Record<string, string> = { left: "right", right: "left" };
const V: Record<string, string> = { top: "bottom", bottom: "top" };

/** The source with literal alignments swapped, or null when unchanged. */
const fixSource = (src: string) => {
  let swapped = 0;
  const out = src.replace(
    /\b([hv])Align(\s*:\s*)(["'])(left|right|top|bottom)\3/g,
    (m, axis: string, sep: string, q: string, value: string) => {
      const to = (axis === "h" ? H : V)[value];
      if (!to) return m;
      swapped++;
      return `${axis}Align${sep}${q}${to}${q}`;
    },
  );
  // Any alignment set from an expression the regex can't flip.
  const computed = /\b[hv]Align\s*:\s*[^\s"']/.test(src);
  return { source: swapped ? `${MARK}\n${out}` : null, computed };
};

/** Whether the module's `id:` is this one (not a mere dependency mention). */
const definesId = (src: string, id: string) =>
  new RegExp(
    `\\bid\\s*:\\s*["'\`]${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`]`,
  ).test(src);

export default defineCommand({
  id: "@lineadraw/fix-text-alignment",
  name: "Fix Block Text Alignment",
  description:
    "Updates the selected blocks' scripts to Linea 0.36 text alignment (justification) so their text sits where it did.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["blocks", "migration", "text", "utility"],
  run: async ({ document, editor }) => {
    let ids: readonly string[] | null = null;
    if (editor) {
      ids = editor.state().selectedIds;
      if (!ids.length)
        ids = [await editor.pickObject({ label: "Pick a block" })];
    }
    const defIds = new Set<string>();
    for (const o of ids
      ? document.query({ ids })
      : document.query({ type: "block" }))
      if (o.type === "block") defIds.add(o.definitionId);

    const fixed: string[] = [];
    const library: string[] = [];
    const manual: string[] = [];
    const already: string[] = [];
    const sources: string[] = [];
    for (const b of document.listBlocks()) {
      if (!defIds.has(b.id)) continue;
      const src = document.document.blockDefinitions.find((s) =>
        definesId(s, b.id),
      );
      if (!src) continue;
      if (b.id.startsWith("@lineadraw/")) library.push(b.name);
      else if (src.includes(MARK)) already.push(b.name);
      else {
        const { source, computed } = fixSource(src);
        if (source) (sources.push(source), fixed.push(b.name));
        if (computed) manual.push(b.name);
      }
    }
    if (sources.length) await document.installBlocks(sources);

    const lines = [
      fixed.length && `Fixed: ${fixed.join(", ")}`,
      already.length && `Already fixed: ${already.join(", ")}`,
      manual.length && `Check computed alignment by hand: ${manual.join(", ")}`,
      library.length && `Update from the Marketplace: ${library.join(", ")}`,
    ].filter(Boolean);
    const msg = lines.length
      ? lines.join(" · ")
      : "No block text alignment to fix";
    editor?.toast(msg, fixed.length ? "success" : "info");
    return msg;
  },
});
