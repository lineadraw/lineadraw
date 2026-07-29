// Hollow Core Profile Block — cross-section outlines for Parma precast
// hollow core slabs (data from the calculus profile catalogs). Sections are
// drawn bbox-centered; outlines carry the grout key/bevel profile verbatim
// from the catalog, voids are generated from their corner coordinates.
//
// Layout: the block contract reads top-down here; the catalogue data
// tables live at the END of the file. That works because `params` is the
// FUNCTION form — its body runs after the whole module evaluated, so it
// may reference tables declared below it.
import { defineBlock } from "lineadraw";
import type { Polyline } from "lineadraw";

export default defineBlock({
  id: "@lineadraw/hollow-core-profile",
  name: "Hollow Core Profile",
  description: "Draws a profile of a hollow core slab",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "catalog", "concrete", "precast", "building"],
  params: () => [
    {
      name: "profile",
      label: "Profile",
      type: "enum",
      default: "P27",
      options: hollowCores.map((p) => p.name),
    },
  ],
  draw: ({ params }) => {
    const p = hollowCores.find((p) => p.name === params.profile);
    return p ? [hcPolyline(p.outline), ...p.holes.map(hcPolyline)] : [];
  },
});

// ———————————————————————— Geometry builder ————————————————————————

/** Closed polyline from vertices with optional corner fillets/chamfers.
 * Round chamfers become bulge arcs tangent to both edges. */
const hcPolyline = (verts: readonly HcVertex[]): Polyline => {
  const raw: [number, number, number][] = [];
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const [x, y, ch] = verts[i];
    if (ch === undefined) {
      raw.push([x, y, 0]);
      continue;
    }
    const [px, py] = verts[(i + n - 1) % n];
    const [qx, qy] = verts[(i + 1) % n];
    const l1 = Math.hypot(px - x, py - y);
    const u1 = [(px - x) / l1, (py - y) / l1]; // unit toward prev vertex
    const l2 = Math.hypot(qx - x, qy - y);
    const u2 = [(qx - x) / l2, (qy - y) / l2]; // unit toward next vertex
    if (typeof ch === "number") {
      const theta = Math.acos(
        Math.min(1, Math.max(-1, u1[0] * u2[0] + u1[1] * u2[1])),
      );
      const d = ch / Math.tan(theta / 2); // tangent offset from the corner
      // Arc sweeps pi - theta; CCW (positive bulge) on a left turn, i.e.
      // cross(-u1, u2) > 0.
      const bulge =
        Math.tan((Math.PI - theta) / 4) *
        (u1[0] * u2[1] - u1[1] * u2[0] > 0 ? -1 : 1);
      raw.push([x + u1[0] * d, y + u1[1] * d, bulge]);
      raw.push([x + u2[0] * d, y + u2[1] * d, 0]);
    } else {
      raw.push([x + u1[0] * ch[0], y + u1[1] * ch[0], 0]);
      raw.push([x + u2[0] * ch[1], y + u2[1] * ch[1], 0]);
    }
  }
  // Fillets that consume a whole edge (e.g. a void that is a full circle)
  // leave coincident neighbours — merge them, keeping the arc vertex.
  const pts: [number, number, number][] = [];
  for (const p of raw) {
    const prev = pts[pts.length - 1];
    if (prev && Math.hypot(p[0] - prev[0], p[1] - prev[1]) < 1e-6) {
      if (prev[2] === 0) pts[pts.length - 1] = p;
    } else pts.push(p);
  }
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (
    pts.length > 2 &&
    last[2] === 0 &&
    Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-6
  )
    pts.pop();
  return {
    type: "polyline",
    points: pts.map(([x, y, b]): [number, number, number?] =>
      b ? [x, y, b] : [x, y],
    ),
    closed: true,
  };
};

// ———————————————————————— Catalogue data ————————————————————————
// Referenced from the `params` function and `draw` — both run after the
// module body, so the tables may sit down here.

/** Hole corner treatment: radius (round fillet) or [cut1, cut2] (straight
 * chamfer measured back along the incoming/outgoing edge). */
type HcChamfer = number | readonly [number, number];
/** [x, y, chamfer?] */
type HcVertex = readonly [number, number, HcChamfer?];

type HcSection = {
  name: string;
  outline: readonly HcVertex[];
  holes: readonly (readonly HcVertex[])[];
};

/** 4-corner core void, CCW from bottom-left, radius-r corners. */
const hcRound = (
  x: number,
  w: number,
  y1: number,
  y2: number,
  r: number,
): HcVertex[] => [
  [x, y1, r],
  [x + w, y1, r],
  [x + w, y2, r],
  [x, y2, r],
];

/** P32/P40 core void: straight chamfers below, radius-r corners above. */
const hcChamfered = (
  x: number,
  w: number,
  y1: number,
  y2: number,
  c: number,
  r: number,
): HcVertex[] => [
  [x, y1, [c, c]],
  [x + w, y1, [c, c]],
  [x + w, y2, r],
  [x, y2, r],
];

