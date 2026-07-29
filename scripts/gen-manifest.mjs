// Manifest generator (the future CI's core). Mirrors the editor's
// MarketplaceEntrySchema exactly.
//   Usage: node scripts/gen-manifest.mjs [repoDir] [sha]
// repoDir defaults to the repo root, sha to `git rev-parse HEAD` — run it
// AFTER committing content changes (pinned URLs must reference a commit
// that contains the sources being hashed), then commit the manifest.
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Machine-local: sucrase comes from the linea monorepo checkout. The CI
// version gets its own dependency instead.
const require_ = createRequire(
  "C:/Users/MikhailKoshelev/source/repos/linea/package.json",
);
const { transform } = require_("sucrase");

const argDir = process.argv[2];
const repoDir =
  argDir ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const git = (cmd) =>
  execSync(`git ${cmd}`, { cwd: repoDir, encoding: "utf8" }).trim();
const sha = process.argv[3] ?? git("rev-parse HEAD");
if (git("status --porcelain -- blocks commands") !== "")
  console.warn(
    "WARNING: blocks/ or commands/ have uncommitted changes — the pinned " +
      "URLs will NOT contain them. Commit first, then regenerate.",
  );

// Same execution model as @lineadraw/core's transpiler: ESM→CJS, run against
// a require shim. Helpers resolve to no-op function proxies — top-level code
// only needs the imports to EXIST; we never run draw()/run() here.
const helperProxy = new Proxy(
  {},
  { get: () => () => ({}) },
);
const executeModule = (source) => {
  const code = transform(source, { transforms: ["typescript", "imports"] }).code;
  const moduleShim = { exports: {} };
  new Function("exports", "require", "module", code)(
    moduleShim.exports,
    (spec) => {
      if (spec === "lineadraw" || spec === "linea")
        return {
          helpers: helperProxy,
          defineBlock: (s) => s,
          defineCommand: (s) => s,
        };
      if (spec === "lineadraw/helpers" || spec === "linea/helpers")
        return helperProxy;
      throw new Error(`Illegal import "${spec}"`);
    },
    moduleShim,
  );
  const exported = moduleShim.exports;
  const spec = exported.default;
  return spec !== null && typeof spec === "object" && !Array.isArray(spec)
    ? { ...exported, ...spec }
    : exported;
};

const ID_RE = /^@[a-z0-9-]{1,64}\/[a-z0-9-]{1,64}$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;

const entryOf = (kind, folder, file) => {
  const source = readFileSync(join(repoDir, folder, file), "utf8");
  const mod = executeModule(source);
  const problems = [];
  if (typeof mod.id !== "string" || !ID_RE.test(mod.id))
    problems.push(`id ${JSON.stringify(mod.id)} is not @collection/slug`);
  if (typeof mod.name !== "string" || mod.name.trim() === "")
    problems.push("missing name");
  if (typeof mod.version !== "string" || !SEMVER_RE.test(mod.version))
    problems.push(`version ${JSON.stringify(mod.version)} is not semver`);
  if (kind === "block" && typeof mod.draw !== "function" && typeof mod.main !== "function")
    problems.push("no draw export");
  if (kind === "command" && typeof mod.run !== "function")
    problems.push("no run export");
  if (problems.length > 0) return { file, problems };
  return {
    file,
    entry: {
      kind,
      id: mod.id,
      name: mod.name,
      version: mod.version,
      ...(typeof mod.description === "string"
        ? { description: mod.description }
        : {}),
      tags: Array.isArray(mod.tags) ? mod.tags.filter((t) => typeof t === "string") : [],
      authors: Array.isArray(mod.authors)
        ? mod.authors.filter((a) => typeof a === "string")
        : [],
      dependencies:
        kind === "block" && Array.isArray(mod.dependencies)
          ? mod.dependencies.filter((d) => typeof d === "string")
          : [],
      contentHash: createHash("sha256").update(source, "utf8").digest("hex"),
      sourceUrl: `https://raw.githubusercontent.com/lineadraw/lineadraw/${sha}/${folder}/${file}`,
    },
  };
};

const results = [
  ...readdirSync(join(repoDir, "blocks"))
    .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
    .map((f) => entryOf("block", "blocks", f)),
  ...readdirSync(join(repoDir, "commands"))
    .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
    .map((f) => entryOf("command", "commands", f)),
];

const bad = results.filter((r) => r.problems);
for (const r of bad) console.error(`REJECTED ${r.file}: ${r.problems.join("; ")}`);
const entries = results.filter((r) => r.entry).map((r) => r.entry);

const dupes = entries
  .map((e) => e.id)
  .filter((id, i, all) => all.indexOf(id) !== i);
if (dupes.length > 0) throw new Error(`duplicate ids: ${dupes.join(", ")}`);

// The public catalog must be dependency-CLOSED: every declared dependency
// resolves to a block entry in this same manifest.
const blockIds = new Set(
  entries.filter((e) => e.kind === "block").map((e) => e.id),
);
const dangling = entries.flatMap((e) =>
  e.dependencies.filter((d) => !blockIds.has(d)).map((d) => `${e.id} → ${d}`),
);
if (dangling.length > 0)
  throw new Error(`dangling dependencies: ${dangling.join(", ")}`);

const manifest = {
  // Informational; the editor validates row-by-row and ignores extras.
  generatedAt: new Date().toISOString(),
  commit: sha,
  entries,
};
writeFileSync(join(repoDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`manifest.json: ${entries.length} entries (${bad.length} rejected)`);
for (const e of entries) console.log(`  ${e.kind}  ${e.id}  v${e.version}`);
