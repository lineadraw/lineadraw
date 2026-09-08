// Bolt — schematic side view between two picked points: hex head (across
// flats, with facet lines), shank, and a threaded end. The distance between
// the picks IS the bolt length; pick order sets the direction (head first).
import { defineBlock } from "lineadraw";
import type { Line, Polyline, Vec2 } from "lineadraw";
import { add, len, norm, rotate, scale, sub } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/bolt",
  name: "Bolt",
  description:
    "Draws a schematic side view of a bolt between two picked points — hex head, shank and threaded end. The pick distance sets the length, the pick order the direction.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "steel", "fastener", "bolt"],
  params: [
    {
      name: "size",
      label: "Size",
      type: "enum",
      default: "M16",
      options: ["M8", "M10", "M12", "M16", "M20", "M24", "M30"],
    },
  ],
  place: ["Head", "Tip"],
  previewInputs: [
    [0, 0],
    [50, 0],
  ],
  draw: ({ params, inputs: [head, tip] }) => {
    const d = Number(params.size.slice(1));
    const L = len(sub(tip, head));
    if (L < 1e-6) return [];
    const n = norm(sub(tip, head));
    const p = rotate(n, Math.PI / 2);
    /** Point `along` the axis from the head, `across` from the centerline. */
    const at = (along: number, across: number): Vec2 =>
      add(add(head, scale(n, along)), scale(p, across));

    const s = 1.6 * d; // head width across flats (side view)
    const k = 0.65 * d; // head thickness
    const threadLen = Math.min(2.5 * d, 0.6 * L);
    const t0 = L - threadLen;

    const headRect: Polyline = {
      type: "polyline",
      closed: true,
      points: [at(-k, -s / 2), at(-k, s / 2), at(0, s / 2), at(0, -s / 2)],
    };
    // Hex facet edges as seen in the across-flats side view.
    const facets: Line[] = [-s / 6, s / 6].map((y) => ({
      type: "line",
      a: at(-k, y),
      b: at(0, y),
    }));
    const shank: Polyline = {
      type: "polyline",
      closed: true,
      points: [at(0, -d / 2), at(0, d / 2), at(L, d / 2), at(L, -d / 2)],
    };
    // Thread: minor-diameter lines over the threaded end + a runout mark.
    const thread: Line[] = [-0.4 * d, 0.4 * d].map((y) => ({
      type: "line",
      a: at(t0, y),
      b: at(L, y),
    }));
    const runout: Line = { type: "line", a: at(t0, -d / 2), b: at(t0, d / 2) };

    return [headRect, ...facets, shank, ...thread, runout];
  },
});