// Parma hollow core slabs (1200 mm wide), bbox-centered like the steel
// sections. Outlines carry the grout key/bevel profile verbatim from the
// catalog; voids are generated from their corner coordinates.
const hollowCores: readonly HcSection[] = [
  {
    name: "P18",
    outline: [
      [-600, -77.5],
      [-585, -87.5],
      [585, -87.5],
      [600, -77.5],
      [600, -67.5],
      [585, -57.5],
      [577.5, 7.5],
      [570, 22.5],
      [577.5, 37.5],
      [577.5, 87.5],
      [-577.5, 87.5],
      [-577.5, 37.5],
      [-570, 22.5],
      [-577.5, 7.5],
      [-585, -57.5],
      [-600, -67.5],
    ],
    holes: [-545, -405, -265, -125, 15, 155, 295, 435].map((x) =>
      hcRound(x, 110, -42.5, 67.5, 55),
    ),
  },
  {
    name: "P20",
    outline: [
      [-600, -90],
      [-583.38, -100],
      [583.38, -100],
      [600, -90],
      [600, -80],
      [585, -70],
      [577.5, 45],
      [570, 60],
      [577.5, 75],
      [577.5, 100],
      [-577.5, 100],
      [-577.5, 75],
      [-570, 60],
      [-577.5, 45],
      [-585, -70],
      [-600, -80],
    ],
    holes: [-547.5, -359.5, -171.5, 16.5, 204.5, 392.5].map((x) =>
      hcRound(x, 155, -77.5, 77.5, 77.5),
    ),
  },
  {
    name: "P27",
    outline: [
      [-600, -122.5],
      [-583.38, -132.5],
      [583.38, -132.5],
      [600, -122.5],
      [600, -112.5],
      [585, -102.5],
      [577.5, 77.5],
      [570, 92.5],
      [577.5, 107.5],
      [577.5, 132.5],
      [-577.5, 132.5],
      [-577.5, 107.5],
      [-570, 92.5],
      [-577.5, 77.5],
      [-585, -102.5],
      [-600, -112.5],
    ],
    holes: [-540.5, -316.5, -92.5, 131.5, 355.5].map((x) =>
      hcRound(x, 185, -92.5, 92.5, 92.5),
    ),
  },
  {
    name: "P32",
    outline: [
      [-600, -150],
      [-583.38, -160],
      [583.38, -160],
      [600, -150],
      [600, -140],
      [585, -130],
      [577.5, 105],
      [570, 120],
      [577.5, 135],
      [577.5, 160],
      [-577.5, 160],
      [-577.5, 135],
      [-570, 120],
      [-577.5, 105],
      [-585, -130],
      [-600, -140],
    ],
    holes: [-532.5, -252.5, 27.5, 307.5].map((x) =>
      hcChamfered(x, 225, -120, 120, 55, 112.5),
    ),
  },
  {
    name: "P37",
    outline: [
      [-596.89, -170.96],
      [-586.86, -185],
      [587.07, -185],
      [597.1, -170.96],
      [600.1, -155],
      [581.92, -137.15],
      [580.07, -65.44],
      [570.74, -46.54],
      [579.84, -27.54],
      [577.33, 103.71],
      [567.64, 122.65],
      [576.74, 141.88],
      [575.23, 174.97],
      [565.04, 185],
      [-565.25, 185],
      [-575.44, 174.97],
      [-576.95, 141.88],
      [-567.85, 122.65],
      [-577.54, 103.71],
      [-580.05, -27.54],
      [-570.95, -46.77],
      [-580.63, -65.71],
      [-581.72, -137.15],
      [-599.9, -155],
    ],
    holes: [
      // Edge voids follow the slanted slab sides, so they are irregular.
      [
        [-532.9, -130, 75],
        [-362.9, -130, 75],
        [-362.9, 130, 75],
        [-447.89, 130, 75],
        [-494, 115.62, 75],
        [-532.68, 31.46],
      ],
      hcRound(-308.9, 170, -130, 130, 75),
      hcRound(-84.9, 170, -130, 130, 75),
      hcRound(139.1, 170, -130, 130, 75),
      [
        [363.1, -130, 75],
        [533.1, -130, 75],
        [532.89, 31.46, 75],
        [494.21, 115.62, 75],
        [448.11, 130, 75],
        [363.1, 130, 75],
      ],
    ],
  },
  {
    name: "P40",
    outline: [
      [-600, -190],
      [-583.38, -200],
      [583.38, -200],
      [600, -190],
      [600, -180],
      [585, -170],
      [577.5, 145],
      [570, 160],
      [577.5, 175],
      [577.5, 200],
      [-577.5, 200],
      [-577.5, 175],
      [-570, 160],
      [-577.5, 145],
      [-585, -170],
      [-600, -180],
    ],
    holes: [-532.5, -252.5, 27.5, 307.5].map((x) =>
      hcChamfered(x, 225, -160, 160, 55, 112.5),
    ),
  },
  {
    name: "P50",
    outline: [
      [-600, -240],
      [-583.38, -250],
      [583.38, -250],
      [600, -240],
      [600, -230],
      [585, -220],
      [577.5, 195],
      [570, 210],
      [577.5, 225],
      [577.5, 250],
      [-577.5, 250],
      [-577.5, 225],
      [-570, 210],
      [-577.5, 195],
      [-585, -220],
      [-600, -230],
    ],
    holes: [-515, -240, 35, 310].map((x) => hcRound(x, 205, -210, 210, 102.5)),
  },
];
