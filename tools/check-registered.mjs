// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// Dev-only. Verifies the .modinfo manifest against what is actually on disk.
//
// The manifest lists every script and asset by hand, and a missing entry is a
// SILENT runtime failure — the file simply never loads and the mod half-works.
// This catches that, plus the reverse (an entry pointing at a file that no
// longer exists), plus relative imports that do not resolve.
//
// Run:  node tools/check-registered.mjs
// Exits non-zero on any problem, so it can gate a commit or a release.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative, resolve, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set([".git", "tools", "text", "Logo", "node_modules", ".vscode"]);

const problems = [];
const note = (msg) => problems.push(msg);

// --- what's on disk ---------------------------------------------------------

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(join(dir, entry.name), out);
    } else if (/\.(js|css)$/.test(entry.name)) {
      out.push(relative(ROOT, join(dir, entry.name)).split("\\").join("/"));
    }
  }
  return out;
}

const onDisk = new Set(walk(ROOT));

// --- what the manifest claims ----------------------------------------------

const modinfoName = readdirSync(ROOT).find((f) => f.endsWith(".modinfo"));
if (!modinfoName) {
  console.error("FAIL: no .modinfo found in the mod root");
  process.exit(1);
}
const modinfo = readFileSync(join(ROOT, modinfoName), "utf8").replace(/\0/g, "");

// Strip XML comments so a commented-out <Item> isn't counted as registered.
const manifest = modinfo.replace(/<!--[\s\S]*?-->/g, "");
const listed = new Set(
  [...manifest.matchAll(/<Item[^>]*>([^<]+)<\/Item>/g)]
    .map((m) => m[1].trim())
    .filter((p) => /\.(js|css)$/.test(p)),
);

for (const p of [...onDisk].sort()) {
  if (!listed.has(p)) note(`on disk but NOT registered in ${modinfoName}:  ${p}`);
}
for (const p of [...listed].sort()) {
  if (!existsSync(join(ROOT, p))) note(`registered but MISSING on disk:      ${p}`);
}

// --- relative imports resolve ----------------------------------------------

for (const p of onDisk) {
  if (!p.endsWith(".js")) continue;
  const src = readFileSync(join(ROOT, p), "utf8").replace(/\0/g, "");
  for (const m of src.matchAll(/(?:from|import)\s+["'](\.[^"']+)["']/g)) {
    const target = posix.normalize(posix.join(posix.dirname(p), m[1]));
    if (!existsSync(join(ROOT, target))) note(`${p}: unresolved import  ${m[1]}`);
  }
}

// --- the stylesheet URL matches the mod id and the file's real path --------

const modId = modinfo.match(/<Mod\s+id="([^"]+)"/)?.[1];
for (const p of onDisk) {
  if (!p.endsWith(".js")) continue;
  const src = readFileSync(join(ROOT, p), "utf8").replace(/\0/g, "");
  for (const m of src.matchAll(/fs:\/\/game\/([^"')]+)/g)) {
    const [idSeg, ...rest] = m[1].split("/");
    const assetPath = rest.join("/");
    if (idSeg !== modId) {
      note(`${p}: fs:// URL uses "${idSeg}" but <Mod id> is "${modId}"`);
    } else if (!existsSync(join(ROOT, assetPath))) {
      note(`${p}: fs:// URL points at a file that does not exist:  ${assetPath}`);
    }
  }
}

// --- locale parity ----------------------------------------------------------

const textDir = join(ROOT, "text");
if (existsSync(textDir)) {
  const locales = readdirSync(textDir).filter((d) => statSync(join(textDir, d)).isDirectory());
  const tagsFor = (loc) => {
    const f = join(textDir, loc, "InGameText.xml");
    if (!existsSync(f)) return null;
    const xml = readFileSync(f, "utf8").replace(/\0/g, "");
    return new Set([...xml.matchAll(/<(?:Row|Replace)[^>]*Tag="([^"]+)"/g)].map((m) => m[1]));
  };
  const base = tagsFor("en_us");
  if (!base) note("text/en_us/InGameText.xml is missing");
  else {
    for (const loc of locales) {
      if (loc === "en_us") continue;
      const t = tagsFor(loc);
      if (!t) { note(`text/${loc}/InGameText.xml is missing`); continue; }
      for (const tag of base) if (!t.has(tag)) note(`text/${loc}: missing ${tag}`);
      for (const tag of t) if (!base.has(tag)) note(`text/${loc}: has ${tag}, absent from en_us`);
    }
  }
}

// --- report -----------------------------------------------------------------

if (problems.length) {
  console.error(`check-registered: ${problems.length} problem(s)\n`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(`check-registered: OK — ${onDisk.size} assets registered, imports resolve, locales match`);
