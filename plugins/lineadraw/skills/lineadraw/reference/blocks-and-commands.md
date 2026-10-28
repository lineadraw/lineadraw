# Blocks and commands — authoring, validating, delivering

Both are single-file ES modules in TypeScript (plain JS works too). One
`export default defineBlock({...})` or `defineCommand({...})` per file.
Imports are limited to `"lineadraw"` (the define functions and types) and
`"lineadraw/helpers"` (vector math). The editor transpiles and runs them
itself; there is no build step for the author.

Real, tested modules from the public collection are in
[examples/](examples/) (copied verbatim from the repository's `blocks/`,
`commands/`, and `workshop/` folders). Read `bolt.block.ts` before your
first block and `chain-dimension.cmd.ts` before your first command. The
full collection (22 blocks, more in staging) is at
https://github.com/lineadraw/lineadraw.

Units and conventions are the same as everywhere in Linea: millimeters,
Y-up, radians CCW. The DTOs you return are the same object bodies the SDK
`add()` takes (see [api.md](api.md)), with two differences noted below.

## Identity

- `id` is the module's identity everywhere: instances reference a block by
  it, installs and re-installs match on it, the palette dedupes commands by
  it. Use `@<collection>/<slug>`, lowercase kebab (`@acme/pile-symbol`).
  Re-publishing the same id updates installed copies in place; changing
  the id makes a new, unrelated module.
- `name` is the display name. `version` (semver string), `description`,
  `tags`, `authors` are optional metadata shown in the Library and the
  marketplace. Set `description` to what the block draws and what the
  picks mean; it is what a user (or the next agent) reads.

## Blocks

A block is a pure function from parameters and picked inputs to geometry
in block-local coordinates:

```ts
import { defineBlock } from "lineadraw";
import type { Line, Vec2 } from "lineadraw";
import { add, len, norm, rotate, scale, sub } from "lineadraw/helpers";

export default defineBlock({
  id: "@acme/anchor",
  name: "Anchor",
  version: "1.0.0",
  description: "Anchor plate between two picked points; the pick distance sets the length.",
  params: [
    { name: "d", label: "Bolt Ø", type: "number", default: 16, min: 8, max: 48 },
    { name: "kind", label: "Kind", type: "enum", default: "cast",
      options: ["cast", { value: "post", label: "Post-installed" }] },
    { name: "showLabel", label: "Label", type: "boolean", default: true },
    { name: "tag", label: "Tag", type: "string", default: "A1" },
  ],
  place: ["Start", "End"],           // one point pick per label, in order
  previewInputs: [[0, 0], [60, 0]],  // inputs used for thumbnails and the dry run
  paramVisibility: ({ params }) => ({ tag: params.showLabel }),
  draw: ({ params, inputs: [a, b] }) => {
    const L = len(sub(b, a));
    if (L < 1e-6) return [];         // degenerate picks: draw nothing, never throw
    const n = norm(sub(b, a));
    const p = rotate(n, Math.PI / 2);
    const out: Line[] = [
      { type: "line", a, b },
      { type: "line", a: add(a, scale(p, params.d)), b: add(b, scale(p, params.d)) },
    ];
    return params.showLabel
      ? [...out, { type: "text", position: add(a, scale(p, params.d * 1.5)),
                   content: params.tag, hAlign: "center", vAlign: "bottom" }]
      : out;
  },
});
```

Spec members:

- `params` — the Properties-panel table. Row types: `number` (`min`/`max`
  optional), `string`, `boolean`, `enum` (`options`: strings or
  `{ value, label }`), and `label` (a section heading, carries no value).
  `draw` receives `params` typed from this table; no annotations needed.
  `params` may also be a zero-arg function returning the table, so large
  constant tables can sit at the end of the file.
- `place` — what the user picks at insertion. Either an array of point
  labels (one pick each, `inputs` is a tuple of `Vec2` in that order), or
  an async function `({ params, pickPoint, pickObject }) => inputs` run
  ONCE at insertion for interactive placement (`pickObject` returns an
  object id; `draw` then receives the referenced object itself, pivot-local,
  or `null` once it is deleted, and the instance re-evaluates when that
  object changes). Omit `place` for a single "Insertion point" pick.
- `previewInputs` — inputs for thumbnails, marketplace cards, and the
  save-time dry run. Curate them so the preview shows the block at its
  best. Tuple length must match a labels-array `place`.
