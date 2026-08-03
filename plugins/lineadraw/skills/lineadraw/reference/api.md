# @lineadraw/sdk API reference

Everything goes through `Drawing`. World units mm, Y-up, angles radians CCW.
Points accept `{x, y}` or `[x, y]` everywhere (`PointInput`).

## Open / create

```js
import { newDrawing, drawingFromJson, openDrawing, parseScale } from "@lineadraw/sdk";

const doc = newDrawing();                    // "Layer 0" only; no layouts yet
const doc2 = await openDrawing("a.linea");   // parse + migrate; doc2.migration = {from, to} | null
const doc3 = drawingFromJson(jsonText);
parseScale("1:50");                           // → 50 (model mm per paper mm)
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
| `polyline` | `points: [{x,y,bulge?}\|[x,y,bulge?]...]`, `closed?` | bulge = tan(sweep/4), >0 CCW arc to next vertex; **there is no rectangle type** — use a closed 4-point polyline |
| `circle` | `center`, `radius` | |
| `arc` | `center`, `radius`, `startAngle`, `endAngle` | runs CCW from start to end (DXF convention) |
| `ellipse` | `center`, `majorAxis`, `ratio` | majorAxis = endpoint vector from center; ratio = minor/major (0..1]; optional `startAngle`/`endAngle` for elliptical arcs |
| `hatch` | `loops: [{points}]`, `fill` | loops[0] outer, rest holes (even-odd). fill: `{kind:"solid"}` \| `{kind:"pattern", name, angle, scale}` (ANSI31/ANSI32/ANSI37/AR-CONC…) \| `{kind:"lines", angle, spacing}`; top-level `scale` = drawing-scale multiplier for the spacing (50 in a 1:50 drawing) |
| `text` | `position`, `content` | `textHeight` (mm, default 2.5), `scale` multiplier (set to drawing-scale denominator), `hAlign`/`vAlign` (**default center/center**), `width` (word-wrap box), `rotation`, `frame` ("rectangle"/"bottom"), `font`, `widthFactor`, `leaderLines: [[pt,...]]` (arrowhead at index 0). `\t` in content aligns columns at tab stops every 4×textHeight (author tables as ONE multi-line text; tabbed lines don't word-wrap) |
| `dimension` | `points`, `offset` | `kind`: linear (default) / angular / radial / diameter. Points per kind: linear = measured points (>2 = chain); radial = `[center, pointOnCurve]`; **diameter = the two OPPOSITE points on the curve** (`[center, edge]` silently measures a radius — half the value); angular = vertex + legs. `offset` is a VECTOR from the kind's base point to the dimension line and is **required for every kind** (radial/diameter/angular use it to place the text). `textOverride`; `styleOverride` = per-object DimStyle patch (textHeight, arrowSize, …). **Drawing scale is the TOP-LEVEL `scale` field** (`scale: 50` for 1:50) — `scale` inside `styleOverride` is NOT a style key and is rejected |
| `viewport` | `rect: {x,y,w,h}` | layouts only; `modelCenter`, `scale` (denominator, 1:50 → 50), `locked`, `hiddenLayerIds` |
| `image` | `assetId`, `origin`, `width`, `height` | `assetId` comes from `doc.addAsset(dataUrl)`; skipped by DXF/DWG export |
| `block` | `definitionId`, `inputs` | instances of script-defined blocks; advanced — prefer plain geometry unless the document already has definitions |

## Reads

```js
doc.summary();          // {name, objectCount, byType, byLayer, bbox, layers, layouts}
doc.objects;            // model-space objects (compact DTOs)
doc.getObject(id);      // any space
doc.query({ type: "polyline", layer: "walls", color: "#ff0000",
            lineType: "dashed", content: "substring",       // text only
            bbox, inside, near: { point: [0,0], tol: 5 },   // all optional, ANDed
            layout: "Sheet 1" });  // search that layout's SHEET objects
                                   // (viewports, annotations) instead of model
