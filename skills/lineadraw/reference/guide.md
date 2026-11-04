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
  layouts, text_styles, dim_styles, line_types, hatch_patterns,
  block_definitions, user_commands, documents. Edit tools take ARRAYS and apply them all or nothing. Layers,
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
  `linea_list_dim_styles` / `linea_list_line_types` /
  `linea_list_hatch_patterns` (the document's OWN definitions — the built-in
  catalogue is always available by name and not listed) /
  `linea_list_block_definitions` / `linea_list_user_commands`.
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
- Formatted text: a text's `content` stays plain; optional `spans` format
  ranges of it — `{ start, end, font?, bold?, italic?, underline?, color?
  ("#rrggbb"), height? (× the text's height), script? ("sub" | "super") }`,
  `start`/`end` are string indices, end exclusive. E.g. "CO2 at 25 m2":
  `spans: [{ start: 2, end: 3, script: "sub" }, { start: 11, end: 12,
  script: "super" }]`. Updating `content` without `spans` drops the old
  spans (their offsets would be stale) — send both to keep formatting.
  Table cells take the same `spans` over their `content`, dimension labels
  over their `content` template — a span covering `{value}` formats the
  measurement (`content: "Ø{value} H7"`, `spans: [{ start: 9, end: 11,
  script: "super" }]`).
- `linea_add_text_styles` / `…_dim_styles` (+ update / remove). Removing a
  layer, style or block definition still in use is refused, with a count.
- `linea_add_line_types` / `linea_add_hatch_patterns` (+ update / remove)
  define the document's own dash cycles and .pat-style line families;
  objects then reference them by name (`lineType`, `fill.name`), ahead of
  the catalogue. Removing one in use is allowed — the name falls back.
- `linea_add_block_definitions` / `linea_add_user_commands` take module
  sources and merge by id (a matching id replaces — that's the update).
- `linea_import { format: dxf | dwg | pdf, data }` merges a file in, as one
  undo step (DXF as text, DWG/PDF as base64; a PDF as vectors, or with
  `pdfAs: "image"` embedded as raster page references where the host can
  rasterize).
- Pictures and other files are REFERENCES: embed the bytes with
  `linea_add_assets { dataUrls }` (returns ids and pixel sizes), then
  `linea_add_objects` with `{ type: "reference", format: "png" | "jpg" |
  "pdf" | …, name, source: { kind: "asset", assetId }, position, scale }` —
  a picture draws at px × 25.4/96 mm times `scale`, bottom-left at
  `position`; `linea_list_assets` / `linea_remove_assets`.
- `linea_export { format: svg | png | pdf | dxf | dwg }` returns the file's
  content.
- Blocks and commands from **marketplaces** (block collections the host is
  configured with): `linea_search_marketplaces { query?, kind? }` lists
  entries with their install status → `linea_install_marketplace_entries
  { ids }` vendors them into the document (dependencies included, one undo
  step) → insert a block with `linea_add_objects { type: "block",
  definitionId }` or run a command with `linea_run_user_command`.
  `linea_list_marketplaces` / `linea_add_marketplaces { marketplaces:
  [{ spec: "owner/repo[@branch]", token? } | { folder }] }` /
  `linea_remove_marketplaces` manage the sources — installing runs a
  source's module code, so add only sources the user trusts.
- `linea_update_document_settings { units }` — the document's own settings
  (read them in `linea_summary`). In a running app,
  `linea_get_app_settings` / `linea_update_app_settings` cover this
  device's editor settings (theme, grid, axes, hints, zen mode, scroll
  behaviour, object snaps) — not part of the document.
- In a running app, show the user what you did: `linea_set_selection { ids }`
  (or a filter, e.g. `{ inside: box }`), `linea_zoom { ids }`.

## Example: a plan with a dimensioned wall

```
linea_add_layers { layers: [{ name: "walls" }] }
linea_add_objects { objects: [
  { type: "polyline", layer: "walls", closed: true,
    points: [[0, 0], [6000, 0], [6000, 200], [0, 200]] },
  { type: "dimension", layer: "walls", points: [[0, 0], [6000, 0]], offset: -600 } ] }
                                                          → ids [p, d]
linea_zoom { ids: [p, d] }
linea_render { format: "png", width: 1200 }
```
