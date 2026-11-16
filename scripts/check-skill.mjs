// Fails when the skill names a linea_* tool that no route serves: the
// shared catalog comes from the installed `lineadraw` package (the same
// build @lineadraw/mcp ships); route-only tools (the headless server's
// document lifecycle, the editor/bridge tools) are listed below.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { coreLineaTools } from "lineadraw/tools";

const ROUTE_ONLY = [
  // headless @lineadraw/mcp
  "linea_new_document", "linea_open_document", "linea_save_document",
  "linea_show_document",
  // the running app (desktop bridge, WebMCP)
  "linea_editor_state", "linea_list_editors", "linea_open_editor",
  "linea_select_editor", "linea_list_commands", "linea_run_command",
  "linea_set_selection", "linea_set_active_space", "linea_zoom",
  "linea_get_app_settings", "linea_update_app_settings",
  "linea_list_documents", "linea_close_document", "linea_delete_document",
];
const known = new Set([...coreLineaTools.map((t) => t.name), ...ROUTE_ONLY]);

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".md") ? [join(dir, e.name)] : [],
  );

let bad = 0;
for (const f of files("skills")) {
  const text = readFileSync(f, "utf8");
  // `linea_new/open/save_document` is shorthand for three tools.
  for (const [name] of text.replace(/linea_new\/open\/save_document/g, "").matchAll(/\blinea_[a-z_]+\b/g))
    if (!known.has(name)) {
      console.error(`${f}: unknown tool ${name}`);
      bad++;
    }
}
if (bad) process.exit(1);
console.log("skill: every linea_* tool name exists");
