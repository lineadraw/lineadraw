// Weld symbol — simplified ISO 2553-style callout: a leader from the weld
// to an elbow, a horizontal reference line, and the weld glyph on it.
// "Arrow side" draws the glyph above the reference line, "other side"
// below it with a dashed identification line.
import { defineBlock } from "lineadraw";
import { add, norm, rotate, scale as sc, sub } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/weld-symbol",
  name: "Weld symbol",
  description:
    "Draws a simplified weld callout: leader, reference line, weld glyph and size.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "steel", "weld", "annotation"],
  params: [
    { name: "scale", label: "Scale", type: "number", default: 1 },
    {
      name: "type",
      label: "Weld type",
      type: "enum",
      default: "fillet",
      options: [
        { value: "fillet", label: "Fillet" },
        { value: "v", label: "V butt" },
        { value: "bevel", label: "Bevel" },
        { value: "square", label: "Square butt" },
      ],
    },
    { name: "size", label: "Size", type: "string", default: "a4" },
    {
      name: "side",
      label: "Side",
      type: "enum",
      default: "arrow",
      options: [
        { value: "arrow", label: "Arrow side" },
        { value: "other", label: "Other side" },
      ],
    },
    { name: "field", label: "Field weld", type: "boolean", default: false },
    { name: "allAround", label: "All around", type: "boolean", default: false },
  ],
  place: ["Arrow point (weld)", "Elbow"],
  previewInputs: [
    [0, 0],
    [8, 6],
  ],
  draw: ({ params, inputs: [tip, elbow] }) => {
    const s = params.scale;
    const sx = tip.x <= elbow.x ? 1 : -1; // reference line runs away from the weld
    const ySign = params.side === "arrow" ? 1 : -1;
    const refEnd = add(elbow, { x: 12 * s * sx, y: 0 });
    const m = add(elbow, { x: 6 * s * sx, y: 0 }); // glyph anchor on the ref line
    const h = 3 * s * ySign;

    const leaderDir = norm(sub(elbow, tip));
    const out: ModelObject[] = [
      { type: "line", a: tip, b: elbow },
      { type: "line", a: tip, b: add(tip, rotate(sc(leaderDir, 2.5 * s), 0.35)) },
      { type: "line", a: tip, b: add(tip, rotate(sc(leaderDir, 2.5 * s), -0.35)) },
      { type: "line", a: elbow, b: refEnd },
    ];
    if (params.side === "other")
      out.push({
        type: "line",
        a: add(elbow, { x: 0, y: 0.8 * s }),
        b: add(refEnd, { x: 0, y: 0.8 * s }),
        lineType: "dashed",
      });

    switch (params.type) {
      case "fillet":
        out.push({
          type: "polyline",
          points: [add(m, { x: -1.5 * s, y: h }), add(m, { x: -1.5 * s, y: 0 }), add(m, { x: 1.5 * s, y: 0 })],
        });
        out.push({ type: "line", a: add(m, { x: -1.5 * s, y: h }), b: add(m, { x: 1.5 * s, y: 0 }) });
        break;
      case "v":
        out.push({ type: "line", a: m, b: add(m, { x: -1.5 * s, y: h }) });
        out.push({ type: "line", a: m, b: add(m, { x: 1.5 * s, y: h }) });
        break;
      case "bevel":
        out.push({ type: "line", a: m, b: add(m, { x: 0, y: h }) });
        out.push({ type: "line", a: m, b: add(m, { x: 1.5 * s, y: h }) });
        break;
      case "square":
        out.push({ type: "line", a: add(m, { x: -0.8 * s, y: 0 }), b: add(m, { x: -0.8 * s, y: h }) });
        out.push({ type: "line", a: add(m, { x: 0.8 * s, y: 0 }), b: add(m, { x: 0.8 * s, y: h }) });
        break;
    }

    out.push({
      type: "text",
      position: add(m, { x: -2.2 * s * sx, y: 1.5 * s * ySign }),
      content: params.size,
      hAlign: sx > 0 ? "left" : "right",
      vAlign: "center",
      scale: s,
    });

    if (params.allAround) out.push({ type: "circle", center: elbow, radius: 1.2 * s });
    if (params.field) {
      const top = add(elbow, { x: 0, y: 4 * s });
      out.push({ type: "line", a: elbow, b: top });
      out.push({
        type: "hatch",
        loops: [{ points: [top, add(elbow, { x: 0, y: 2.6 * s }), add(elbow, { x: 2.2 * s * sx, y: 3.3 * s })] }],
        fill: { kind: "solid" },
      });
    }
    return out;
  },
});
