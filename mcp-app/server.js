// src/server.ts
import { readFileSync } from "fs";
import https from "https";
import cors from "cors";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// src/documents.ts
import { newDrawing, openDrawing, drawingFromJson } from "@lineadraw/sdk";
var DocumentRegistry = class {
  docs = /* @__PURE__ */ new Map();
  revisions = /* @__PURE__ */ new Map();
  activeId = null;
  create(name) {
    const doc = newDrawing(name);
    const id = doc.document.id;
    this.docs.set(id, doc);
    this.revisions.set(id, 0);
    this.activeId = id;
    return { id, doc };
  }
  async open(path2) {
    const doc = await openDrawing(path2);
    const id = doc.document.id;
    this.docs.set(id, doc);
    this.revisions.set(id, 0);
    this.activeId = id;
    return { id, doc };
  }
  /** Resolve a document by id, or the active one when omitted. */
  get(id) {
    const key = id ?? this.activeId;
    if (!key) throw new Error("No document \u2014 call linea_new_document first");
    const doc = this.docs.get(key);
    if (!doc) throw new Error(`Unknown document "${key}"`);
    return { id: key, doc };
  }
  /**
   * Replace a document's full state (validated + migrated) — how in-chat
   * editor edits land. The id must match; conversation undo history resets.
   */
  replace(id, raw) {
    if (!this.docs.has(id)) throw new Error(`Unknown document "${id}"`);
    const doc = drawingFromJson(JSON.stringify(raw));
    if (doc.document.id !== id)
      throw new Error(
        `Document id mismatch: payload has "${doc.document.id}", expected "${id}"`
      );
    this.docs.set(id, doc);
    return { doc, revision: this.bump(id) };
  }
  /** Mark a document changed; the viewer compares revisions to refresh. */
  bump(id) {
    const next = (this.revisions.get(id) ?? 0) + 1;
    this.revisions.set(id, next);
    return next;
  }
  revision(id) {
    return this.revisions.get(id) ?? 0;
  }
};

// src/tools.ts
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { z as z2 } from "zod";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE
} from "@modelcontextprotocol/ext-apps/server";

