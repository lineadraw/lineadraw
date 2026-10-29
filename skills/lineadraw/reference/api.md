# lineadraw/sdk API reference

`npm i lineadraw` (Node 20+, ESM). Everything goes through `Drawing` — core's
`LocalDrawing` plus Node file I/O. World units mm, Y-up, angles radians CCW.
Points accept `{x, y}` or `[x, y]` everywhere (`PointInput`). Layers, layouts
and styles are addressed by name or id. Methods THROW on invalid input (the
failing object and field named); reads return detached snapshots.

## Open / create

```js
import { newDrawing, drawingFromJson, openDrawing, parseScale } from "lineadraw/sdk";

const doc = newDrawing("Plan");                // "Layer 0" only; no layouts yet; name optional
const doc2 = await openDrawing("a.linea");     // parse + migrate + ready(); doc2.migration = {from, to} | null
const doc3 = drawingFromJson(jsonText);        // then `await doc3.ready()` if it holds blocks/references
parseScale("1:50");                            // → 50 (model mm per paper mm); "2:1" → 0.5; a number passes through
doc.name; doc.filePath; doc.id; doc.revision;  // name follows the file on open/save; revision = change counter
doc.document;                                  // the full validated LineaDocument (a clone — edits do nothing)
```

## Object types (what `add` accepts)

Base fields on every object — `layerId` (or use `layer: "name"` in `add`,
resolved for you), optional overrides `color` (`#rrggbb`), `lineType` (name,
e.g. `"dashed"`, `"ACAD_ISO04W100"`), `lineTypeScale`, `lineWidth` (paper mm),
`opacity` (0..1, absent = inherit the layer's opacity; paints across
canvas/SVG/PDF, not exported to DXF/DWG), `hidden`. Unset = inherit from
layer. `id` is assigned by `add`; never invent ids.

