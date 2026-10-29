// Layouts from Frames — sheets drawn in model space become printable paper
// layouts: one layout per frame, sheet-sized, with ONE full-sheet viewport
// centred on the frame at the frame's scale. Then print them all at once
// (Export PDF, Ctrl+P).
//
// Frames are the selected:
//   - "Drawing frame" block instances (@lineadraw/frame): sheet size from
//     the block's params, scale = the instance's Scale — nothing to ask;
//   - other block instances (your own title-block frames): sheet = their
//     extents ÷ the instance's Scale;
//   - closed rectangles: the scale is asked once (1:N) — a rectangle alone
//     can't tell A4 at 1:10 from A2 at 1:5.
// Sheet sizes within 0.5% of an ISO size snap to it (drawing drift). Pages
// follow reading order: rows top to bottom, then left to right.
// Headless (SDK / agents): every Drawing-frame instance in model space.
import { defineCommand } from "lineadraw";
import type { StoredObject } from "lineadraw";

type Frame = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  /** Model mm per sheet mm; null = ask (a bare rectangle). */
  scale: number | null;
};

const ISO: [number, number][] = [
  [210, 297],
  [297, 420],
  [420, 594],
  [594, 841],
  [841, 1189],
];

/** The ISO sheet (either orientation) within 0.5%, else the size as is. */
const snapSheet = (w: number, h: number) => {
  const near = (a: number, b: number) => Math.abs(a - b) <= b * 0.005;
  for (const [a, b] of ISO) {
    if (near(w, a) && near(h, b)) return { width: a, height: b };
    if (near(w, b) && near(h, a)) return { width: b, height: a };
  }
  return { width: w, height: h };
};

/** Sheet mm of a @lineadraw/frame instance, mirroring the block's draw. */
const frameBlockSize = (p: Record<string, unknown>): [number, number] => {
  const num = (k: string, d: number) =>
    typeof p[k] === "number" ? (p[k] as number) : d;
  const size = (p.size as string) ?? "A4";
  if (size === "Custom") return [num("width", 210), num("height", 297)];
  if (size === "xA4") return [210 * num("x", 1), 297 * num("y", 1)];
  const paper: Record<string, [number, number]> = {
    A1: [594, 841],
    A2: [420, 594],
    A3: [297, 420],
    A4: [210, 297],
  };
  const [w, h] = paper[size] ?? [20, 20];
  return p.orientation === "Landscape" ? [h, w] : [w, h];
};

/** An axis-aligned closed straight-sided rectangle's bounds, else null. */
const rectangleOf = (o: StoredObject): Omit<Frame, "scale"> | null => {
  if (o.type !== "polyline" || !o.closed) return null;
  const pts = o.points;
  const last = pts[pts.length - 1];
  const n =
    pts.length === 5 && pts[0].x === last.x && pts[0].y === last.y
      ? 4
      : pts.length;
  if (n !== 4 || pts.some((p) => p.bulge !== 0)) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const b = {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
  const eps = 1e-6 * Math.max(b.maxX - b.minX, b.maxY - b.minY, 1);
  const at = (v: number, lo: number, hi: number) =>
    Math.abs(v - lo) <= eps || Math.abs(v - hi) <= eps;
  const ok =
    b.maxX > b.minX &&
    b.maxY > b.minY &&
    pts.every((p) => at(p.x, b.minX, b.maxX) && at(p.y, b.minY, b.maxY));
  return ok ? b : null;
};

export default defineCommand({
  id: "@lineadraw/layouts-from-frames",
  name: "Layouts from Frames",
  description:
    "One paper layout per selected sheet frame (Drawing frame block, title-block frame or rectangle), with a full-sheet viewport at the frame's scale.",
  version: "2.0.0",
  authors: ["Linea Team"],
  tags: ["layout", "print", "sheet", "frame", "pdf"],
  run: async ({ document, editor }) => {
    if (editor && editor.state().space !== "model") {
      editor.toast("Select the frames in model space", "error");
      return;
    }
    const candidates = editor
      ? document.listObjects({ ids: editor.state().selectedIds })
      : document
          .listObjects({ type: "block" })
          .filter(
            (o) => o.type === "block" && o.definitionId === "@lineadraw/frame",
          );

    const frames: Frame[] = [];
    let skipped = 0;
    for (const o of candidates) {
      if (o.type === "block") {
        const pivot = o.inputs[0];
        if (o.rotation !== 0 || !pivot || typeof pivot === "string") {
          skipped++; // a rotated sheet can't print straight
          continue;
        }
        if (o.definitionId === "@lineadraw/frame") {
          const [w, h] = frameBlockSize(o.params);
          frames.push({
            minX: pivot.x,
            minY: pivot.y,
            maxX: pivot.x + w * o.scale,
            maxY: pivot.y + h * o.scale,
            scale: o.scale,
          });
        } else {
          const bbox = document.measure(o.id).bbox;
          if (bbox) frames.push({ ...bbox, scale: o.scale });
          else skipped++;
        }
        continue;
      }
      const rect = rectangleOf(o);
      if (rect) frames.push({ ...rect, scale: null });
      else skipped++;
    }
    if (frames.length === 0) {
      const msg =
        "Select sheet frames: Drawing frame blocks, title-block frames or closed rectangles";
      if (editor) editor.toast(msg, "error");
      else throw new Error(msg);
      return;
    }

    // Bare rectangles carry no scale: ask once.
    if (frames.some((f) => f.scale === null)) {
      if (!editor)
        throw new Error("Rectangles need a scale: run in the editor");
      const answer = await editor.prompt(
        "Drawing scale of the rectangles (1:N)",
        {
          initial: "1:10",
        },
      );
      const scale = Number(answer.trim().replace(/^1\s*:\s*/, ""));
      if (!Number.isFinite(scale) || scale <= 0) {
        editor.toast(`"${answer}" is not a scale. Type e.g. 1:10`, "error");
        return;
      }
      for (const f of frames) f.scale ??= scale;
    }

    // Reading order: rows top to bottom (same row = centres within half the
    // smaller frame height), then left to right.
    const cy = (f: Frame) => (f.minY + f.maxY) / 2;
    const cx = (f: Frame) => (f.minX + f.maxX) / 2;
    frames.sort((a, b) => {
      const tol = Math.min(a.maxY - a.minY, b.maxY - b.minY) / 2;
      return Math.abs(cy(a) - cy(b)) > tol ? cy(b) - cy(a) : cx(a) - cx(b);
    });

    const taken = new Set(document.listLayouts().map((l) => l.name));
    let n = taken.size;
    for (const f of frames) {
      const scale = f.scale!;
      const sheet = snapSheet(
        (f.maxX - f.minX) / scale,
        (f.maxY - f.minY) / scale,
      );
      let name: string;
      do name = `Layout ${++n}`;
      while (taken.has(name));
      taken.add(name);
      document.addLayout(name, {
        sheet,
        viewport: {
          rect: { x: 0, y: 0, w: sheet.width, h: sheet.height },
          center: [cx(f), cy(f)],
          scale,
        },
      });
    }
    const msg = `Created ${frames.length} layout${frames.length === 1 ? "" : "s"}${
      skipped
        ? ` (${skipped} selected object${skipped === 1 ? " isn't a frame" : "s aren't frames"})`
        : ""
    }`;
    editor?.toast(msg, "success");
  },
});