- `dependencies` — ids of other blocks `draw` emits instances of. Required:
  the dry run rejects undeclared nested instances. Install, copy/paste, and
  export bundle the declared closure. See `grid.block.ts` (emits
  `@lineadraw/axis` instances).
- `paramVisibility({ params })` — returns `{ name: false }` for rows to
  hide given the current values. Hidden values are kept and still reach
  `draw`.
- `draw({ params, inputs })` — returns an array of DTOs. Pure, runs on
  every evaluation (parameter change, referenced-object change, transform).

Rules inside `draw`:

- **Coordinates are block-local.** The first input point is the pivot;
  every input arrives localized against it, so with a labels-array `place`
  the first input is always `{x: 0, y: 0}`. The instance's own `rotation`
  and `scale` are applied last, about the pivot. Transforms of the instance
  (move/rotate/mirror) move the input points and re-run `draw`, which is
  why a mirrored block is real mirrored geometry.
- **Return DTOs, not stored objects**: `line`, `point`, `polyline`,
  `circle`, `arc`, `ellipse`, `hatch`, `text`, `dimension`, and nested
  `block` instances (`{ type: "block", definitionId, inputs, params? }`,
  inputs in the parent's local coords). Points accept `[x, y]` tuples.
- **Style only when it must differ.** Children inherit the instance's
  layer/color/lineWidth; set `color`/`lineWidth`/`lineType` on a child only
  for a deliberate override (a hidden line, a thick outline).
- **Hatches in blocks** take `fill: { kind: "solid" }`,
  `{ kind: "lines", angle, spacing }`, or `{ kind: "gradient", … }`. The
  block DTO does not offer named `pattern` fills.
- **Text and dimensions inside blocks** are sized in mm like everything
  else. Symbol-scale blocks (marks, bubbles, arrows) usually expose a
  `scale` number param and multiply their geometry by it; see
  `section-mark.block.ts` and `grid.block.ts`.
- Never throw for odd inputs (zero length, negative size). Return `[]` or
  clamp. A throw shows as a broken instance in the editor.

Helpers in `"lineadraw/helpers"`: `add`, `sub`, `scale`, `norm`, `len`,
`dist`, `dot`, `rotate(p, angle)`, `polar(angle, distance, from?)`,
`toDeg`, `toRad`, `range(n)`. They take and return `{x, y}` (`Vec2`).

## Commands

A command is an async macro that runs against the open document. Its whole
run is ONE undo step: mutations apply live while it runs; Escape during a
pick or prompt, or an uncaught error, cancels and rolls everything back.

```ts
import { defineCommand } from "lineadraw";

export default defineCommand({
  id: "@acme/number-texts",
  name: "Number selected texts",
  description: "Renumbers the selected text objects left to right, starting at a typed number.",
  run: async ({ document, selection, prompt, showToast }) => {
    const ids = selection();
    if (!ids.length) { showToast("Select some texts first", "error"); return; }
    const start = Number(await prompt("First number", { initial: "1" }));
    const texts = document
      .query({ ids, type: "text" })
      .sort((a, b) => a.position.x - b.position.x);
    document.update(texts.map((t, i) => ({ id: t.id, content: String(start + i) })));
    showToast(`Numbered ${texts.length} texts`, "success");
  },
});
```

`run(ctx)` receives:

- `document` — the same `DocumentSession` surface the agent tools use:
  `add(objects, { layout? })`, `update([{ id, ...patch }])`, `remove(ids)`,
  `move`/`rotate`/`scale`/`mirror`/`copy`/`array`, `query(filter)` (adds an
  `ids` filter to the SDK's filters; returns STORED objects with defaults
  applied and `{x, y}` points), `measure(id)` → `{ bbox, length, area }`,
  `listLayers`/`addLayer`/`updateLayer`/`removeLayer`/`setCurrentLayer`,
  `createLayout(name, { sheet, orientation, scale: "1:50" })`, `summary()`.
  Object mutations target the ACTIVE space (model or the current layout).
  Methods throw on invalid input.
- `pickPoint(label?)` — one snapped world point. `pickObject(label?)` — one
  clicked object's id. `prompt(message, { initial?, placeholder? })` — a
  typed string. All three REJECT on Escape; let it propagate to cancel, or
  catch it to end an open-ended loop (`chain-dimension.cmd.ts`,
  `area-label.cmd.ts` show the pattern: collect until Escape, then act).
- `selection()` (snapshot of selected ids) and `setSelection(ids)`.
- `showToast(message, "info" | "success" | "error")`.

There is no drawing-scale context: when a command creates annotations,
ask for the scale with `prompt` (default 50) and set top-level `scale`.

## Validating headlessly

`lineadraw/sdk` (in the `lineadraw` package) exports the same checks the editor and the
marketplace CLI run:

```js
import { ensureScriptTranspiler, getBlockMetaResult, testBlockDefinition,
         renderBlockThumbnailSvg, getCommandMetaResult } from "lineadraw/sdk";
import { readFileSync } from "node:fs";

await ensureScriptTranspiler();     // the meta calls are sync; without this they
                                    // return a "Compiling…" placeholder on first use
const src = readFileSync("anchor.block.ts", "utf8");
getBlockMetaResult(src);            // { ok, meta: { id, name, params, … } } or { ok: false, error }
await testBlockDefinition(src);     // compiles + dry-runs draw with previewInputs (or stand-ins)
await renderBlockThumbnailSvg(src, { definitions: [otherSources] }); // SVG string; LOOK at it
getCommandMetaResult(readFileSync("x.cmd.ts", "utf8")); // compile + meta only (runs are interactive)
```

Always dry-run a block before delivering it, and render the thumbnail to
check the geometry visually. For commands the check is compile + metadata;
the run itself needs a user at the editor.

## Delivering

Three routes. Pick by where the module should live.

1. **Into a document, headlessly (blocks only).** The SDK stores block
   modules as source strings on the document:

   ```js
   const doc = await openDrawing("plan.linea");
   await doc.setBlockDefinitions([...doc.document.blockDefinitions, src]); // keep existing ones
   const [id] = doc.add([{ type: "block", definitionId: "@acme/anchor",
                           inputs: [[0, 0], [600, 0]], params: { d: 20 } }]);
   await doc.exportPng("check.png"); await doc.save();
   ```

   `setBlockDefinitions` replaces the whole list; pass the existing sources
   plus yours. Instance `inputs` are world points (first = pivot); `params`
   holds only the values that differ from defaults. There is no SDK or MCP
   call for document COMMANDS, and no `linea_*` tool for block modules on
   either MCP path: for those, use route 2.

2. **As a file the user drops onto the editor.** Name it `<name>.block.ts`
   or `<name>.cmd.ts` and hand it over. Dropping it on the Linea window (or
   importing via Library → Blocks & Commands → the upload button) merges it
   by id: a new id is added, an existing id is REPLACED in place and every
   placed instance re-evaluates. Dropped commands land in the document
   scope (travel with the file); the user can also paste the source into
   Library → "New block"/"New command", which has the same live preview and
   dry-run errors.

3. **In a marketplace repository** (team libraries; the public collection
   is one). Any GitHub repo with a generated `.lineadraw/marketplace.json`
   catalog. Scaffold with `npm create lineadraw my-blocks` (or
   `npm i -D lineadraw && npx lineadraw init` in an existing project),
   put modules in `blocks/` and `commands/`, then:

   ```bash
   npm run manifest   # validates every module (dry-runs every block) and writes the catalog
   npm run check      # CI: fails if the committed catalog is stale
   ```

   Commit and push. In the editor the user adds the repo under Library →
   Marketplace → the gear button → "Add a marketplace" as `owner/repo`
   (or `owner/repo@branch`; private repos take a fine-grained read-only
   Contents token). Installing embeds the module (and its `dependencies`
   closure) in the document, so drawings never depend on the repo staying
   up. Re-publish under the same id to ship an update; users see an
   "Update" badge.

## Checklist before handing over a module

- `id` is `@collection/slug`; `name` and `description` say what it draws
  and what each pick means.
- `previewInputs` set for multi-pick blocks; `dependencies` declared for
  every nested block id.
- Dry run passes (`testBlockDefinition` / `npm run check`) and the
  thumbnail looks right.
- Degenerate inputs return `[]` instead of throwing.
- No imports besides `"lineadraw"` and `"lineadraw/helpers"`; no DOM, no
  `fetch`, no randomness (draw must be deterministic).
