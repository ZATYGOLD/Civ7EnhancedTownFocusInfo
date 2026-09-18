// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: ui/etfi-town-focus/farm-fish-towns.js
//
// Author: Zatygold
//
// Farming Town (PROJECT_TOWN_GRANARY) and Fishing Town (PROJECT_TOWN_FISHING):
// +1 Food on Farms, Pastures, Plantations, and Fishing Boats. Only the Improved
// (worked) tiles are listed — they are the ones that earn the Food.

import { ETFI_YIELDS, getFocusImprovements, warehouseAmountResolver, composeWithFallback } from "../utilities/etfi-utilities.js";
import { fromGroups, foldByYield, sectionFrom } from "./contributions.js";

// Both focuses are "warehouse" focuses: the amount is NOT an Amount argument on
// the modifier, it lives on the Warehouse_YieldChanges rows the modifier points
// at. See getWarehouseAmounts. Farming and Fishing list the same rows, so
// either modifier resolves the same numbers; we read Granary's.
//
// Note the game grants Farms their Food through TERRAIN_FLAT rather than
// through IMPROVEMENT_FARM, so Farms (and plain Fishing Boats) resolve via the
// focus's modal amount rather than an improvement-specific row.
const MOD_GRANARY = "ATTACH_GRANARY_WAREHOUSE_FOOD_FROM_PROJECT";
// Last-known-good (game 1.5.0), used only if the game data can't be read.
const FALLBACK_FOOD = 1;

const FOOD_IMPROVEMENTS = new Set([
  "IMPROVEMENT_FARM",
  "IMPROVEMENT_PASTURE",
  "IMPROVEMENT_PLANTATION",
  "IMPROVEMENT_FISHING_BOAT",
  "IMPROVEMENT_FISHING_BOAT_RESOURCE",
]);

// Cached only once the game data actually resolved — caching a fallback would
// freeze the last-known-good number for the whole session and defeat the point
// of reading the data at all.
let cachedFood = null;
function foodAmount() {
  if (cachedFood) return cachedFood;
  const r = warehouseAmountResolver(MOD_GRANARY, ETFI_YIELDS.FOOD, FALLBACK_FOOD);
  if (r.resolved) cachedFood = r;
  return r;
}

export function buildFoodModel(city) {
  const { improved } = getFocusImprovements(city, FOOD_IMPROVEMENTS);
  const food = foodAmount();
  // One contribution list; the header and the rows are both folds over it.
  const contributions = fromGroups(improved, ETFI_YIELDS.FOOD, (g) => food.amountFor(g.type));

  return {
    header: foldByYield(contributions),
    rows: [],
    sections: sectionFrom(composeWithFallback("LOC_MOD_ETFI_IMPROVED", "Improved"), contributions),
    notes: [],
  };
}
