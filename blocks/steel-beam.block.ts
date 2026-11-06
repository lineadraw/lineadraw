// Steel Beam Block — elevation (front/top view) of a catalogue profile
// between two picked points: solid outer edges, dashed hidden edges, end
// caps. Catalogue data from the calculus profile catalogs (the same data
// section as @lineadraw/steel-profile). The defineBlock call sits at the
// TOP of the file, above the data it reads.
import { defineBlock } from "lineadraw";
import type { LineInput, Vec2 } from "lineadraw";
import { sub, add, scale, norm, rotate, len } from "lineadraw/helpers";

export default defineBlock({
  id: "@lineadraw/steel-beam",
  name: "Steel Beam",
  description:
    "Draws a steel beam in elevation between two picked points, from the European catalogs (IPE, HEA/HEB, UPE/UPN, L…): solid outer edges, dashed hidden edges.",
  version: "1.0.1",
  authors: ["Linea Team"],
  tags: ["structural", "steel", "beam", "catalog", "elevation"],
  params: () => [
    ...catalogParams(),
    {
      name: "orientation",
      label: "Orientation",
      type: "enum",
      default: "front",
      options: [
        { value: "front", label: "Front" },
        { value: "top", label: "Top" },
      ],
    },
  ],
  paramVisibility: catalogVisibility,
  place: ["Start point", "End point"],
  draw: ({ params, inputs: [p1, p2] }) => {
    const s = lookup(params);
    const dir = sub(p2, p1);
    if (!s || len(dir) < 1e-9) return [];
    const n = norm(rotate(dir, Math.PI / 2));
    const [a, b, c, d] = s.dims;

    // Signed offsets across the beam axis. Front looks at the section's h
    // extent, top at its w extent; asymmetric sections (U web, L legs) sit
    // on the +n side.
    const solid: number[] = [];
    const hidden: number[] = [];
    const front = params.orientation === "front";
    switch (s.kind) {
      case "I":
      case "U": {
        const [h, w, tw, tf] = [a, b, c, d];
        if (front) solid.push(h / 2, -h / 2, h / 2 - tf, -h / 2 + tf);
        else {
          solid.push(w / 2, -w / 2);
          if (s.kind === "I") hidden.push(tw / 2, -tw / 2);
          else hidden.push(w / 2 - tw);
        }
        break;
      }
      case "L": {
        const [h, w, t] = [a, b, c];
        if (front) solid.push(h / 2, -h / 2, -h / 2 + t);
        else solid.push(w / 2, -w / 2, w / 2 - t);
        break;
      }
      case "CHS":
        solid.push(a / 2, -a / 2);
        hidden.push(a / 2 - b, -a / 2 + b);
        break;
      default: {
        // SHS rows are [b, t], RHS rows [h, w, t].
        const [h, w, t] = s.kind === "SHS" ? [a, a, b] : [a, b, c];
        const across = front ? h : w;
        solid.push(across / 2, -across / 2);
        hidden.push(across / 2 - t, -across / 2 + t);
      }
    }

    const at = (o: number): Vec2 => scale(n, o);
    // End caps across the full outer extent.
    const hi = Math.max(...solid);
    const lo = Math.min(...solid);
    const lines: LineInput[] = [
      { type: "line", a: at(hi), b: at(lo) },
      { type: "line", a: add(dir, at(hi)), b: add(dir, at(lo)) },
    ];
    for (const o of solid)
      lines.push({ type: "line", a: at(o), b: add(dir, at(o)) });
    for (const o of hidden)
      lines.push({
        type: "line",
        lineType: "hidden",
        a: at(o),
        b: add(dir, at(o)),
      });
    return lines;
  },
});
// ———————————————————————— Catalogue data ————————————————————————
// Read by `params` and `draw`, which run after the module body, so the data
// may sit down here. Each catalog names the param holding its profile; rows
// expand to [name, ...dims], the name built from the dims:
//   rolled  [nominal, h, w, tw, tf, r]  → "IPE300"
//   angles  [h, w, r, [t, …]]           → "L100x10", "L150x100x10" (rows h, w, t, r)
//   series  [...dims, [t, …]]           → "CFRHS200x100x5" (rows ...dims, t)