| type | required fields | notes |
|---|---|---|
| `line` | `a`, `b` | |
| `point` | `p` | paints as a round dot whose diameter is the lineWidth |
| `polyline` | `points: [{x,y,bulge?}\|[x,y,bulge?]...]`, `closed?` | bulge = tan(sweep/4), >0 CCW arc to next vertex; **there is no rectangle type** — use a closed 4-point polyline |
| `circle` | `center`, `radius` | |
| `arc` | `center`, `radius`, `startAngle`, `endAngle` | runs CCW from start to end (DXF convention); start === end renders a full circle |
| `ellipse` | `center`, `majorAxis`, `ratio` | majorAxis = endpoint vector from center; ratio = minor/major (0..1]; optional `startAngle`/`endAngle` for elliptical arcs |
| `hatch` | `loops: [{points}]`, `fill` | loops[0] outer, rest holes (even-odd). fill: `{kind:"solid"}` \| `{kind:"pattern", name, angle, scale}` (ANSI31/ANSI32/ANSI37/AR-CONC…) \| `{kind:"lines", angle, spacing}`; top-level `scale` = drawing-scale multiplier for the spacing (50 in a 1:50 drawing) |
| `text` | `position`, `content` | `textHeight` (mm, default 2.5), `scale` multiplier (set to drawing-scale denominator), `hAlign`/`vAlign` (**default center/center**), `width` (word-wrap box), `rotation`, `frame` ("rectangle"/"bottom"), `font`, `widthFactor`, `leaderLines: [[pt,...]]` (arrowhead at index 0). `\t` in content aligns columns at tab stops every 4×textHeight (author tables as ONE multi-line text; tabbed lines don't word-wrap) |
| `dimension` | `points`, `offset` | `kind`: linear (default) / angular / radial / diameter. Points per kind: linear = measured points (>2 = chain); radial = `[center, pointOnCurve]`; **diameter = the two OPPOSITE points on the curve** (`[center, edge]` silently measures a radius — half the value); angular = vertex + legs. `offset` is a VECTOR from the kind's base point to the dimension line and is **required for every kind** (radial/diameter/angular use it to place the text). `textOverride`; `styleOverride` = per-object DimStyle patch (textHeight, arrowSize, …). **Drawing scale is the TOP-LEVEL `scale` field** (`scale: 50` for 1:50) — `scale` inside `styleOverride` is NOT a style key and is rejected |
| `table` | `position`, `columns`, `rows`, `cells` | a real grid of text cells hanging right/down from `position` (top-left). `columns: [w, …]` mm; `rows`: a COUNT or `[{ minHeight? }, …]` (rows grow to fit wrapped text); `cells[row][col]` exactly rows × columns — a string or `{ text, span?: {cols, rows} (on the anchor cell), hAlign?, vAlign?, color?, styleId?, styleOverride? }`. Optional `headerRows` (heavier rule under them), `cellMargin` (1), `borders` ("all"/"outer"/"rows"/"none"), `rotation`, `styleId`/`styleOverride`, and top-level `scale` (drawing-scale multiplier — sizes are paper mm before it, like text). Exports to DXF/PDF/SVG as its rules + texts |
| `viewport` | `rect: {x,y,w,h}` | layouts only; `modelCenter`, `scale` (denominator, 1:50 → 50), `locked`, `hiddenLayerIds` |
| `image` | `assetId`, `origin`, `width`, `height` | `assetId` comes from `doc.addAsset(dataUrl)`; skipped by DXF/DWG export |
| `block` | `definitionId`, `inputs` | an instance of a block module the document holds (`doc.listBlockDefinitions()`; add modules with `addBlockDefinitions`). `inputs`: world points, the first is the pivot (object-reference inputs are id strings); `params`: only values that differ from the block's defaults; `rotation`/`scale` apply about the pivot. Authoring blocks: blocks-and-commands.md |
| `reference` | `format`, `name`, `source`, `position` | a LINKED file drawn in place (xref) — the document holds the record, never the bytes. `format`: linea/dxf/dwg/pdf/png/jpg; `source`: `{ kind: "path", path }` (relative to the drawing's file) or `{ kind: "url", url }`. Optional `rotation`, `scale`, `mirrored`, `pdfPage`/`pdfMode` ("vector"/"raster"), `hiddenLayers` (the FILE's layer names), `clip` (AABB in file coords). The SDK reads the file in `ready()` (`openDrawing` does; call `await doc.ready()` after adding one) — unreadable → drawn as a frame |
| `comment` | `position` | a review note (`text`, `tags`) pinned to a point. Editor chrome only: never reaches PDF/SVG/PNG, skipped by DXF/DWG |

## Reads

```js
doc.summary();          // {name, objectCount, byType, byLayer, bbox, layers, layouts: [{name, objectCount}]}
doc.objects;            // model-space objects (stored form: defaults applied, {x, y} points)
doc.layers; doc.layouts;
doc.getObject(id);      // any space; undefined when unknown
doc.listObjects({ ids, type: "polyline", layer: "walls", color: "#ff0000",
            lineType: "dashed", content: "substring",       // text only
            bbox, inside, near: { point: [0,0], tol: 5 },   // all optional, ANDed
            layout: "Sheet 1" });  // search that layout's SHEET objects
                                   // (viewports, annotations) instead of model
doc.measure(id);        // {bbox, length, area} — null where the type has no natural value
doc.bboxOf(ids);        // AABB | null   (SDK shorthands over measure)
doc.length(id);         // lines/polylines/arcs/circles; null otherwise
doc.area(id);           // circles/closed polylines/hatches (outer − holes); null otherwise
doc.listLayers();       // [{id, name, color, …, current}]
doc.listLayouts(); doc.listTextStyles(); doc.listDimStyles();
doc.listBlockDefinitions(); doc.listUserCommands();  // the document's modules (compilable ones)
doc.listAssets();       // [{ id, mimeType, bytes, users }]
```

## Mutations (kernel-validated; throw on invalid input)

```js
const ids = doc.add(objects);                  // model space → the new ids
doc.add(objects, { layout: "Sheet 1" });       // onto a paper sheet (sheet mm)
doc.update(ids, { layerId: walls });           // shared patch (layer: "name" works too)
doc.update([{ id, radius: 20 }, { id: id2, content: "B" }]); // per-id batch
doc.remove(ids);                               // → how many went; UNKNOWN ids are skipped, not an error
doc.reorder(ids, "front" | "back" | { above: id } | { below: id }); // draw order (ids bottom → top)
doc.addLayer({ name, color?, lineWidth?, opacity?, visible?, locked?, print? }); // → layer id; names unique (throws on a clash)
doc.updateLayer(nameOrId, { name?, color?, lineWidth?, opacity?, visible?, locked?, print? });
// print: false = shown on screen/SVG/PNG but EXCLUDED from PDF output
// (AutoCAD plot flag) — use for construction/guide layers. `locked` is an
// editor-UI concept: the SDK does not block edits on a locked layer.
doc.removeLayer(nameOrId);                     // must be empty and not current
doc.reorderLayers([...namesOrIds]);            // every layer exactly once
doc.setCurrentLayer(nameOrId);                 // default layer for new objects (not an undo step)
doc.name = "Project name";                     // the file name takes over on save(path)
doc.addAsset(dataUrl);                         // → assetId for image objects (content-keyed)
doc.removeAsset(id);                           // refused while an image references it
// Styles: by name or id; the first style serves objects without a styleId.
doc.updateDimStyle("Standard", { textHeight, arrowSize, arrowType, precision,
  extensionOffset, extensionOvershoot, textOffset, font, widthFactor });
// NOTE: no `scale` here, and none in styleOverride either — drawing-scale
// is the TOP-LEVEL `scale` field on each dimension object (scale: 50 for
// 1:50). add/update reject unknown styleOverride keys loudly.
doc.updateTextStyle("Standard", { font, widthFactor, textHeight });
doc.addTextStyle({ name: "Notes", textHeight: 3.5 });  // → id; also addDimStyle
doc.removeTextStyle("Notes");                  // refused while objects use it; also removeDimStyle
// (setTextStyle / setDimStyle still exist as deprecated aliases of update.)
// Modules (merged by exported id: a matching id REPLACES — that's the update):
await doc.addBlockDefinitions([src]);          // → merge report; async: block geometry
                                               // definitive on resolve
doc.removeBlockDefinition(id);                 // refused while placed / depended on
await doc.addUserCommands([src]); doc.removeUserCommand(id);
await doc.runUserCommand(id, inputs?, params?); // run one of the document's commands
await doc.runScript(source, inputs?, params?);  // run an unsaved defineCommand module as ONE
                                                // undo step; inputs = its declared pick points,
                                                // params by name (unknown/wrong type throws);
                                                // resolves with the script's return value
await doc.ready();                             // blocks compiled + referenced files loaded
                                               // (openDrawing does this; drawingFromJson/newDrawing don't)
doc.transaction(() => { ... });                // one undo step; sync or async fn; a throw ROLLS BACK
                                               // everything it applied; nested calls join the outer one
doc.undo(); doc.redo();                        // → boolean; throw inside an open transaction
doc.applyOps(ops);                             // escape hatch: a pre-shaped Operation batch, atomic
```

## Transforms (edit in place; find objects in any space)

```js
doc.move(ids, [dx, dy]);
doc.rotate(ids, angleRad, center?);            // radians CCW; default center = bbox center
doc.scale(ids, factor, center?);
doc.mirror(ids, a, b);                         // across line a-b
doc.copy(ids, [dx, dy]);                       // → new ids
doc.array(ids, count, [dx, dy]);               // count TOTAL copies incl. the originals, cumulative delta → the new ids
```

## Layouts (paper space)

```js
doc.addLayout("Plan 1:50", {
  sheet: "A3" | { name: "A3", orientation: "portrait" } | { width, height }, // default A3 landscape;
                                                 // a bare name is LANDSCAPE (no separate `orientation` key)
  viewport: { rect?, scale?: "1:50", center? } | false,   // default: fitted viewport; false = bare sheet
  scale: "1:50",                                 // shorthand for viewport.scale
  index?,                                        // tab position; default append
});                                              // → layout id
doc.updateLayout(nameOrId, { name?, sheet?, printPalette? }); // sheet as above — a bare "A3" keeps
                                                 // the current orientation; palette "color" | "grayscale" | "monochrome"
doc.removeLayout(nameOrId);
doc.reorderLayouts([...namesOrIds]);           // PDF page order
```

New documents are layout-less. `exportPdf` of a layout-less document falls
back to a single auto-fitted A3 page; create explicit layouts for real
deliverables.

## Import / export

```js
// import (merge into this doc; DXF/DWG return {objects, layers, layouts, objectIds, layoutIds},
// PDF returns {objects, pageCount, objectIds})
doc.importDxfText(text, { unitOverride? }); await doc.importDxf(path, opts?);  // unitOverride = mm per unit
await doc.importDwgData(bytes); await doc.importDwg(path);   // DWG R13–R2018
await doc.importPdfData(bytes); await doc.importPdf(path);  // vector lines + text, onto the current layer
// importPdfData(bytes, { as: "image", origin? }) places page images instead —
// in the editor only for now: headless Node THROWS (no PDF rasterizer yet).

// export (render* returns the content, export* writes the file)
doc.renderSvg({ layout?, bbox?, padding?, palette? });       await doc.exportSvg(path, opts);
await doc.renderPng({ layout?, width?, background?, palette? }); await doc.exportPng(path, opts);
// palette: "color" | "grayscale" | "monochrome" — print-style remap. Use
// monochrome + background "#ffffff" for a paper-like preview: as-authored
// layer colors target the DARK canvas and near-vanish on white otherwise.
// Layout renders default to the layout's own printPalette.
await doc.toDxf();                          await doc.exportDxf(path);
await doc.toDwg({ version? });              await doc.exportDwg(path, { version? });
// version: "AC1015" (2000) | "AC1018" | "AC1021" | "AC1024" | "AC1027" (2013, default) | "AC1032" (2018)
await doc.renderPdf({ layouts?, palette? }); await doc.exportPdf(path, opts); // layouts: names/ids in page order
doc.toLinea();                               await doc.save(path?);   // → the path written; sets filePath + name
// save() without a path works only for a drawing opened from a file (else it throws).
```

SVG output wraps each object in `<g data-object-id data-layer>` — useful for
programmatic checks — and `renderSvg({bbox})` CULLS objects outside the box. PNG
defaults to the dark canvas background at 1024 px; pass
`background: "#ffffff"` for a paper-like preview, `width` for detail.

## Validating block / command modules

The same package exports the checks the editor and the marketplace CLI run
(`ensureScriptTranspiler`, `getBlockMetaResult`, `testBlockDefinition`,
`renderBlockThumbnailSvg`, `getCommandMetaResult`) — see
blocks-and-commands.md.

## Gotchas

- `add` throws on an unknown layer and on invalid fields; `update` and every
  transform throw on an unknown id. `remove` does NOT: unknown ids are
  skipped and the count tells you how many were actually deleted. Wrap risky
  batches in `transaction`.
- Opening a file written by a NEWER Linea version throws instead of loading
  lossily.
- Text defaults to **center/center** alignment — pass `hAlign`/`vAlign`
  explicitly when placing by a corner.
- **Alignment names which side of the point the text OCCUPIES, not the
  anchor edge**: `hAlign: "left"` puts the text to the LEFT of `position`
  (anchor on its right edge — the opposite of CSS `text-align`);
  `vAlign: "top"` puts it ABOVE the point. If a label runs off the sheet
  the wrong way, flip the alignment — this is deliberate CAD semantics,
  identical in model and paper space, not a rendering bug.
- Dimension `offset` is a vector (direction is preserved by later edits) —
  e.g. `[0, -500]` puts a horizontal measurement 500 mm below points[0].
- `hatch` boundaries are copied geometry (non-associative): if you move the
  outline, re-create or move the hatch too.
- DXF/DWG export skips `image` objects (they'd need external files) and
  `comment`s, and flattens block instances to geometry; skipped items are
  reported in the export's `skipped` map — mention that when relevant.
