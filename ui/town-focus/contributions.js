// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// The shared vocabulary every Town Focus model speaks.
//
// A focus preview is ONE list of contributions — `count` instances of `source`,
// each granting `amount` of `yieldType`. Both views are folds over that list:
//
//   header pills    -> foldByYield(list)
//   breakdown rows  -> groupBySource(list)   (or sectionFrom(), which wraps it)
//
// So the header is BY CONSTRUCTION the sum of the rows beneath it. Computing
// them separately is what let Resort double-count a Natural Wonder's +1/+1;
// that bug class is now inexpressible.
//
// `source` IS the row — its fields are copied onto the rendered row verbatim:
// `{ name, iconId, count }` for a grouped row, `{ items, subText }` for a
// Quarter, plus extras like `tipModel`. Rows merge by `source.key`, else
// `source.name`. A contribution's own `count` is arithmetic only; if the row
// should display one, put it on the source too.
//
// `source: null` is a town-wide bonus: header only, no breakdown row.
//
// Deliberately dependency-free, so builders and the data layer can both use it.

/**
 * One evaluated contribution.
 * @param {string} yieldType yield type or icon id (ETFI_YIELDS.* / *_ICON)
 * @param {number} amount    per-instance amount
 * @param {number} [count]   number of instances (default 1)
 * @param {object|null} [source] the row this belongs to; null = town-wide
 * @param {object} [extra]   extra row fields merged in on first sight
 * @param {object} [yieldProps] extra fields merged onto the produced yield entry
 *   itself (e.g. `{ colored: false }` to leave a pill uncoloured)
 */
export function contribution(yieldType, amount, count = 1, source = null, extra = undefined, yieldProps = undefined) {
  return { yieldType, amount, count, source, extra, yieldProps };
}

// Total for a contribution = amount * count.
function valueOf(c) {
  const amount = Number(c?.amount) || 0;
  const count = c?.count == null ? 1 : Number(c.count) || 0;
  return amount * count;
}

// Merge `value` into a yields array, summing duplicates by type. `props` carries
// display flags for the pill itself (e.g. `colored`).
function addYield(yields, yieldType, value, props) {
  const existing = yields.find((y) => y.yieldType === yieldType);
  if (existing) {
    existing.value += value;
    if (props) Object.assign(existing, props);
  } else {
    yields.push({ yieldType, value, ...(props || {}) });
  }
}

// Fold contributions into header pills — one per yield type, first-seen order.
// Returns [{ yieldType, value }].
//
// `alwaysTypes` are reported even at zero, so a focus that earns nothing here
// reads "+0" rather than showing no pill (which could equally mean the mod
// failed). Seeded first, so pill order is stable either way.
export function foldByYield(list, alwaysTypes = null) {
  const yields = [];
  for (const t of alwaysTypes || []) addYield(yields, t, 0);
  for (const c of list || []) {
    if (!c || !c.yieldType) continue;
    addYield(yields, c.yieldType, valueOf(c), c.yieldProps);
  }
  return yields;
}

// Group contributions into breakdown rows, one per source, first-seen order.
// Town-wide contributions (source === null) are skipped — header only.
// Each row is the source's own fields plus the folded `yields`.
export function groupBySource(list) {
  const order = [];
  const byKey = new Map();
  let anon = 0;
  for (const c of list || []) {
    const src = c?.source;
    if (!src) continue;
    let key = src.key != null ? src.key : src.name;
    // A source with no key AND no name would otherwise be dropped from the rows
    // while still counting toward the header — reintroducing exactly the
    // header/rows divergence this module exists to prevent. Give it a synthetic
    // key so it still renders, and say so loudly.
    if (key == null || key === "") {
      key = `__anon:${anon++}`;
      console.error("[ETFI] contribution source has no key or name; using", key, c);
    }
    let row = byKey.get(key);
    if (!row) {
      const { key: _unused, ...fields } = src;
      row = { ...fields, ...(c.extra || {}), yields: [] };
      byKey.set(key, row);
      order.push(row);
    }
    // A null yieldType means "this row exists but grants nothing" (e.g. Factory
    // Town lists its resources without per-row yields).
    if (c.yieldType) addYield(row.yields, c.yieldType, valueOf(c), c.yieldProps);
  }
  // A row with no yields still renders (name/count only), so keep empty arrays off.
  for (const row of order) if (!row.yields.length) delete row.yields;
  return order;
}

/**
 * Convert the mod's standard tile-group shape into contributions.
 * A group is { name, iconId, count, tiles? } as returned by getFocusImprovements,
 * countResourceTiles, getResortData, etc. Each group becomes one row granting
 * `per` of `yieldType` per instance. A group's optional `tiles` (per-tile
 * building lists, e.g. Districts) becomes that row's hover tipModel — the same
 * behaviour the old improvedUnimprovedSections() provided.
 *
 * Pass `yieldType = null` for rows that list something without granting a yield
 * (Factory Town's resource list).
 *
 * `per` is the amount each instance grants. It may be a number, or a function
 * (group) -> number for focuses whose game data sets a different amount per
 * improvement (the warehouse focuses — see warehouseAmountResolver).
 */
export function fromGroups(groups, yieldType, per) {
  const amountOf = typeof per === "function" ? per : () => per;
  return (groups || []).map((g) => {
    const source = { name: g.name, iconId: g.iconId, count: g.count };
    if (Array.isArray(g.tiles) && g.tiles.length) {
      source.tipModel = {
        sections: [{
          rows: g.tiles.map((tile) => ({
            items: (tile || []).map((b) => ({ iconId: b.iconId, name: b.name })),
          })),
        }],
      };
    }
    return contribution(yieldType, amountOf(g), g.count, source);
  });
}

/**
 * Convert quarter-style groups into contributions. A quarter is
 * { buildings: [{ name, iconId }], name? } as returned by getTownBuildings.
 * Each becomes ONE composite row listing its buildings via `items`, with the
 * quarter's own name (Unique Quarters) as `subText` — the shape the old
 * quarterSections() produced.
 *
 * `keyPrefix` keeps rows from different categories distinct (quarters have no
 * name of their own to key on). Call it more than once with the same prefix to
 * layer several yields onto the same rows.
 *
 * `countOf(q)` supplies the arithmetic multiplier: default 1 (a flat per-quarter
 * bonus, e.g. Urban Center), or `(q) => q.buildings.length` for a per-building
 * bonus (e.g. Religious Site).
 */
// The default takes (and ignores) the quarter so the parameter's signature
// matches how it is called; a bare `() => 1` reads as taking no arguments.
export function fromQuarters(quarters, yieldType, amount, keyPrefix, countOf = (_q) => 1) {
  return (quarters || []).map((q, i) => {
    const source = {
      key: `${keyPrefix}:${i}`,
      items: (q.buildings || []).map((b) => ({ iconId: b.iconId, name: b.name })),
    };
    if (q.name) source.subText = q.name;
    return contribution(yieldType, amount, countOf(q), source);
  });
}

// Convenience: build a titled section from contributions, or [] when there are
// no rows. `extra` merges into the section (e.g. { separatePanel: "bottom" }).
// Returns an ARRAY so callers can spread it straight into their sections list.
export function sectionFrom(title, contributions, extra = undefined) {
  const rows = groupBySource(contributions);
  if (!rows.length) return [];
  return [{ title, rows, ...(extra || {}) }];
}
