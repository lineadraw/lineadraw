// Anchor bolt group — a rows × cols grid of bolts (circle + diagonal
// cross) centered on the picked point; for base plates and column shoes.
import { defineBlock } from "lineadraw";
import { add, polar, toRad } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/anchor-bolt-group",
  name: "Anchor bolt group",
  description:
    "Draws a grid of anchor bolts (circle with cross) centered on a point.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "steel", "foundation", "detail"],
  params: [
    {
      name: "xs",
      label: "X positions",
      type: "string",
      default: "-50 100",
    },
    {
      name: "ys",
      label: "Y positions",
      type: "string",
      default: "-50 100",
    },
    { name: "size", label: "Bolt size", type: "number", default: 24, min: 1 },
  ],
  place: ["Group center"],
  draw: ({ params, inputs: [c] }) => {
    const xs = parsePositions(params.xs);
    const ys = parsePositions(params.ys);
    if (!xs.length || !ys.length) return [];
    const { size } = params;
    const tick = size * 1.2; // cross half-length

    const out: ModelObject[] = [];
    for (let i = 0; i < xs.length; i++)
      for (let j = 0; j < ys.length; j++) {
        const p = add(c, {
          x: xs[i],
          y: ys[j],
        });
        out.push({ type: "circle", center: p, radius: size / 2 });
        out.push({
          type: "line",
          a: add(p, polar(toRad(45), tick)),
          b: add(p, polar(toRad(225), tick)),
        });
        out.push({
          type: "line",
          a: add(p, polar(toRad(135), tick)),
          b: add(p, polar(toRad(315), tick)),
        });
      }
    return out;
  },
});

/** "0 2*7200" → [0, 7200, 14400]: cumulative sum of relative distances,
 * "N*d" meaning N bays of d. Malformed tokens are skipped. */
const parsePositions = (spec: string): number[] => {
  const out: number[] = [];
  let at = 0;
  for (const tok of spec.trim().split(/\s+/)) {
    const m = /^(?:(\d+)\*)?(-?\d*\.?\d+)$/.exec(tok);
    if (!m) continue;
    const count = m[1] ? parseInt(m[1], 10) : 1;
    const dist = parseFloat(m[2]);
    for (let i = 0; i < count; i++) out.push((at += dist));
  }
  return out;
};
