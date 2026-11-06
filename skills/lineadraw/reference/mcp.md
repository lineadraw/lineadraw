# Linea over MCP — three routes, one tool catalog

The `linea_*` tool catalog (one definition per tool, in Linea's core) runs
wherever a Linea document is:

| | **Headless server** (`@lineadraw/mcp`) | **Desktop bridge** (the running app) | **WebMCP** (a browser tab) |
|---|---|---|---|
| Backs tools with | SDK drawings in a registry | the editors open in the app's windows | the tab's live editor |
| Documents | multi-document; `documentId` picks one | one per window; `editor` picks one | the one in the tab |
| Extra tools | `linea_new/open/save_document`, `linea_export {path}`, `linea_show_document` (in-chat editor) | editor + app tools (below), `linea_list_editors` / `linea_open_editor` / `linea_select_editor` | editor + app tools (below) |
| Use when | producing deliverables headlessly, or showing an editor in chat | "the drawing I have open" in the desktop app (or a paired web tab) | an in-browser agent working on the tab |

**Once connected, call `linea_guide` before editing** — it is the shared
agent guide every route serves (units, tool naming, model space vs
layouts, pictures, scripts, a worked example), and the tools describe
their own arguments. This file covers only setup and how the routes
differ.

A few rules worth knowing up front (the guide has the rest):

- Tool-arg points are `[x, y]` tuples; `{x, y}` is accepted only inside
  object bodies. Angles are radians.
- `update_*` tools take `entries: [{ id, ...fieldsToChange }]` — `id` is
  the object id, or the current name for layers, styles, line types and
  hatch patterns; `name` in the entry renames.
- Edit tools are all or nothing: a batch with one bad item (an object, a
  module source that doesn't compile) is an error and changes nothing.
- Object tools act on MODEL space unless `layout` names a sheet — never
  on whatever space the user happens to be looking at.
- Prefer `linea_run_script` (one `defineCommand` module, one undo step)
  over many calls for loops and computed placement; verify with
  `linea_render` and LOOK at it.
- Prefer `linea_summary` + targeted `linea_list_objects` reads; never dump
  full documents into context. `linea_replace_document` is the in-chat
  editor's sync path, not for normal agent edits.

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

- `linea_save_document { path }` (Save As) takes an ABSOLUTE path ending
  in `.linea` (`relativePath` / `unsupportedFile` otherwise — other formats
  go through `linea_export`). Writing to a new file gives the drawing a new
  id, returned as `documentId`; a session that selected the old id
  follows it.
- A call that runs past 30 s answers `timeout`. If the editor could stop
  it, nothing changed; if it was busy, the message says the change may
  still land — check `linea_summary`'s `revision` before retrying, never
  blindly repeat an edit.
- Nothing answering on 7431 while the app runs: its Agents popover says
  why (another program holds the port); the `lineadraw` CLI says "not
  serving agents".

## Route 3 — WebMCP (an in-browser agent)

The tab registers the catalog on `document.modelContext` (W3C Web Model
Context, via `@mcp-b/global`) for agents that live in the browser — a
browser extension (MCP-B) or the browser's own agent. The user turns it on
in the editor's **Agents** popover → **"In-browser agents"**. Every tool call
is ONE undo step; read-only mode rejects mutations with a tool error.

## Routes 2 and 3 — extra editor and app tools

Both add tools for the live editor (`linea_editor_state`, selection,
active space, zoom, the editor's own command registry, device app
settings) and the app (list / new / open / save / close documents). Two
cautions: interactive drawing commands run via `linea_run_command` start
and then wait for the USER's clicks — create geometry yourself with
`linea_add_objects`; and never `discard` on close without the user's
say-so. On the desktop every drawing has its own window: after new/open,
list the editors and address the new one. There is no
`linea_show_document` here — the editor is already in front of the user.
