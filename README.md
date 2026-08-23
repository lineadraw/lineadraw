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
| `plugins/`                    | Claude Desktop plugin packaging                                                    |

The npm surface lives elsewhere:
[`lineadraw`](https://www.npmjs.com/package/lineadraw) (authoring types +
marketplace CLI), [`create-lineadraw`](https://www.npmjs.com/package/create-lineadraw)
(scaffolder), [`@lineadraw/sdk`](https://www.npmjs.com/package/@lineadraw/sdk)
(headless Node API), [`@lineadraw/mcp`](https://www.npmjs.com/package/@lineadraw/mcp)
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

The manifest is deterministic, so `check` is a byte diff and the included
GitHub workflow fails PRs with a stale catalog. With `@lineadraw/sdk` as a
devDependency (the scaffold adds it), `manifest`/`check` also **dry-run
every block** and render thumbnails; without it they still fully work.

### 4. Add it in the editor

**Library → Marketplace tab → +** and enter `owner/repo` (or
`owner/repo@branch`). For a **private** repository, create a fine-grained
personal access token with read-only Contents access to just that
repository and paste it in the add dialog — it is stored only on that
device, and never enters any document. Note that adding a marketplace is
a trust decision: previewing and installing runs the repo's module code.

## Agent skill

`skills/lineadraw` teaches an agent (Claude Desktop, Claude Code) to
create and edit Linea projects and produce DXF/PDF deliverables via
`@lineadraw/sdk`. Install into the current folder with Node.js:

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

## Editor WebMCP connection (MCP-B relay)

The editor itself can expose its tools to agents. In the editor's App
settings: **Agent access** lets in-browser agents (e.g. the Claude
extension for Chrome) work with the open document; **Local relay**
additionally bridges those tools to agents outside the browser (e.g.
Claude Desktop) over the MCP-B relay:

1. Switch on "Agent access" and "Local relay" in Linea App settings.
2. Add the relay to your agent's MCP configuration:

```json
{
  "mcpServers": {
    "webmcp-local-relay": {
      "command": "npx",
      "args": ["-y", "@mcp-b/webmcp-local-relay@latest"]
    }
  }
}
```

## Claude Desktop plugin

**Don't use yet — the MCP app does not work from within the plugin.**
(For reference: Claude Desktop → Customize → Plugins → Browse → add
marketplace `lineadraw/lineadraw` → Sync → Install.) Use the agent skill
and MCP server setups above instead.