// ../mcp-tools/src/tools.ts
import { z } from "zod";
var DEG2RAD = Math.PI / 180;
var box = z.object({
  minX: z.number(),
  minY: z.number(),
  maxX: z.number(),
  maxY: z.number()
}).describe("An axis-aligned box in world mm");
var point = z.tuple([z.number(), z.number()]).describe("A world point in mm: [x, y]");
var looseObject = z.record(z.string(), z.unknown()).describe(
  'A Linea model object, e.g. {"type":"line","a":[0,0],"b":[100,0]}. Types: line, point (p; paints as a dot sized by lineWidth), polyline (points with bulge, closed), circle, arc, ellipse, hatch, text, dimension, block. Optional layer (name), color (#rrggbb), lineType.'
);
var documentId = z.string().optional().describe("Document id; omit for the active document");
var toolResult = (data) => ({
  content: [{ type: "text", text: JSON.stringify(data) }],
  structuredContent: data
});
var isRawToolResult = (v) => typeof v === "object" && v !== null && Array.isArray(v.content);
var bytesToBase64 = (bytes) => {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
var toolError = (e) => ({
  content: [
    { type: "text", text: String(e instanceof Error ? e.message : e) }
  ],
  isError: true
});
var runTool = async (def, ctx, args) => {
  try {
    const parsed = z.object(def.inputSchema).parse(args ?? {});
    const out = await def.run(ctx, parsed);
    return isRawToolResult(out) ? out : toolResult(out);
  } catch (e) {
    return toolError(e);
  }
};
var docPayload = (s) => ({
  documentId: s.id,
  revision: s.revision(),
  document: s.getDocument()
});
var coreLineaTools = [
  {
    name: "linea_add_objects",
    title: "Add objects",
    description: "Add objects to model space (or a paper layout via `layout`). Returns the created ids.",
    inputSchema: {
      objects: z.array(looseObject).min(1),
      layout: z.string().optional().describe("Layout name/id for sheet annotations"),
      documentId
    },
    run(ctx, args) {
      const { objects, layout, documentId: idArg } = args;
      const s = ctx.get(idArg);
      const ids = s.add(objects, { layout });
      return { ids, revision: s.bump() };
    }
  },
  {
    name: "linea_update_objects",
    title: "Update objects",
    description: "Patch objects by id: entries are {id, ...fieldsToChange}. One undo step.",
    inputSchema: {
      entries: z.array(z.record(z.string(), z.unknown())).min(1),
      documentId
    },
    run(ctx, args) {
      const { entries, documentId: idArg } = args;
      const s = ctx.get(idArg);
      s.update(entries);
      return { updated: entries.length, revision: s.bump() };
    }
  },
  {
    name: "linea_remove_objects",
    title: "Remove objects",
    description: "Delete objects by id. Unknown ids are skipped; `removed` reports how many objects were actually deleted.",
    inputSchema: { ids: z.array(z.string()).min(1), documentId },
    run(ctx, args) {
      const { ids, documentId: idArg } = args;
      const s = ctx.get(idArg);
      const removed = s.remove(ids);
      return { removed, revision: s.bump() };
    }
  },
  {
    name: "linea_transform",
    title: "Transform objects",
    description: "move (delta) | rotate (angleDeg, center?) | scale (factor, center?) | mirror (axisA, axisB) | copy (delta \u2192 new ids) | array (count TOTAL, delta \u2192 new ids). rotate/scale default their center to the selection bbox center.",
    inputSchema: {
      kind: z.enum(["move", "rotate", "scale", "mirror", "copy", "array"]),
      ids: z.array(z.string()).min(1),
      delta: point.optional(),
      angleDeg: z.number().optional(),
      factor: z.number().optional(),
      center: point.optional(),
      axisA: point.optional(),
      axisB: point.optional(),
      count: z.number().int().optional(),
      documentId
    },
    run(ctx, args) {
      const a = args;
      const s = ctx.get(a.documentId);
      const need = (v, name) => {
        if (v === void 0) throw new Error(`${a.kind} requires "${name}"`);
        return v;
      };
      let created;
      switch (a.kind) {
        case "move":
          s.move(a.ids, need(a.delta, "delta"));
          break;
        case "rotate":
          s.rotate(a.ids, need(a.angleDeg, "angleDeg") * DEG2RAD, a.center);
          break;
        case "scale":
          s.scale(a.ids, need(a.factor, "factor"), a.center);
          break;
        case "mirror":
          s.mirror(a.ids, need(a.axisA, "axisA"), need(a.axisB, "axisB"));
          break;
        case "copy":
          created = s.copy(a.ids, need(a.delta, "delta"));
          break;
        case "array":
          created = s.array(a.ids, need(a.count, "count"), need(a.delta, "delta"));
          break;
      }
      return { ...created ? { ids: created } : {}, revision: s.bump() };
    }
  },
  {
    name: "linea_create_layout",
    title: "Create paper layout",
    description: 'Add a paper layout (default: A3 landscape, one viewport fitted to the model extents). scale accepts "1:50" strings.',
    inputSchema: {
      name: z.string(),
      // Named size + optional custom mm — two typed params instead of a
      // union so every property keeps a top-level JSON-schema `type`
      // (see `point` for why bare anyOf properties are relay-hostile).
      sheet: z.enum(["A4", "A3", "A2", "A1", "A0"]).optional(),
      sheetSize: z.object({ width: z.number(), height: z.number() }).optional().describe("Custom sheet size in mm (overrides `sheet`)"),
      orientation: z.enum(["portrait", "landscape"]).optional(),
      scale: z.string().optional().describe('Viewport scale, e.g. "1:50"'),
      documentId
    },
    run(ctx, args) {
      const { name, sheet, sheetSize, orientation, scale, documentId: idArg } = args;
      const s = ctx.get(idArg);
      const layoutId = s.createLayout(name, {
        sheet: sheetSize ?? sheet,
        orientation,
        scale
      });
      return { layoutId, revision: s.bump() };
    }
  },
  {
    name: "linea_update_layout",
    title: "Update layout",
    description: `Patch a paper layout's name, sheet size (mm), or print palette (printPalette "monochrome" prints/renders everything black).`,
    inputSchema: {
      layout: z.string().describe("Layout name/id"),
      name: z.string().optional().describe("New layout name"),
      sheetSize: z.object({ width: z.number(), height: z.number() }).optional().describe("New sheet size in mm"),
      printPalette: z.enum(["color", "grayscale", "monochrome"]).optional(),
      documentId
    },
    run(ctx, args) {
      const { layout, name, sheetSize, printPalette, documentId: idArg } = args;
      const s = ctx.get(idArg);
      s.updateLayout(layout, { name, sheet: sheetSize, printPalette });
      return { revision: s.bump() };
    }
  },
  {
    name: "linea_remove_layout",
    title: "Remove layout",
    description: "Delete a paper layout (and its sheet objects) by name or id.",
    inputSchema: {
      layout: z.string().describe("Layout name/id"),
      documentId
    },
    run(ctx, args) {
      const { layout, documentId: idArg } = args;
      const s = ctx.get(idArg);
      s.removeLayout(layout);
      return { revision: s.bump() };
    }
  },
  {
    name: "linea_set_dim_style",
    title: "Set dimension style",
    description: "Patch a document dimension style (default: the first): textHeight, textOffset, arrowType (filled|open|tick|dot|none), arrowSize, extensionType (long|short), extensionOffset, extensionOvershoot, precision, font, widthFactor. NOTE: annotation scale is NOT a style key \u2014 set the top-level `scale` field on each dimension object.",
    inputSchema: {
      patch: z.record(z.string(), z.unknown()),
      styleId: z.string().optional(),
      documentId
    },
    run(ctx, args) {
      const { patch, styleId, documentId: idArg } = args;
      const s = ctx.get(idArg);
      s.setDimStyle(patch, styleId);
      return { revision: s.bump() };
    }
  },
  {
    name: "linea_set_text_style",
    title: "Set text style",
    description: "Patch a document text style (default: the first): font, widthFactor, textHeight (default height for new text), arrowType, arrowSize (leader arrows). Per-object styleOverride still wins over the style.",
    inputSchema: {
      patch: z.record(z.string(), z.unknown()),
      styleId: z.string().optional(),
      documentId
    },
    run(ctx, args) {
      const { patch, styleId, documentId: idArg } = args;
      const s = ctx.get(idArg);
      s.setTextStyle(patch, styleId);
      return { revision: s.bump() };
    }
  },
  {
    name: "linea_query",
    title: "Query objects",
    description: "Filtered read over model-space objects \u2014 or one paper layout's sheet objects (viewports, annotations) via `layout` \u2014 all filters AND: type, layer (name), color, lineType, content (text substring), bbox (intersects), inside (contained), near ({point, tol}), ids. `measure: true` adds bbox/length/area per object. Prefer this over linea_get_document \u2014 it returns compact data.",
    inputSchema: {
      ids: z.array(z.string()).optional(),
      type: z.string().optional(),
      layer: z.string().optional(),
      color: z.string().optional(),
      lineType: z.string().optional(),
      content: z.string().optional(),
      bbox: box.optional(),
      inside: box.optional(),
      near: z.object({ point, tol: z.number().positive() }).optional(),
      layout: z.string().optional().describe("Search this layout's sheet objects (name/id) instead of model space"),
      measure: z.boolean().optional(),
      limit: z.number().int().positive().optional().describe("Max objects returned (default 100)"),
      documentId
    },
    run(ctx, args) {
      const { measure, limit, documentId: idArg, ...filter } = args;
      const s = ctx.get(idArg);
      const all = s.query(filter);
      const cap = limit ?? 100;
      const objects = all.slice(0, cap).map(
        (o) => measure ? { ...o, measure: s.measure(String(o.id)) } : o
      );
      return { total: all.length, returned: objects.length, objects };
    }
  },
  {
    name: "linea_list_layers",
    title: "List layers",
    description: "All layers with full metadata (color, hidden, locked, \u2026) and which one is current (the default for new objects).",
    inputSchema: { documentId },
    run(ctx, args) {
      const s = ctx.get(args.documentId);
      return { layers: s.listLayers() };
    }
  },
  {
    name: "linea_layer",
    title: "Manage layers",
    description: "add (name, props?) | update (layer, props \u2014 rename via props.name) | remove (layer; must be empty and not current) | set-current (layer). `layer` targets by name or id. Returns the resulting layer list.",
    inputSchema: {
      kind: z.enum(["add", "update", "remove", "set-current"]),
      name: z.string().optional().describe("New layer name (kind: add)"),
      layer: z.string().optional().describe("Target layer name/id"),
      props: z.record(z.string(), z.unknown()).optional().describe("Layer fields, e.g. {color, hidden, locked, name}"),
      documentId
    },
    run(ctx, args) {
      const { kind, name, layer, props, documentId: idArg } = args;
      const s = ctx.get(idArg);
      const need = (v, what) => {
        if (v === void 0) throw new Error(`${kind} requires "${what}"`);
        return v;
      };
      let layerId;
      if (kind === "add") layerId = s.addLayer({ ...props, name: need(name, "name") });
      else if (kind === "update") s.updateLayer(need(layer, "layer"), props ?? {});
      else if (kind === "remove") s.removeLayer(need(layer, "layer"));
      else s.setCurrentLayer(need(layer, "layer"));
      return {
        ...layerId ? { layerId } : {},
        layers: s.listLayers(),
        revision: s.bump()
      };
    }
  },
  {
    name: "linea_render",
    title: "Render snapshot",
    description: "Render model space (or a paper layout via `layout`) for visual verification. svg returns SVG markup as text; png returns an image (Node MCP server only \u2014 the in-browser editor supports svg).",
    inputSchema: {
      format: z.enum(["svg", "png"]).optional().describe("Default svg"),
      layout: z.string().optional().describe("Layout name/id"),
      bbox: box.optional(),
      padding: z.number().optional().describe("Around the content bbox, mm"),
      width: z.number().int().positive().optional().describe("png only, px"),
      background: z.string().optional().describe("png only, e.g. #ffffff"),
      palette: z.enum(["color", "grayscale", "monochrome"]).optional().describe(
        "Print-style color remap \u2014 use monochrome with a white background (light layer colors are authored for the dark canvas)"
      ),
      documentId
    },
    async run(ctx, args) {
      const { format, documentId: idArg, ...opts } = args;
      const s = ctx.get(idArg);
      if (format === "png") {
        if (!s.renderPng)
          throw new Error(
            'png rendering is only available on the Node MCP server \u2014 use format: "svg"'
          );
        const bytes = await s.renderPng(opts);
        return {
          content: [
            {
              type: "image",
              data: bytesToBase64(bytes),
              mimeType: "image/png"
            }
          ]
        };
      }
      return { content: [{ type: "text", text: s.renderSvg(opts) }] };
    }
  },
  {
    name: "linea_undo",
    title: "Undo",
    description: "Revert the last change (agent or user edit alike).",
    inputSchema: { documentId },
    run(ctx, args) {
      const s = ctx.get(args.documentId);
      const undone = s.undo();
      return { undone, revision: undone ? s.bump() : s.revision() };
    }
  },
  {
    name: "linea_redo",
    title: "Redo",
    description: "Re-apply the last undone change.",
    inputSchema: { documentId },
    run(ctx, args) {
      const s = ctx.get(args.documentId);
      const redone = s.redo();
      return { redone, revision: redone ? s.bump() : s.revision() };
    }
  },
  {
    name: "linea_summary",
    title: "Document summary",
    description: "Counts by type/layer, bbox, layers, layouts \u2014 the cheap 'what is in this document' observation.",
    inputSchema: { documentId },
    run(ctx, args) {
      const s = ctx.get(args.documentId);
      return { documentId: s.id, revision: s.revision(), ...s.summary() };
    }
  },
  {
    name: "linea_get_document",
    title: "Get document JSON",
    description: "The full document (validated .linea JSON) + revision. The in-chat viewer calls this to refresh; agents usually want linea_summary instead.",
    inputSchema: { documentId },
    run(ctx, args) {
      return docPayload(ctx.get(args.documentId));
    }
  },
  {
    name: "linea_replace_document",
    title: "Replace document state",
    description: "Replace the FULL document with the given .linea JSON (validated + migrated). Used by the in-chat editor to persist interactive edits; agents should prefer the granular add/update/transform tools.",
    inputSchema: {
      document: z.record(z.string(), z.unknown()),
      documentId
    },
    run(ctx, args) {
      const { document, documentId: idArg } = args;
      const s = ctx.get(idArg);
      return { documentId: s.id, revision: s.replace(document) };
    }
  }
];

// src/tools.ts
var EDITOR_RESOURCE_URI = "ui://linea/editor.html";
var docPayload2 = (registry2, id, doc) => ({
  documentId: id,
  revision: registry2.revision(id),
  document: doc.document
});
var DrawingSession = class {
  constructor(registry2, id, doc) {
    this.registry = registry2;
    this.id = id;
    this.doc = doc;
  }
  registry;
  id;
  doc;
  revision() {
    return this.registry.revision(this.id);
  }
  bump() {
    return this.registry.bump(this.id);
  }
  add(objects, opts) {
    return this.doc.add(objects, {
      layout: opts?.layout
    });
  }
  update(entries) {
    this.doc.update(entries);
  }
  remove(ids) {
    const removed = ids.filter((id) => this.doc.getObject(id) !== void 0);
    this.doc.remove(ids);
    return removed.length;
  }
  query(filter) {
    const { ids, ...rest } = filter;
    let objects = this.doc.query(rest);
    if (ids) {
      const wanted = new Set(ids);
      objects = objects.filter((o) => wanted.has(o.id));
    }
    return objects;
  }
  measure(id) {
    return {
      bbox: this.doc.bboxOf([id]),
      length: this.doc.length(id),
      area: this.doc.area(id)
    };
  }
  listLayers() {
    const current = this.doc.document.currentLayerId;
    return this.doc.layers.map((l) => ({ ...l, current: l.id === current }));
  }
  addLayer(props) {
    return this.doc.addLayer(props);
  }
  updateLayer(nameOrId, patch) {
    this.doc.updateLayer(nameOrId, patch);
  }
  removeLayer(nameOrId) {
    this.doc.removeLayer(nameOrId);
  }
  setCurrentLayer(nameOrId) {
    this.doc.setCurrentLayer(nameOrId);
  }
  renderSvg(opts) {
    return this.doc.toSvg(opts);
  }
  renderPng(opts) {
    return this.doc.toPng(opts);
  }
  undo() {
    return this.doc.undo();
  }
  redo() {
    return this.doc.redo();
  }
  move(ids, delta) {
    this.doc.move(ids, delta);
  }
  rotate(ids, angleRad, center) {
    this.doc.rotate(ids, angleRad, center);
  }
  scale(ids, factor, center) {
    this.doc.scale(ids, factor, center);
  }
  mirror(ids, axisA, axisB) {
    this.doc.mirror(ids, axisA, axisB);
  }
  copy(ids, delta) {
    return this.doc.copy(ids, delta);
  }
  array(ids, count, delta) {
    return this.doc.array(ids, count, delta);
  }
  createLayout(name, opts) {
    return this.doc.createLayout(name, {
      sheet: opts.sheet,
      orientation: opts.orientation,
      viewport: opts.scale !== void 0 ? { scale: opts.scale } : void 0
    });
  }
  updateLayout(nameOrId, patch) {
    this.doc.updateLayoutMeta(nameOrId, patch);
  }
  removeLayout(nameOrId) {
    this.doc.removeLayout(nameOrId);
  }
  setDimStyle(patch, styleId) {
    this.doc.setDimStyle(patch, styleId);
  }
  setTextStyle(patch, styleId) {
    this.doc.setTextStyle(patch, styleId);
  }
  summary() {
    return this.doc.summary();
  }
  getDocument() {
    return this.doc.document;
  }
  replace(raw) {
    return this.registry.replace(this.id, raw).revision;
  }
};
function registerLineaTools(server, registry2, opts = {}) {
  const ctx = {
    get(idArg) {
      const { id, doc } = registry2.get(idArg);
      return new DrawingSession(registry2, id, doc);
    }
  };
  for (const def of coreLineaTools) {
    server.registerTool(
      def.name,
      {
        title: def.title,
        description: def.description,
        inputSchema: def.inputSchema
      },
      async (args) => await runTool(def, ctx, args)
    );
  }
  const run = (fn) => {
    return async (args) => {
      try {
        return toolResult(await fn(args));
      } catch (e) {
        return toolError(e);
      }
    };
  };
  server.registerTool(
    "linea_new_document",
    {
      title: "New Linea document",
      description: "Create a fresh CAD document (mm, Y-up) and make it active. Call linea_show_document afterwards to display it in chat.",
      inputSchema: { name: z2.string().optional() }
    },
    run(({ name }) => {
      const { id, doc } = registry2.create(name);
      return { documentId: id, summary: doc.summary() };
    })
  );
  server.registerTool(
    "linea_open_document",
    {
      title: "Open .linea file",
      description: "Open a .linea file (or legacy .lineadraw) from disk and make it active.",
      inputSchema: { path: z2.string() }
    },
    run(async ({ path: p }) => {
      const { id, doc } = await registry2.open(p);
      return { documentId: id, migration: doc.migration, summary: doc.summary() };
    })
  );
  server.registerTool(
    "linea_save_document",
    {
      title: "Save .linea file",
      description: "Save the document to disk as .linea JSON.",
      inputSchema: { path: z2.string(), documentId }
    },
    run(async ({ path: p, documentId: idArg }) => {
      const { doc } = registry2.get(idArg);
      await doc.save(p);
      return { saved: p };
    })
  );
  server.registerTool(
    "linea_export",
    {
      title: "Export document",
      description: "Write the document to disk as svg | png | pdf | dxf | dwg.",
      inputSchema: {
        format: z2.enum(["svg", "png", "pdf", "dxf", "dwg"]),
        path: z2.string(),
        layout: z2.string().optional().describe("Render a layout instead of model space (svg/png)"),
        documentId
      }
    },
    run(async ({ format, path: p, layout, documentId: idArg }) => {
      const { doc } = registry2.get(idArg);
      if (format === "svg") await doc.exportSvg(p, { layout });
      else if (format === "png") await doc.exportPng(p, { layout });
      else if (format === "pdf") await doc.exportPdf(p);
      else if (format === "dwg") await doc.exportDwg(p);
      else await doc.exportDxf(p);
      return { exported: p };
    })
  );
  registerAppTool(
    server,
    "linea_show_document",
    {
      title: "Show Linea document",
      description: "Open the document in the FULL interactive Linea editor INSIDE the chat: the user can view, pan/zoom, draw, snap, dimension, and edit; their changes flow back into the document. Call this after creating or meaningfully changing a document, or whenever the user wants to see or edit it.",
      inputSchema: { documentId },
      _meta: { ui: { resourceUri: EDITOR_RESOURCE_URI } }
    },
    (async ({ documentId: idArg }) => {
      try {
        const { id, doc } = registry2.get(idArg);
        return {
          content: [
            {
              type: "text",
              text: `Showing "${doc.document.name}" in the in-chat editor (${doc.objects.length} model objects)`
            }
          ],
          structuredContent: docPayload2(registry2, id, doc)
        };
      } catch (e) {
        return toolError(e);
      }
    })
  );
  registerAppResource(
    server,
    "Linea editor",
    EDITOR_RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [
        {
          uri: EDITOR_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: await (opts.editorHtml ?? (async () => {
            const here = path.dirname(fileURLToPath(import.meta.url));
            return readFile(path.join(here, "editor.html"), "utf-8").catch(
              () => readFile(path.join(here, "..", "dist", "editor.html"), "utf-8")
            );
          }))()
        }
      ]
    })
  );
}

