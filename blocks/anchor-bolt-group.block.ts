// Anchor bolt group — a rows × cols grid of bolts (circle + diagonal
// cross) centered on the picked point; for base plates and column shoes.
import { defineBlock } from "lineadraw";
import { add, polar, toRad } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/anchor-bolt-group",
  name: "Anchor bolt group",
  description:
    "Draws a grid of anchor bolts (circle with cross) centered on a point.",
  // 1.1.0: positions are numberList params ("-50 100" typed in the panel);
  // instances saved by 1.0.0 hold strings — Linea parses them on read.
  version: "1.1.0",
  authors: ["Linea Team"],
  tags: ["structural", "steel", "foundation", "detail"],
  params: [
    {
      name: "xs",
      label: "X positions",
      type: "numberList",
      default: [-50, 100],
    },
    {
      name: "ys",
      label: "Y positions",
      type: "numberList",
      default: [-50, 100],
    },
    { name: "size", label: "Bolt size", type: "number", default: 24, min: 1 },
  ],
  place: ["Group center"],
  draw: ({ params, inputs: [c] }) => {
    const xs = positions(params.xs);
    const ys = positions(params.ys);
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

/** [-50, 100] → [-50, 50]: relative distances summed. */
const positions = (distances: readonly number[]): number[] => {
  let at = 0;
  return distances.map((d) => (at += d));
};
