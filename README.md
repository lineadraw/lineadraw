# Linea

This is a public repository for Linea project. It contais user materials, public block library, agent setup etc.

## Blocks

/blocks - public registry of blocks

A block is a JS/TS module with a single `defineBlock` export

```js
// surface.block.js
import { defineBlock } from "lineadraw";

export default defineBlock({
  id: "9f6f9dd3-…", // unique — a UUID is a good choice
  name: "Surface", // Visible name
  params: [
    {
      name: "type",
      type: "enum",
      default: "rock",
      options: ["rock", "ground"],
    },
  ],
  place: ["Start point", "End point"], // one point pick per label, in order
  draw: ({ params, inputs: [start, end] }) => {
    params.type; // "rock" | "ground" — inferred
    return [{ type: "line", a: start, b: end }];
  },
});
```

`tsconfig.json` + `lineadraw.d.ts` make this a standalone TypeScript project
so VS Code resolves the virtual modules and the global types. You can open this repository and write new blocks with type safety. Agents can see the block examples and create new ones.

## Commands

/commands - public registry of commands

A command is a JS/TS module with a single `defineCommand` export

```js
// circle.cmd.ts
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "543f132f-7da1-4de6-8d14-2da3121a644d",
  name: "Circle Example",
  run: async ({ document, pickPoint, prompt, showToast }) => {
    const center = await pickPoint("Center point");
    const r = await prompt("Radius");
    document.add([{ type: "circle", center, radius: parseFloat(r) }]);
    showToast("Done", "success");
  },
});
```

## Agent skill

/skill contains lineadraw skill. Create a zip from lineadraw folder and drop it to your agent like Claude Desktop. The agent will be able to create, edit linea projects, produce pxf, pdf deliverables.

## Agent MCP App

MCP Apps are interactive UI applications that render inside MCP hosts like Claude Desktop

This MCP server allows agents render Linea editor in the chant (works best in combination with sdk package)

1. Install Node.js

2. Specify mcp server configuration in you agent

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

## Editor WebMCP connection

In editor App settings you can control whether Agent Access and Local Relay are active.

Agent access allows agents in the browser (like Claude extension for Chrome) interact with Linea editor

Relay access allows other agents (line Claude Desktop) interact with editor. It uses MCP-B relay for connection.

1. Install Node.js

2. Specify mcp server configuration in you agent

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
