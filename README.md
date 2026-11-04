# Linea

Public home of [Linea](https://lineadraw.com). This repository carries the public
block/command collection, agent integrations, and the guide to publishing
your own collection.

| Folder                        | What it is                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `blocks/`                     | The public block collection — the editor's built-in "Linea collection" marketplace |
| `commands/`                   | The public command collection (same marketplace)                                   |
| `workshop/`                   | Staging area: experimental modules not yet promoted into the collection            |
| `.lineadraw/marketplace.json` | The generated marketplace manifest                                                 |
| `skills/`                     | The `lineadraw` agent skill (Claude Desktop / Claude Code)                         |

The npm surface lives elsewhere:
[`lineadraw`](https://www.npmjs.com/package/lineadraw) (headless Node SDK
at `lineadraw/sdk`, authoring types, marketplace CLI),
[`create-lineadraw`](https://www.npmjs.com/package/create-lineadraw)
(scaffolder), [`@lineadraw/mcp`](https://www.npmjs.com/package/@lineadraw/mcp)
(MCP server + in-chat editor).

## Create your own block/command marketplace

Any GitHub repository can be a Linea **marketplace** — the editor browses
it, previews blocks live, and installs modules into documents (installed
modules are embedded in the `.linea` file, so drawings keep working
offline). This repo itself is one; here is how to make yours.

### 1. Scaffold

In new empty folder

```bash
npm create lineadraw
```

Or add the structure to an existing project:

```bash
npm i -D lineadraw && npx lineadraw init
```

You get `blocks/` and `commands/` folders with a typed sample, a
`tsconfig.json` wired to the typings, the generated catalog
(`.lineadraw/marketplace.json`), a CI workflow, and `manifest`/`check`
npm scripts.

### 2. Author modules

- One `defineBlock` or `defineCommand` default export per file
  (`*.block.ts` / `*.cmd.ts`; plain `.js` works too).
- Give every module a stable id: `@<collection>/<slug>`, lowercase kebab.
  The id is the install identity — re-publishing the same id updates
  installed copies in place.
- Imports are limited to `"lineadraw"` and `"lineadraw/helpers"`.
- A block whose `draw` emits instances of other blocks must declare them
  in `dependencies: ["@collection/other", …]` — installs pull the closure
  along automatically.
- Collection display name/owner live in package.json:
  `"lineadraw": { "marketplaceName": "…", "marketplaceOwner": "…" }`.

### 3. Generate the catalog and push

```bash
npm run manifest   # creates .lineadraw/marketplace.json
npm run check      # validate blocks/commands without creating .lineadraw/marketplace.json
```

The manifest is deterministic, so `check` compares it with the committed
catalog (formatting and line endings never make it stale) and the included
GitHub workflow fails PRs with a stale catalog. `manifest`/`check` also
**dry-run every block** and render thumbnails.

### 4. Add it in the editor

**App settings → Marketplaces → Add a marketplace** (the gear in Library →
Marketplace opens it) and enter `owner/repo` (or `owner/repo@branch`). For a **private** repository, create a fine-grained
personal access token with read-only Contents access to just that
repository and paste it in the add dialog — it is stored only on that
device, and never enters any document. Note that adding a marketplace is
a trust decision: previewing and installing runs the repo's module code.

## Agent skill

`skills/lineadraw` teaches an agent (Claude Desktop, Claude Code) to
create and edit Linea projects and produce DXF/PDF deliverables via
`lineadraw/sdk`, to work through the MCP routes (the headless server, the
desktop app's bridge, WebMCP), and to write blocks and
commands (with modules from this collection as worked examples). Install
into the current folder with Node.js:

```bash
npx skills add lineadraw/lineadraw --skill lineadraw
```

Or zip the `skills/lineadraw` folder and drop it into your agent.

## Agent MCP app (in-chat editor)

[`@lineadraw/mcp`](https://www.npmjs.com/package/@lineadraw/mcp) gives
agents document tools plus the **full Linea editor rendered in the chat**
(MCP Apps). With Node.js installed, add to your agent's MCP configuration:

```json
{
  "mcpServers": {
    "lineadraw": {
      "command": "npx",
      "args": ["-y", "@lineadraw/mcp", "--stdio"]
    }
  }
}
```

## The running app (desktop bridge)

The Linea desktop app serves the same tools for the drawings you have
open, on `http://127.0.0.1:7431/mcp` (this machine only; a web tab joins
by pairing with the app in its Agents popover). Claude Code:

```bash
claude mcp add --transport http linea http://127.0.0.1:7431/mcp
```

Other clients can reach it through `mcp-remote`
(`npx -y mcp-remote http://127.0.0.1:7431/mcp`). From scripts, use
`connectEditors()` in `lineadraw/sdk` or the `lineadraw` CLI.
