# Linea over MCP — two servers, one tool catalog

The `linea_*` tool catalog (`@lineadraw/mcp-tools`) has two backends:

| | **Headless server** (`@lineadraw/mcp`) | **Running editor** (WebMCP relay) |
|---|---|---|
| Backs tools with | an SDK `Drawing` in a document registry | the live editor stores |
| Documents | multi-document; new/open/save/export from disk | the ONE document the user has open |
| Extra tools | `linea_new/open/save_document`, `linea_export`, `linea_show_document` (in-chat editor app) | `linea_editor_state`, `linea_set_active_space`, `linea_set_selection`, `linea_zoom`, `linea_list_commands`, `linea_run_command` |
| Use when | producing deliverables headlessly, or showing an editor in chat | the user says "the drawing I have open" |

Shared tools (both backends): `linea_add_objects` (model space or
`layout`) · `linea_update_objects` (per-id patches) ·
`linea_remove_objects` · `linea_transform` (move/rotate/scale/mirror/
copy/array — **angles in DEGREES here**; the SDK uses radians) ·
`linea_create_layout` ("1:50" scale strings; custom mm via `sheetSize`) ·
`linea_update_layout` (rename / sheet size / **printPalette — set
"monochrome" for print-style output**) · `linea_remove_layout` ·
`linea_set_dim_style` / `linea_set_text_style` (document styles; annotation
scale is NOT a style key — top-level `scale` per object) · `linea_query`
(filters + measures; `layout` searches a layout's SHEET objects — the way
to find a viewport's id) · `linea_list_layers` / `linea_layer` ·
`linea_render` (SVG; PNG as image content on Node; `palette: "monochrome"`
+ `background: "#ffffff"` for a paper-like preview — as-authored colors
target the dark canvas) · `linea_undo` / `linea_redo` · `linea_summary` ·
`linea_get_document` · `linea_replace_document` (full-state save used by
the in-chat editor — not for normal agent edits; use the granular tools so
changes are validated ops).

**Tool-arg points are `[x, y]` tuples** (`delta`, `center`, `axisA`,
`axisB`, `near.point`) — `{x, y}` is accepted only INSIDE object bodies.

All SKILL.md rules apply unchanged: mm, Y-up, draw 1:1, byLayer styling,
annotation `scale` = drawing-scale denominator, verify by rendering and
looking, layouts for presentation. Prefer `linea_summary` + targeted
`linea_query` reads; never dump full documents into context.

## Path 1 — headless MCP server (`@lineadraw/mcp`)

One process holds a registry of open documents shared by every session; most
tools default to the ACTIVE document (the last created/opened), or take an
explicit `documentId`. Opening the same path twice reuses the entry.

From the linea repo:

```bash
npm run build -w @lineadraw/mcp     # bundles server + in-chat editor into dist/
npm run serve -w @lineadraw/mcp     # streamable HTTP on http://localhost:3001/mcp
```

Client configuration (stdio — e.g. Claude Code / Desktop config):

```json
"mcpServers": {
  "lineadraw": {
    "command": "node",
    "args": ["<linea-repo>/packages/mcp/dist/server.js", "--stdio"]
  }
}
```

Claude web/Desktop connectors need **https**: either
`npx cloudflared tunnel --url http://localhost:3001` (throwaway URL), or
mkcert local TLS (`TLS_CERT`/`TLS_KEY` env vars) — then add the connector as
`https://…/mcp`. `node probe.mjs <url>` (in packages/mcp) checks a URL the
way a host would.

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

## Path 2 — the running editor (WebMCP local relay)

The user's open Linea tab can register the tool catalog on
`document.modelContext` (W3C Web Model Context, via `@mcp-b/global`) and
forward it over `ws://127.0.0.1:9333` to a local relay process that MCP
clients spawn as a stdio server. You then edit the document the user is
looking at: changes appear live in their viewport, every tool call is ONE
undo step, and read-only mode rejects mutations with a tool error.

Wiring (user side, in Linea): **Settings → General → "Agent access"** on,
plus the **"Local relay"** sub-toggle (the tab keeps dialing localhost:9333
while enabled). Hosts embedding the editor can call `installWebMcp()`
instead.

Client side, the relay process (`@mcp-b/webmcp-local-relay`) is the MCP
server:

```json
"mcpServers": {
  "lineadraw-editor": {
    "command": "npx",
    "args": ["-y", "@mcp-b/webmcp-local-relay"]
  }
}
```

Editor-path semantics to respect:

- **Object tools target the ACTIVE space** — model space or whichever paper
  layout the user is on. Check `linea_editor_state` first (it reports
  the active space, selection, camera, read-only flag);
  `linea_set_active_space` switches.
- `linea_set_selection` / `linea_zoom` let you point at things
  ("here's the beam I mean") — use them to communicate, not just to edit.
- `linea_list_commands` / `linea_run_command` run the editor's own
  command registry (the palette's commands) by id, like the user pressing
  the hotkey. Interactive drawing tools START and then wait for the USER's
  canvas clicks — create geometry yourself with `linea_add_objects`;
  run_command is for undo/zoomFit/panel-style commands or handing a tool to
  the user.
- There is no save/export tool on this path — the user owns the file
  (Ctrl+S). Ask them to save; don't try to reach the disk.
- No `linea_show_document` either — the editor is already in front of
  the user.