type Row = [string, ...number[]];
type Catalog = {
  param: string;
  default: string;
  kind: "I" | "U" | "L" | "CHS" | "SHS" | "RHS";
  rows: Row[];
};

const rolled = (prefix: string, rows: number[][]): Row[] =>
  rows.map(([n, ...dims]) => [prefix + n, ...dims]);

const angles = (groups: [number, number, number, number[]][]): Row[] =>
  groups.flatMap(([h, w, r, ts]) =>
    ts.map((t): Row => [`L${h === w ? h : `${h}x${w}`}x${t}`, h, w, t, r]),
  );

const series = (prefix: string, groups: (number | number[])[][]): Row[] =>
  groups.flatMap((g) => {
    const dims = g.slice(0, -1) as number[];
    return (g.at(-1) as number[]).map((t): Row => [
      `${prefix}${dims.join("x")}x${t}`,
      ...dims,
      t,
    ]);
  });

/** The selected catalog row, or undefined. */
const lookup = (params: Readonly<Record<string, unknown>>) => {
  const c = catalogs[params.catalog as string];
  const row = c?.rows.find((r) => r[0] === params[c.param]);
  return row && { kind: c.kind, dims: row.slice(1) as number[] };
};

// Function declarations (hoisted): the spec at the top references them.

/** The catalog picker + one profile list per catalog. */
function catalogParams() {
  return [
    {
      name: "catalog",
      label: "Catalog",
      type: "enum" as const,
      default: "IPE",
      options: Object.keys(catalogs),
    },
    ...Object.values(catalogs).map((c) => ({
      name: c.param,
      label: "Profile",
      type: "enum" as const,
      default: c.default,
      options: c.rows.map((r) => r[0]),
    })),
  ];
}

/** Each profile list shows for its own catalog only. */
function catalogVisibility({
  params,
}: {
  params: Readonly<Record<string, unknown>>;
}) {
  return Object.fromEntries(
    Object.entries(catalogs).map(([k, c]) => [c.param, params.catalog === k]),
  );
}

