# Linea

This is a public repository for Linea project. It contais user materials, public block library, agent setup etc.

## Blocks

/blocks - public registry of blocks

A block is a JS module with a single export member `defineBlock`

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

Members:

- `id`, `name` — identity (instances reference the id) and the library
  label. Required.
- `params` (optional) — the properties-panel table; each entry arrives in
  `draw` as `params.<name>` with its precise type ("number" / "string" /
  "boolean", enum option unions). May be a zero-arg function returning the
  table.
- `paramVisibility` (optional) — `({ params }) => ({ row: boolean })`,
  re-run per properties-panel render; omitted names stay visible, hidden
  values are kept and still reach `draw`.
- `place` (optional) — an array of point labels (fixed picks; `inputs`
  becomes a `Vec2` tuple of that length) or an interactive
  `async ({ params, pickPoint, pickObject }) => [...]` function whose
  return — a real tuple, even without `as const` — types `draw`'s
  `inputs`. Omitted → a single "Insertion point" pick. Open-ended
  collection catches the pick rejection (Escape) and returns what it has
  (see Rebar/Waterproofing).
- `draw` — objects in block-local coordinates, evaluated per instance. The
  first placed point is the origin/pivot; the instance's rotation/scale
  apply last, about it. Inferred inputs are a compile-time claim (instance
  inputs are validated only as `(Vec2 | string)[]`).

Geometry helpers come as named imports from `"lineadraw/helpers"`; object
types (`Line`, `Polyline`, …) from `"lineadraw"` or the global scope. These
files import straight into the app (drag-drop or the Blocks panel's Import
button) — no container format. Pre-rename modules using named exports
(`main`/`defineInput`, plain `export const id/name/params`) keep
evaluating — those runtime aliases are frozen — but the typed authoring
surface is `defineBlock`.

`tsconfig.json` + `lineadraw.d.ts` make this a standalone TypeScript project
so VS Code resolves the virtual modules and the global types.

## Commands

/commands - public registry of commands

A command is a JS module with

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
