import { defineBlock } from "lineadraw";
import { add, dist, norm, range, sub, scale as sc } from "lineadraw/helpers";

export default defineBlock({
  id: "9f6f9dd3-361a-4046-aeb7-4cbe97fb7aa2",
  name: "Surface",
  description: "Draws a surface between two points.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["surface", "line", "draw"],
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
  place: ["Start point", "End point"],
  draw: ({ params, inputs: [start, end] }) => {
    const { type, scale } = params;
    const dir = norm(sub(end, start));
    const length = dist(start, end);
    const cos = dir.x;
    const sin = dir.y;

    const transform = (p: Vec2) => ({
      x: (p.x * cos - p.y * sin) * scale,
      y: (p.x * sin + p.y * cos) * scale,
    });

    const { offset, spacing, width, glyph } =
      type === "rock"
        ? rock
        : type === "earth"
          ? earth
          : type === "rock_exc"
            ? rock_exc
            : earth_rem;

    const numRepeats = Math.floor(length / spacing / scale);

    return [
      {
        type: "line",
        a: start,
        b: end,
      },
      ...range(numRepeats).flatMap((i) => {
        const p = sc(add(start, sc(dir, i * spacing + offset)), scale);
        return transformGlyph(glyph, transform, p);
      }),
    ];
  },
});

// x1, y1, x2, y2
type Glyph = [number, number, number, number][];

const transformGlyph = (
  glyph: Glyph,
  transform: (p: Vec2) => Vec2,
  p: Vec2,
): Line[] => {
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
