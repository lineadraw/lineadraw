import { defineBlock } from "lineadraw";
import type { LineInput, PolylineInput, Vec2 } from "lineadraw";
import { add, dist, norm, range, sub, scale as sc } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/surface",
  name: "Surface",
  description:
    "Draws a ground-surface symbol along picked points, with rock, earth, excavated-rock and removed-earth variants.",
  // 1.1.0: an editable point chain (add / remove points) instead of a line.
  version: "1.1.0",
  authors: ["Linea Team"],
  tags: ["civil", "site", "ground", "surface", "annotation"],
  params: [
    {
      name: "type",
      label: "Type",
      type: "enum",
      default: "earth_rem",
      options: [
        { value: "rock", label: "Rock" },
        { value: "earth", label: "Earth" },
        { value: "rock_exc", label: "Rock excavated" },
        { value: "earth_rem", label: "Earth removed" },
      ],
    },
    {
      name: "scale",
      label: "Scale",
      type: "number",
      default: 1,
    },
  ],
  inputs: [{ name: "path", label: "Surface points", type: "points", min: 2 }],
  previewInputs: {
    path: [
      [0, 0],
      [30, 0],
    ],
  },
  draw: ({ params, inputs: { path } }) => {
    const { type, scale } = params;
    const { offset, spacing, glyph } =
      type === "rock"
        ? rock
        : type === "earth"
          ? earth
          : type === "rock_exc"
            ? rock_exc
            : earth_rem;

    // Glyphs repeat along each segment on their own, rotated to it.
    const glyphs = path.slice(1).flatMap((end, k) => {
      const start = path[k];
      const dir = norm(sub(end, start));
      const length = dist(start, end);
      const transform = (p: Vec2) => ({
        x: (p.x * dir.x - p.y * dir.y) * scale,
        y: (p.x * dir.y + p.y * dir.x) * scale,
      });
      return range(Math.floor(length / spacing / scale)).flatMap((i) =>
        transformGlyph(
          glyph,
          transform,
          add(start, sc(dir, (i * spacing + offset) * scale)),
        ),
      );
    });

    return [
      { type: "polyline", points: path, closed: false } as PolylineInput,
      ...glyphs,
    ];
  },
});

// x1, y1, x2, y2
type Glyph = [number, number, number, number][];

const transformGlyph = (
  glyph: Glyph,
  transform: (p: Vec2) => Vec2,
  p: Vec2,
): LineInput[] => {
  return glyph.map(([x1, y1, x2, y2]) => ({
    type: "line",
    a: add(transform({ x: x1, y: y1 }), p),
    b: add(transform({ x: x2, y: y2 }), p),
  }));
};

type Data = {
  offset: number;
  spacing: number;
  width: number;
  glyph: Glyph;
};

const rock: Data = {
  offset: 5,
  spacing: 10,
  width: 0,
  glyph: [
    [1.05, -3.5, 0, -1.75],
    [-1.05, -3.5, 1.05, 0],
  ],
};

const earth: Data = {
  offset: 5,
  spacing: 10,
  width: 0,
  glyph: [[-3.01, -3.5, 0, 0]],
};

const rock_exc: Data = {
  offset: 5,
  spacing: 10,
  width: 2.1,
  glyph: [
    [-1.05, 0, 0, -3.5],
    [0, -3.5, 1.05, 0],
  ],
};

const earth_rem: Data = {
  offset: 4.5,
  spacing: 9,
  width: 3,
  glyph: [
    [-3.617075, -3.011383, -1.5, 0],
    [-2.111383, -3.011383, 0, 0],
    [-0.605692, -3.011383, 1.5, 0],
    [0.452846, -3.011383, -0.05649, -2.225962],
    [1.958537, -3.011383, 0.722845, -1.111422],
    [3.464229, -3.011383, 1.5, 0],
  ],
};