doc.bboxOf(ids);        // AABB | null
doc.length(id);         // lines/polylines/arcs/circles/ellipses; null otherwise
doc.area(id);           // circles/ellipses/closed polylines/hatches (outer − holes)
```

## Mutations (kernel-validated; throw on invalid input)

```js
const ids = doc.add(objects);                  // model space
doc.add(objects, { layout: "Sheet 1" });       // onto a paper sheet (sheet mm)
doc.update(ids, { layerId: walls });           // shared patch
doc.update([{ id, radius: 20 }, { id: id2, content: "B" }]); // per-id batch
doc.remove(ids);
doc.addLayer({ name, color?, lineWidth?, opacity?, visible?, locked?, print? }); // → layer id; names unique
doc.updateLayer(nameOrId, { name?, color?, lineWidth?, opacity?, visible?, locked?, print? });
// print: false = shown on screen/SVG/PNG but EXCLUDED from PDF output
// (AutoCAD plot flag) — use for construction/guide layers.
doc.removeLayer(nameOrId);                     // refused while current or in use
doc.setCurrentLayer(nameOrId);                 // default layer for new objects
doc.setName("Project name");
doc.addAsset(dataUrl);                         // → assetId for image objects (content-keyed)
doc.removeAsset(id);                           // refused while an image references it
doc.setDimStyle({ textHeight, arrowSize, arrowType, precision, extensionOffset,
                  extensionOvershoot, textOffset, font, widthFactor });
// NOTE: no `scale` here, and none in styleOverride either — drawing-scale
// is the TOP-LEVEL `scale` field on each dimension object (scale: 50 for
// 1:50). add/update reject unknown styleOverride keys loudly.
doc.setTextStyle({ font, widthFactor, textHeight });
await doc.setBlockDefinitions([...sources]);   // async: block geometry definitive on resolve
await doc.ready();                             // for docs opened WITH blocks via drawingFromJson
doc.transaction(() => { ... });                // one undo step
doc.undo(); doc.redo();                        // → boolean
```

## Transforms (edit in place; find objects in any space)

```js
doc.move(ids, [dx, dy]);
doc.rotate(ids, angleRad, center?);            // radians CCW; default center = bbox center
doc.scale(ids, factor, center?);
doc.mirror(ids, a, b);                         // across line a-b
doc.copy(ids, [dx, dy]);                       // → new ids
doc.array(ids, count, [dx, dy]);               // count copies, cumulative delta → new ids
```

## Layouts (paper space)

```js
doc.createLayout("Plan 1:50", {
  sheet: "A3" | "A4" | "A2" | "A1" | "A0" | { width, height },  // default A3
  orientation: "portrait" | "landscape",                        // named sheets
  viewport: { rect?, scale?: "1:50", center? } | false,         // default: fitted viewport
  index?,
});                                            // → layout id
doc.updateLayoutMeta(nameOrId, { name?, sheet?, printPalette? }); // "color" | "monochrome"
doc.removeLayout(nameOrId);
```

New documents are layout-less. `exportPdf` of a layout-less document falls
back to a single auto-fitted A3 page; create explicit layouts for real
deliverables.

## Import / export

```js
// import (merge into this doc; returns {objects, layers, layouts, objectIds, layoutIds})
doc.importDxfText(text, { unitOverride? }); await doc.importDxf(path);
await doc.importDwgData(bytes); await doc.importDwg(path);   // DWG R13–R2018
await doc.importPdfData(arrayBuffer);                        // vector + text

// export
doc.toSvg({ layout?, bbox?, padding?, palette? });  await doc.exportSvg(path, opts);
await doc.toPng({ width?, background?, palette? }); await doc.exportPng(path, opts);
// palette: "color" | "grayscale" | "monochrome" — print-style remap. Use
// monochrome + background "#ffffff" for a paper-like preview: as-authored
// layer colors target the DARK canvas and near-vanish on white otherwise.
// Layout renders default to the layout's own printPalette.
doc.toDxf();                                await doc.exportDxf(path);
await doc.toDwg({ version? });              await doc.exportDwg(path, { version? }); // default "AC1027"
await doc.toPdf({ layouts?, palette? });    await doc.exportPdf(path, opts);
doc.toJson();                               await doc.save(path?);
```

SVG output wraps each object in `<g data-object-id data-layer>` — useful for
programmatic checks — and `toSvg({bbox})` CULLS objects outside the box. PNG
defaults to the dark canvas background at 1024 px; pass
`background: "#ffffff"` for a paper-like preview, `width` for detail.

## Gotchas

- `add` throws on unknown layer and duplicate ids; `update`/`remove` throw on
  unknown ids. Wrap risky batches in `transaction`.
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
  reports them in the export's `skipped` map — mention that when relevant.