// src/server.ts
var PORT = Number(process.env.PORT ?? 3001);
var registry = new DocumentRegistry();
var buildServer = () => {
  const server = new McpServer({ name: "Lineadraw CAD", version: "0.1.0" });
  registerLineaTools(server, registry);
  return server;
};
function startHttpServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "16mb" }));
  app.use((req, _res, next) => {
    console.log(`${(/* @__PURE__ */ new Date()).toISOString()} ${req.method} ${req.path}`);
    next();
  });
  app.all(["/", "/mcp"], async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: void 0,
      enableJsonResponse: true
    });
    res.on("close", () => transport.close());
    await buildServer().connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
  const { TLS_CERT, TLS_KEY } = process.env;
  if (TLS_CERT && TLS_KEY) {
    https.createServer(
      { cert: readFileSync(TLS_CERT), key: readFileSync(TLS_KEY) },
      app
    ).listen(PORT, () => {
      console.log(`Linea MCP server on https://localhost:${PORT}/mcp`);
    });
  } else {
    app.listen(PORT, () => {
      console.log(
        `Linea MCP server on http://localhost:${PORT}/mcp (set TLS_CERT/TLS_KEY for https)`
      );
    });
  }
}
if (process.argv.includes("--stdio")) {
  await buildServer().connect(new StdioServerTransport());
  console.error("Linea MCP server on stdio");
} else {
  startHttpServer();
}
//# sourceMappingURL=server.js.map