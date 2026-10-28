---
name: lineadraw
description: Work with Linea, the browser 2D CAD editor, and its .linea documents. Create, edit, and export drawings (.linea, DXF, DWG, PDF, SVG/PNG) with lineadraw/sdk; drive the headless Linea MCP server (linea_* tools + in-chat editor); connect to a RUNNING Linea editor via its WebMCP local relay; author parametric blocks (defineBlock) and macro commands (defineCommand) and publish them to a marketplace. Use when asked to produce a CAD drawing or drafting deliverable, script edits to a .linea file, convert DXF/DWG, read or edit what the user has open in Linea, or write a Linea block or command.
---

# lineadraw — SDK, MCP, and block/command authoring for Linea

Linea is a 2D CAD editor (browser app, https://lineadraw.com) whose documents
(`.linea`) are also fully scriptable headlessly. Four ways in, one document
model:

- **`lineadraw/sdk`** (Node, in-process): write a script. Best for anything
  with loops, computed placement, or more than a handful of objects.
- **Linea MCP server** (`@lineadraw/mcp`, headless): granular `linea_*`
  tool calls over a document registry, plus an **in-chat interactive
  editor** (MCP App) the user can draw in. Best when the user wants to
  watch or participate, or no Node scratch project is warranted.
- **The running editor via WebMCP**: the user's open Linea tab exposes the
  same `linea_*` tools through a local relay. You read and edit the
  document they are LOOKING AT, live and undoable. Best for "fix/annotate
  what I have open".
- **Blocks and commands**: parametric symbols (`defineBlock`) and editor
  macros (`defineCommand`) are small TypeScript modules that live inside
  documents or in a marketplace repository. Best when the user wants a
  reusable symbol or an automated editing step, not a one-off drawing.

References (read the one you need before writing anything):

- [reference/api.md](reference/api.md) — the SDK API and the object-type
  cheat sheet. Read it before writing objects with ANY of the paths; the
  MCP tools take the same object bodies.
- [reference/mcp.md](reference/mcp.md) — both MCP paths, setup and
  semantics.
- [reference/blocks-and-commands.md](reference/blocks-and-commands.md) —
  authoring blocks and commands, validating them headlessly, and the three
  ways to deliver them. Real modules from the public collection are in
  [reference/examples/](reference/examples/).

## Setup (SDK)

Install the published package from npm (`@resvg/resvg-js` is a native
addon pulled in as a dependency):

```bash
mkdir scratch && cd scratch && npm init -y
npm install lineadraw
```

(Working inside the linea repo instead? `npm run build -w lineadraw`
once, then import the workspace package directly.)

Node 20+, ESM (`"type": "module"` or `.mjs`). Everything is in-process, no
server, no browser:

```js
import { newDrawing, openDrawing } from "lineadraw/sdk";
```

## Iron rules

1. **Never hand-write or hand-edit `.linea` JSON.** All mutations go through
   the SDK/MCP ops; they are zod-validated by the kernel, and raw JSON edits
   are how documents get corrupted. Same for reads: use `query`/`summary`,
   don't parse the file yourself.
2. **Units are millimeters, Y-up; angles are radians CCW** (SDK, block and
   command scripts). The MCP `linea_transform` tool alone speaks degrees.
3. **Draw 1:1 in model space.** A 6 m wall is 6000 mm long. Presentation
   scale belongs to the paper layout's viewport, never to the geometry.
4. **Style by layer.** Create purposeful layers (axes, walls, hatching,
   dimensions, text, …) with `color`/`lineWidth` set on the layer; leave
   per-object `color`/`lineWidth`/`lineType` unset so they inherit
   ("byLayer"). Per-object overrides are the exception, not the norm.
5. **Verify by rendering, not by re-reading data.** After building, export a
   PNG and *look at it* (`await doc.exportPng("check.png", { width: 1600 })`).
   Fix what looks wrong. This is the single biggest quality lever. Judge
   geometry, annotation size, and placement, but expect strokes to be faint
   hairlines: `lineWidth` is a physical print weight (0.5 mm is subpixel when
   6 m of model fits in 1600 px). Don't inflate lineweights to look good in
   the preview; check print fidelity via the layout PDF instead.
6. **Batch related edits in `doc.transaction(() => { ... })`**: one undo
   step, and errors roll up cleanly.

## Standard workflow

```js
import { newDrawing } from "lineadraw/sdk";

const doc = newDrawing();

// 1) Layers first (byLayer styling). Layer 0 exists; add purposeful ones.
const walls = doc.addLayer({ name: "walls", color: "#e8e8e8", lineWidth: 0.5 });
const dims  = doc.addLayer({ name: "dimensions", color: "#7dd3fc", lineWidth: 0.18 });
doc.addLayer({ name: "hatching", color: "#9ca3af", lineWidth: 0.18 });

// 2) Geometry, 1:1 mm, points as [x, y] arrays (or {x, y}).
doc.transaction(() => {
  doc.add([
    { type: "polyline", layerId: walls, closed: true,
      points: [[0, 0], [6000, 0], [6000, 3000], [0, 3000]] },
    { type: "hatch", layer: "hatching",           // layer-by-name works too
      loops: [{ points: [[0, 0], [6000, 0], [6000, 3000], [0, 3000]] }],
      fill: { kind: "pattern", name: "ANSI31", angle: 0, scale: 1 },
      scale: 50 },                                 // pattern spacing × drawing scale
  ]);
});

// 3) Annotations: scale: 50 on each = the 1:50 drawing scale (see below).
doc.add([
  { type: "dimension", layerId: dims, kind: "linear",
    points: [[0, 0], [6000, 0]], offset: [0, -500],
    scale: 50 },                              // TOP-LEVEL scale, not styleOverride
  { type: "text", layer: "dimensions", position: [3000, 3400],
    content: "PLAN 1:50", textHeight: 5, scale: 50, hAlign: "center" },
]);

// 4) Paper layout: sheet + viewport at a stated scale. (New documents are
//    layout-less; exportPdf of a layout-less doc falls back to one
//    auto-fitted A3.)
doc.createLayout("Plan 1:50", {
  sheet: "A3", orientation: "landscape",
  viewport: { scale: "1:50" },                     // centers on model extents
});

// 5) Verify visually, then ship.
await doc.exportPng("check.png", { width: 1600 }); // LOOK at this file
await doc.save("plan.linea");                      // the source of truth
await doc.exportPdf("plan.pdf");                   // prints the layouts
```

## Annotation scale — the #1 "ugly output" trap

`textHeight`/`arrowSize`/hatch spacings are world mm. Text that should read
2.5 mm tall *on paper* must be 2.5 × N world-mm tall in a 1:N drawing. That
multiplier is a **per-object, top-level** `scale` field. There is NO
document-level knob (`setDimStyle` has no `scale`), and `scale` is NOT a
`styleOverride` key either (unknown style keys are rejected loudly). Set it
to the drawing-scale denominator (50 for 1:50) on every annotation:

- text → `scale: 50` (keep `textHeight` at paper size: 2.5 body, 3.5
  subtitles, 5 titles)
- dimension → top-level `scale: 50`
- hatch → top-level `scale: 50` (multiplies the pattern spacing)

If annotations come out microscopic (or hatches render as a dense smear) in
the PNG check, this is what's wrong.

## Deliverables

| File | Role |
|---|---|
| `.linea` | **Always deliver.** The editable source of truth (`doc.save`). |
| `.pdf` | For humans/print. Paginates the paper layouts (`exportPdf`). |
| `.dxf` / `.dwg` | For other CAD tools (`exportDxf` / `exportDwg`; DWG defaults to AC1027/AutoCAD 2013). Block instances flatten to geometry; images are skipped (no external-file references). |
| `.svg` / `.png` | Previews and self-verification (`exportSvg` / `exportPng`). |
| `.block.ts` / `.cmd.ts` | A block or command module the user drops onto the editor, or commits to a marketplace repo (see blocks-and-commands.md). |

Print-quality checks before shipping: every layout has a title text on the
sheet; viewport scale is a round drawing scale (1:20/1:50/1:100…), not an
arbitrary fit; set `printPalette: "monochrome"` via `updateLayoutMeta` for
print-style black-on-white output; run `doc.summary()` once at the end and
confirm counts/layers look intentional.

## Importing existing files

```js
const rep = await doc.importDxf("input.dxf");        // or importDxfText(text)
const rep2 = await doc.importDwgData(bytes);         // or importDwg(path): DWG R13–2018
const rep3 = await doc.importPdf("plan.pdf");        // or importPdfData(arrayBuffer): vector + text
```

Reports return created ids; use them to re-layer or clean up. If DXF
geometry comes in at a wrong size, re-import with
`{ unitOverride: mm-per-unit }`.

## Choosing a path, quickly

| The user wants… | Use |
|---|---|
| A drawing file / PDF / DXF produced from a description or data | SDK script (or MCP headless if they want to watch) |
| Changes to the drawing they have open in Linea | WebMCP relay (`linea_editor_state` first) |
| To draw together with you in the chat | MCP headless + `linea_show_document` |
| A reusable symbol with adjustable parameters | A block module (`defineBlock`) |
| An editing step they repeat (number things, select by rule, label areas) | A command module (`defineCommand`) |
| A company library everyone installs from | A marketplace repo (`npm create lineadraw`) |
