# Linea over MCP — three routes, one tool catalog

The `linea_*` tool catalog (`@lineadraw/mcp-tools`) runs wherever a Linea
document is:

| | **Headless server** (`@lineadraw/mcp`) | **Desktop bridge** (the running app) | **WebMCP** (a browser tab) |
|---|---|---|---|
| Backs tools with | SDK drawings in a registry | the editors open in the app's windows | the tab's live editor |
| Documents | multi-document; `documentId` picks one | one per window; `editor` picks one | the one in the tab |
| Extra tools | `linea_new/open/save_document`, `linea_export {path}`, `linea_show_document` (in-chat editor) | editor + app tools (below), `linea_list_editors` / `linea_open_editor` / `linea_select_editor` | editor + app tools (below) |
| Use when | producing deliverables headlessly, or showing an editor in chat | "the drawing I have open" in the desktop app (or a paired web tab) | an in-browser agent working on the tab |

**Read `linea_guide` once** (or [guide.md](guide.md), the same text): units,
tool naming, model space vs layouts, a worked example.

## The shared tools (every route)

Names are `linea_<verb>_<kind>`. Edit tools take ARRAYS and apply them all or
nothing; layers, layouts and styles are addressed by name or id (`ids` to
remove, `id` in each update entry). Angles are **radians**, counter-clockwise.