const catalogs: Record<string, Catalog> = {
  IPE: {
    param: "ipe",
    default: "IPE300",
    kind: "I",
    rows: rolled("IPE", [
      [80, 80, 46, 3.8, 5.2, 5],
      [100, 100, 55, 4.1, 5.7, 7],
      [120, 120, 64, 4.4, 6.3, 7],
      [140, 140, 73, 4.7, 6.9, 7],
      [160, 160, 82, 5, 7.4, 9],
      [180, 180, 91, 5.3, 8, 9],
      [200, 200, 100, 5.6, 8.5, 12],
      [220, 220, 110, 5.9, 9.2, 12],
      [240, 240, 120, 6.2, 9.8, 15],
      [270, 270, 135, 6.6, 10.2, 15],
      [300, 300, 150, 7.1, 10.7, 15],
      [330, 330, 160, 7.5, 11.5, 18],
      [360, 360, 170, 8, 12.7, 18],
      [400, 400, 180, 8.6, 13.5, 21],
      [450, 450, 190, 9.4, 14.6, 21],
      [500, 500, 200, 10.2, 16, 21],
      [550, 550, 210, 11.1, 17.2, 24],
      [600, 600, 220, 12, 19, 24],
    ]),
  },
  HEA: {
    param: "hea",
    default: "HEA300",
    kind: "I",
    rows: rolled("HEA", [
      [100, 96, 100, 5, 8, 12],
      [120, 114, 120, 5, 8, 12],
      [140, 133, 140, 5.5, 8.5, 12],
      [160, 152, 160, 6, 9, 15],
      [180, 171, 180, 6, 9.5, 15],
      [200, 190, 200, 6.5, 10, 18],
      [220, 210, 220, 7, 11, 18],
      [240, 230, 240, 7.5, 12, 21],
      [260, 250, 260, 7.5, 12.5, 24],
      [280, 270, 280, 8, 13, 24],
      [300, 290, 300, 8.5, 14, 27],
      [320, 310, 300, 9, 15.5, 27],
      [340, 330, 300, 9.5, 16.5, 27],
      [360, 350, 300, 10, 17.5, 27],
      [400, 390, 300, 11, 19, 27],
      [450, 440, 300, 11.5, 21, 27],
      [500, 490, 300, 12, 23, 27],
      [550, 540, 300, 12.5, 24, 27],
      [600, 590, 300, 13, 25, 27],
      [650, 640, 300, 13.5, 26, 27],
      [700, 690, 300, 14.5, 27, 27],
      [800, 790, 300, 15, 28, 30],
      [900, 890, 300, 16, 30, 30],
      [1000, 990, 300, 16.5, 31, 30],
    ]),
  },
  HEB: {
    param: "heb",
    default: "HEB300",
    kind: "I",
    rows: rolled("HEB", [
      [100, 100, 100, 6, 10, 12],
      [120, 120, 120, 6.5, 11, 12],
      [140, 140, 140, 7, 12, 12],
      [160, 160, 160, 8, 13, 15],
      [180, 180, 180, 8.5, 14, 15],
      [200, 200, 200, 9, 15, 18],
      [220, 220, 220, 9.5, 16, 18],
      [240, 240, 240, 10, 17, 21],
      [260, 260, 260, 10, 17.5, 24],
      [280, 280, 280, 10.5, 18, 24],
      [300, 300, 300, 11, 19, 27],
      [320, 320, 300, 11.5, 20.5, 27],
      [340, 340, 300, 12, 21.5, 27],
      [360, 360, 300, 12.5, 22.5, 27],
      [400, 400, 300, 13.5, 24, 27],
      [450, 450, 300, 14, 26, 27],
      [500, 500, 300, 14.5, 28, 27],
      [550, 550, 300, 15, 29, 27],
      [600, 600, 300, 15.5, 30, 27],
      [650, 650, 300, 16, 31, 27],
      [700, 700, 300, 17, 32, 27],
      [800, 800, 300, 17.5, 33, 30],
      [900, 900, 300, 18.5, 35, 30],
      [1000, 1000, 300, 19, 36, 30],
    ]),
  },
  UPE: {
    param: "upe",
    default: "UPE200",
    kind: "U",
    rows: rolled("UPE", [
      [80, 80, 50, 4, 7, 10],
      [100, 100, 55, 4.5, 7.5, 10],
      [120, 120, 60, 5, 8, 12],
      [140, 140, 65, 5, 9, 12],
      [160, 160, 70, 5.5, 9.5, 12],
      [180, 180, 75, 5.5, 10.5, 12],
      [200, 200, 80, 6, 11, 13],
      [220, 220, 85, 6.5, 12, 13],
      [240, 240, 90, 7, 12.5, 15],
      [270, 270, 95, 7.5, 13.5, 15],
      [300, 300, 100, 9.5, 15, 15],
      [330, 330, 105, 11, 16, 18],
      [360, 360, 110, 12, 17, 18],
      [400, 400, 115, 13.5, 18, 18],
    ]),
  },
  UPN: {
    param: "upn",
    default: "UPN200",
    kind: "U",
    rows: rolled("UPN", [
      [50, 50, 38, 5, 7, 7],
      [65, 65, 42, 5.5, 7.5, 7.5],
      [80, 80, 45, 6, 8, 8],
      [100, 100, 50, 6, 8.5, 8.5],
      [120, 120, 55, 7, 9, 9],
      [140, 140, 60, 7, 10, 10],
      [160, 160, 65, 7.5, 10.5, 10.5],
      [180, 180, 70, 8, 11, 11],
      [200, 200, 75, 8.5, 11.5, 11.5],
      [220, 220, 80, 9, 12.5, 12.5],
      [240, 240, 85, 9.5, 13, 13],
      [260, 260, 90, 10, 14, 14],
      [280, 280, 95, 10, 15, 15],
      [300, 300, 100, 10, 16, 16],
      [320, 320, 100, 14, 17.5, 17.5],
      [350, 350, 100, 14, 16, 16],
      [380, 380, 102, 13.5, 16, 16],
      [400, 400, 110, 14, 18, 18],
    ]),
  },
  "L Equal": {
    param: "lequal",
    default: "L100x10",
    kind: "L",
    rows: angles([
      [25, 25, 3.5, [3, 4]],
      [30, 30, 5, [3, 4]],
      [35, 35, 5, [4, 5]],
      [40, 40, 6, [4, 5, 6]],
      [45, 45, 7, [3, 4, 4.5, 5, 6, 7]],
      [50, 50, 7, [4, 5, 6, 7, 8, 9]],
      [55, 55, 8, [4, 5, 6]],
      [60, 60, 8, [4, 5, 6, 7, 8, 10]],
      [63, 63, 9, [5, 6, 6.5]],
      [65, 65, 9, [4, 5, 6, 7, 8, 9, 10, 11]],
      [70, 70, 9, [5, 6, 7]],
      [70, 70, 10, [8]],
      [70, 70, 9, [9, 10]],
      [75, 75, 9, [4, 5, 6, 7, 8, 9, 10]],
      [80, 80, 10, [5, 6, 7, 8, 9, 10]],
      [90, 90, 11, [5, 6, 7, 8, 9, 10, 11, 16]],
      [100, 100, 12, [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18]],
      [110, 110, 12, [6, 7, 8, 9]],
      [110, 110, 13, [10, 11, 12, 14]],
      [120, 120, 13, [7, 8, 9, 10, 11, 12, 13, 14, 15, 16]],
      [130, 130, 14, [8, 9, 10, 11, 12, 13, 14, 15, 16]],
      [140, 140, 15, [9, 10, 11, 12, 13, 14, 15, 16, 18]],
      [150, 150, 16, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]],
      [160, 160, 17, [12, 13, 14, 15, 16, 17, 18, 19, 20]],
      [180, 180, 18, [13, 14, 15, 16, 17, 18, 19, 20, 22]],
      [
        200,
        200,
        18,
        [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
      ],
      [
        250,
        250,
        18,
        [
          17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
          34, 35,
        ],
      ],
      [300, 300, 18, [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]],
    ]),
  },
  "L Unequal": {
    param: "lunequal",
    default: "L150x100x10",
    kind: "L",
    rows: angles([
      [100, 65, 10, [7, 8, 9, 10, 11, 12]],
      [110, 70, 10, [10, 12]],
      [120, 80, 11, [8, 10, 12]],
      [130, 90, 11, [10, 12, 14]],
      [140, 90, 11, [8, 10, 12, 14]],
      [150, 90, 12, [10, 11, 12]],
      [150, 100, 12, [10, 12, 14]],
      [200, 100, 15, [10, 12, 14, 15, 16]],
      [250, 90, 18, [12, 14, 16]],
    ]),
  },
  CFCHS: {
    param: "cfchs",
    default: "CFCHS168.3x5",
    kind: "CHS",
    rows: series("CFCHS", [
      [33.7, [3]],
      [42.4, [3]],
      [48.3, [3, 4]],
      [60.3, [3, 4]],
      [76.1, [3, 4]],
      [88.9, [3, 3.5, 4, 5, 6.3]],
      [114.3, [3, 3.5, 4, 5, 6, 6.3]],
      [139.7, [3, 4, 5, 6, 6.3, 8, 10]],
      [168.3, [4, 4.5, 5, 6, 6.3, 8, 10, 12.5]],
      [193.7, [4, 4.5, 5, 6, 6.3, 8, 10, 12.5]],
      [219.1, [4.5, 5, 6, 6.3, 8, 10, 12, 12.5, 16]],
      [244.5, [5, 6, 6.3, 8, 10, 12, 12.5, 16]],
      [273, [4, 4.5, 5, 6, 6.3, 8, 10, 12, 12.5, 16]],
      [323.9, [5, 6, 6.3, 8, 10, 12, 12.5, 16]],
      [355.6, [5, 6, 6.3, 8, 10, 12, 12.5, 16]],
      [406.4, [6, 6.3, 8, 10, 12, 12.5, 16]],
      [457, [6, 6.3, 8, 10, 12, 12.5, 16]],
      [508, [6, 6.3, 8, 10, 12, 12.5, 16]],
    ]),
  },
  CFSHS: {
    param: "cfshs",
    default: "CFSHS150x5",
    kind: "SHS",
    rows: series("CFSHS", [
      [25, [2, 2.5]],
      [30, [2, 2.5, 3]],
      [40, [2, 2.5, 3, 4]],
      [50, [2.5, 3, 4, 5]],
      [60, [3, 4, 5, 6]],
      [70, [3, 3.5, 4, 5, 6]],
      [80, [3, 3.5, 4, 5, 6]],
      [90, [3, 3.5, 4, 5, 6]],
      [100, [3, 4, 5, 6, 8]],
      [120, [3, 4, 5, 6, 8, 10]],
      [140, [4, 5, 6, 8, 10]],
      [150, [4, 5, 6, 8, 10]],
      [160, [4, 5, 6, 8, 10]],
      [180, [5, 6, 6.3, 8, 10, 12, 12.5]],
      [200, [5, 6, 6.3, 8, 10, 12, 12.5]],
      [250, [6, 6.3, 8, 10, 12, 12.5]],
      [300, [6, 6.3, 8, 10, 12, 12.5]],
      [350, [6, 6.3, 8, 10, 12, 12.5]],
      [400, [6, 6.3, 8, 10, 12, 12.5]],
    ]),
  },
  CFRHS: {
    param: "cfrhs",
    default: "CFRHS200x100x5",
    kind: "RHS",
    rows: series("CFRHS", [
      [50, 25, [2, 2.5, 3]],
      [50, 30, [2, 2.5, 3, 4]],
      [60, 40, [2.5, 3, 4, 5]],
      [70, 40, [3, 4, 5]],
      [70, 50, [3, 4, 5]],
      [80, 40, [3, 4, 5]],
      [80, 50, [3, 4, 5]],
      [80, 60, [3, 3.5, 4, 5]],
      [90, 50, [3, 4, 5]],
      [100, 40, [3, 4, 5]],
      [100, 50, [3, 4, 5, 6]],
      [100, 60, [3, 3.5, 4, 5, 6]],
      [100, 80, [3, 4, 5, 6]],
      [120, 40, [3, 4, 5]],
      [120, 60, [3, 3.5, 4, 5, 6]],
      [120, 80, [3, 4, 5, 6, 8]],
      [140, 80, [3, 4, 5, 6, 8, 10]],
      [150, 100, [3, 4, 5, 6, 8, 10]],
      [160, 80, [3, 4, 5, 6, 8, 10]],
      [180, 80, [3, 4, 5, 6, 8, 10]],
      [180, 100, [4, 5, 6, 8, 10]],
      [200, 100, [4, 5, 6, 8, 10]],
      [200, 120, [4, 5, 6, 8, 10]],
      [200, 150, [4, 5, 6, 8, 10]],
      [250, 150, [5, 6, 6.3, 8, 10, 12, 12.5]],
      [300, 100, [6, 8, 10]],
      [300, 200, [6, 6.3, 8, 10, 12, 12.5]],
      [400, 200, [6, 6.3, 8, 10, 12, 12.5]],
      [450, 250, [6, 6.3, 8, 10, 12, 12.5]],
      [500, 300, [6, 6.3, 8, 10, 12, 12.5]],
    ]),
  },
};
