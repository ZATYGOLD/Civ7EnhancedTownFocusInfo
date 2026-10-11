// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// Dev-only. Stages a clean copy of the mod for Workshop upload.
//
// WHY THIS EXISTS: Workshop upload takes the WHOLE folder. The .modinfo manifest
// does not control packaging — so without staging, this repo's .git directory,
// jsconfig.json, etfi-globals.d.ts, README.md and tools/ all ship to every
// subscriber. (The installed copy of LF Policies Yields Preview on disk contains
// its entire CI harness, .github/workflows and all, which is how we know.)
//
// Run:  node tools/package.mjs            -> writes ../Civ7EnhancedTownFocusInfo-release
//       node tools/package.mjs <outDir>
//
// Runs check-registered first and refuses to stage if it fails.

import { cpSync, existsSync, rmSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(process.argv[2] || join(ROOT, "..", "Civ7EnhancedTownFocusInfo-release"));

// Everything the game actually loads, plus the licence (GPL-3.0-only requires it
// to travel with the thing it covers) and the logo the Workshop page uses.
const SHIP = [
  "EnhancedTownFocusInfo.modinfo",
  "LICENSE",
  "vendor",
  "ui",
  "text",
  "Logo",
];

// Belt and braces: even inside a shipped folder, never copy these.
const NEVER = new Set([".git", ".gitattributes", ".gitignore", ".vscode", "node_modules"]);

if (OUT === ROOT || OUT.startsWith(ROOT + "\\") || OUT.startsWith(ROOT + "/")) {
  console.error("FAIL: output directory must be outside the mod folder");
  process.exit(1);
}

try {
  execFileSync(process.execPath, [join(ROOT, "tools", "check-registered.mjs")], {
    cwd: ROOT,
    stdio: "inherit",
  });
} catch {
  console.error("\nFAIL: check-registered reported problems — not staging.");
  process.exit(1);
}

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let files = 0;
for (const entry of SHIP) {
  const from = join(ROOT, entry);
  if (!existsSync(from)) {
    console.error(`FAIL: expected to ship "${entry}" but it does not exist`);
    process.exit(1);
  }
  cpSync(from, join(OUT, entry), {
    recursive: true,
    filter: (src) => !NEVER.has(src.split(/[\\/]/).pop()),
  });
}

const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else files++;
  }
};
walk(OUT);

// Report what was deliberately left behind, so the list stays honest over time.
const left = readdirSync(ROOT).filter((n) => !SHIP.includes(n));

console.log(`\npackaged ${files} files -> ${OUT}`);
console.log(`excluded: ${left.join(", ")}`);
console.log("\nUpload the staged folder, not the repo.");