- **Read:** `linea_guide` · `linea_summary` · `linea_get_document` ·
  `linea_list_objects` (filters + `measure`; `layout` searches a layout's
  SHEET objects — the way to find a viewport's id) · `linea_list_layers` ·
  `linea_list_layouts` · `linea_list_text_styles` · `linea_list_dim_styles`
  · `linea_list_block_definitions` · `linea_list_user_commands`.
- **Objects:** `linea_add_objects` (model space, or a sheet via `layout`) ·
  `linea_update_objects` (per-id patches) · `linea_remove_objects` ·
  `linea_reorder_objects` (draw order) · `linea_transform_objects`
  (move/rotate/scale/mirror/copy/array; `angle` in radians).
- **Layers:** `linea_add/update/remove/reorder_layers` ·
  `linea_set_current_layer`.
- **Layouts:** `linea_add/update/remove/reorder_layouts` ("1:50" scale
  strings; custom mm via `sheetSize`; **`printPalette: "monochrome"`** for
  print-style output).
- **Styles:** `linea_add/update/remove_text_styles` ·
  `linea_add/update/remove_dim_styles` (annotation scale is NOT a style
  key — top-level `scale` per object). Removing a style objects use is
  refused, with a count.
- **Modules:** `linea_add/remove_block_definitions` ·
  `linea_add/remove_user_commands` (module sources, merged by id — a
  matching id replaces, so add is also the update) ·
  `linea_run_user_command { id, inputs?, params? }` · `linea_run_script
  { source }` (an unsaved `defineCommand` module as ONE undo step — loops
  and computed placement in one call).
- **Output:** `linea_render` (png/svg to LOOK at; `palette: "monochrome"` +
  `background: "#ffffff"` for a paper-like preview — as-authored colors
  target the dark canvas) · `linea_export` (svg/png/pdf/dxf/dwg — the
  file's content).
- **Other:** `linea_undo` / `linea_redo` · `linea_replace_document`
  (full-state save used by the in-chat editor — not for normal agent edits;
  use the granular tools so changes are validated ops).

**Tool-arg points are `[x, y]` tuples** (`delta`, `center`, `axisA`,
`axisB`, `near.point`) — `{x, y}` is accepted only INSIDE object bodies.

All SKILL.md rules apply unchanged: mm, Y-up, draw 1:1, byLayer styling,
annotation `scale` = drawing-scale denominator, verify by rendering and
looking, layouts for presentation. Prefer `linea_summary` + targeted
`linea_list_objects` reads; never dump full documents into context.

## Route 1 — headless MCP server (`@lineadraw/mcp`)

One process holds a registry of open documents shared by every session; most
tools default to the ACTIVE document (the last created/opened), or take an
explicit `documentId`. Opening the same path twice reuses the entry.

The server is published on npm; Node.js 20+ is the only requirement.

Client configuration (stdio — Claude Desktop, Cursor, and similar):

```json
"mcpServers": {
  "lineadraw": {
    "command": "npx",
    "args": ["-y", "@lineadraw/mcp", "--stdio"]
  }
}
```

Claude Code: `claude mcp add linea -- npx -y @lineadraw/mcp --stdio`.

Without `--stdio` it speaks streamable HTTP on `http://localhost:3001/mcp`
(`PORT` overrides): `npx -y @lineadraw/mcp`. Claude web/Desktop connectors
need **https**: either `npx cloudflared tunnel --url http://localhost:3001`
(throwaway URL), or mkcert local TLS (`TLS_CERT`/`TLS_KEY` env vars), then
add the connector as `https://…/mcp`.

Files: `linea_open_document { path }`, `linea_save_document { path? }`,
`linea_export { format, path }` writes to disk (without `path` it returns
the content).

(Working from a linea repo checkout instead: `npm run build -w @lineadraw/mcp`,
then `node <repo>/packages/mcp/dist/server.js --stdio`.)

### The in-chat editor (MCP App)

When the MCP host supports MCP Apps, **`linea_show_document`** renders
the FULL Linea editor in the conversation (a self-contained `editor.html`
bundle in a sandboxed iframe). How to work with it:

- The user's interactive edits debounce back through
  `linea_replace_document` into the same registry document your tools
  operate on — one source of truth. Your own tool calls land in the shown
  editor too (revision polling remounts it with the camera restored).
- After showing it, expect the document to change between your calls —
  **re-read `linea_summary` before building on top of user edits.**
- Disk-oriented menu items inside the iframe (Open/Save As) are sandboxed;
  save to disk through `linea_save_document`.
- Show it when the user should draw/inspect/decide; keep using granular
  tools for your own edits (they stay validated ops and undo steps).

## Route 2 — the desktop bridge (the running app)

The Linea desktop app serves MCP (Streamable HTTP) at
`http://127.0.0.1:7431/mcp` and the same tools as REST at
`POST /api/<tool>`; `GET http://127.0.0.1:7431/` is its own agent guide,
with the live status. It listens on this machine only.

- **Claude Code:** `claude mcp add --transport http linea http://127.0.0.1:7431/mcp`
  (add `--header "Authorization: Bearer <token>"` when the app requires a
  token — the user sees it in the app's Agents popover).
- **Claude Desktop:** a local server bridged with `mcp-remote`:
  `{ "command": "npx", "args": ["-y", "mcp-remote", "http://127.0.0.1:7431/mcp"] }`.
- A **web tab** (lineadraw.com) joins the same bridge after the user pairs
  it with the app (Agents popover).

Which drawing: `linea_list_editors` first. One open: nothing else to do.
Several: pass `editor` (document id, file path or unique name) on every
call, or `linea_select_editor { editor }` once per MCP session. The bridge
never guesses — it answers `ambiguous`.

## Route 3 — WebMCP (an in-browser agent)

The tab registers the catalog on `document.modelContext` (W3C Web Model
Context, via `@mcp-b/global`) for agents that live in the browser — a
browser extension (MCP-B) or the browser's own agent. The user turns it on
in the editor's **Agents** popover → **"In-browser agents"**. Every tool call
is ONE undo step; read-only mode rejects mutations with a tool error.

## Editor and app tools (routes 2 and 3)

- **Editor:** `linea_editor_state` (active space, selection, camera,
  read-only flag) · `linea_set_active_space` · `linea_set_selection { ids }`
  or a filter (`{ inside: box }` = window, `{ bbox }` = crossing, `layer`,
  `type`) · `linea_zoom { to: "fit" | "selection" } | { ids } | { bbox }` —
  point at things ("here's the beam I mean"), not just edit ·
  `linea_list_commands` / `linea_run_command` run the editor's own command
  registry by id, like the user pressing the hotkey (interactive drawing
  tools START and then wait for the USER's clicks — create geometry
  yourself with `linea_add_objects`).
- **App:** `linea_list_documents` · `linea_new_document` ·
  `linea_open_document { id | path }` · `linea_save_document { path? }` ·
  `linea_close_document { discard? }` · `linea_delete_document` (web only).
  On the desktop every drawing has its own window: from a window showing a
  drawing, new/open answer `{ window: "new" }` — list the editors and
  address it. A drawing never saved to a file needs the user to Save (the
  desktop also takes a `path`). Never `discard` without the user's say-so.
- **Object tools act on MODEL space** unless `layout` names a sheet — never
  on whatever space the user happens to be looking at.
- No `linea_show_document` here — the editor is already in front of the
  user.
