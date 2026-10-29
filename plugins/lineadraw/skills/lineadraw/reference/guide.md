# Working with Linea drawings

Linea is a 2D CAD editor: model space plus paper layouts (sheets). These
conventions hold for every route to it — the desktop bridge, a browser tab
over WebMCP, the headless `@lineadraw/mcp` server. `linea_guide` returns this
text.

## Conventions — get these wrong and the drawing is wrong

- **Units:** lengths in **millimeters**, angles in **radians**,
  counter-clockwise — in every tool argument, object field and script
  (only the app's UI shows degrees). A 6 m wall is `6000`; a quarter turn
  is `Math.PI / 2`. Y is up on the model plane.
- **Let Linea assign ids.** Don't pass `id` when creating:
  `linea_add_objects` returns the created ids — keep them and reference
  objects by id, never by name or position.
- **The geometry model is DXF-shaped.** There is no rectangle type (draw a
  closed polyline), arcs run counter-clockwise from `startAngle` to
  `endAngle`, polyline points carry DXF-style bulges. Object tools act on
  MODEL space unless `layout` names a paper layout — never on whatever space
  the user happens to be looking at.
- **Tool names are `linea_<verb>_<kind>`**: verbs list / add / update /
  remove (+ reorder for objects, layers, layouts); kinds objects, layers,
  layouts, text_styles, dim_styles, block_definitions, user_commands,
  documents. Edit tools take ARRAYS and apply them all or nothing. Layers,
  layouts and styles are addressed by name or id (`ids` to remove, `id` in
  each update entry).
- **Prefer one script to many calls.** `linea_run_script { source }` runs a
  `defineCommand` module against the document as ONE undo step with the full
  Drawing API (listObjects/add/update/remove/move/rotate/layers/layouts/
  styles/measure) — loops, computed placement and conditional edits belong
  there.
- **Verify by rendering, not by reading JSON:** `linea_render` returns a
  PNG/SVG of the model space or a layout; `linea_summary` gives counts and
  extents.
- **Every tool call is one undo step.** In a running app it lands in the
  user's own history and shows at once.

## Reading the drawing

- `linea_summary` for an overview; `linea_list_objects { type?, layer?,
  ids?, inside?, measure? }` for objects; `linea_get_document` is the whole
  file — avoid it unless you need everything.
- `linea_list_layers` / `linea_list_layouts` / `linea_list_text_styles` /
  `linea_list_dim_styles` / `linea_list_block_definitions` /
  `linea_list_user_commands`.
- In a running app: `linea_editor_state` — the active space, the selection,
  the camera; `linea_list_commands` — the editor's own commands, runnable
  with `linea_run_command`. The document's user commands run anywhere with
  `linea_run_user_command { id, inputs?, params? }`.

## Editing

- `linea_add_objects` — create (type + required fields; defaults fill the
  rest).
- `linea_update_objects` — change fields of existing objects by id.
- `linea_transform_objects` — move / rotate (`angle`, radians) / scale /
  mirror / copy / array by id.
- `linea_remove_objects`, `linea_reorder_objects` (draw order).
- `linea_add_layers` / `update` / `remove` / `reorder`,
  `linea_set_current_layer`.
- `linea_add_layouts` / `update` / `remove` / `reorder` — paper layouts
  (sheet size, viewports).
- `linea_add_text_styles` / `…_dim_styles` (+ update / remove). Removing a
  layer, style or block definition still in use is refused, with a count.
- `linea_add_block_definitions` / `linea_add_user_commands` take module
  sources and merge by id (a matching id replaces — that's the update).
- `linea_import { format: dxf | dwg | pdf, data }` merges a file in, as one
  undo step (DXF as text, DWG/PDF as base64; a PDF as vectors, or with
  `pdfAs: "image"` as page images where the host can rasterize).
- Images: `linea_add_assets { dataUrls }` (returns ids and pixel sizes), then
  `linea_add_objects` with `{ type: "image", assetId, origin, width, height }`
  in mm; `linea_list_assets` / `linea_remove_assets`.
- `linea_export { format: svg | png | pdf | dxf | dwg }` returns the file's
  content.
- In a running app, show the user what you did: `linea_set_selection { ids }`
  (or a filter, e.g. `{ inside: box }`), `linea_zoom { ids }`.

## Example: a plan with a dimensioned wall

```
linea_add_layers { layers: [{ name: "walls" }] }
linea_add_objects { objects: [
  { type: "polyline", layer: "walls", closed: true,
    points: [[0, 0], [6000, 0], [6000, 200], [0, 200]] },
  { type: "dimension", layer: "walls", points: [[0, 0], [6000, 0]], offset: [0, -600] } ] }
                                                          → ids [p, d]
linea_zoom { ids: [p, d] }
linea_render { format: "png", width: 1200 }
```
