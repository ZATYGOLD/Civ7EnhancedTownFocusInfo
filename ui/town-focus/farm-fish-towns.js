// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// Farming Town (PROJECT_TOWN_GRANARY) and Fishing Town (PROJECT_TOWN_FISHING).
// Only Improved (worked) tiles are listed — they are the ones that earn Food.

import { ETFI_YIELDS, getFocusImprovements, warehouseAmountResolver, composeWithFallback } from "../utilities/utilities-town-focus.js";
import { fromGroups, foldByYield, sectionFrom } from "./contributions.js";

// A "warehouse" focus: the amount lives on the Warehouse_YieldChanges rows the
// modifier points at, not in an Amount argument (see getWarehouseAmounts).
// Farming and Fishing list the same rows, so Granary's modifier resolves both.
// Farms get their Food via TERRAIN_FLAT rather than IMPROVEMENT_FARM, so Farms
// (and plain Fishing Boats) fall back to the focus's modal amount.
const MOD_GRANARY = "ATTACH_GRANARY_WAREHOUSE_FOOD_FROM_PROJECT";
// Game 1.5.0 value, used only if the game data can't be read.
const FALLBACK_FOOD = 1;

const FOOD_IMPROVEMENTS = new Set([
  "IMPROVEMENT_FARM",
  "IMPROVEMENT_PASTURE",
  "IMPROVEMENT_PLANTATION",
  "IMPROVEMENT_FISHING_BOAT",
  "IMPROVEMENT_FISHING_BOAT_RESOURCE",
]);

// Cache only once the lookup resolved — caching a fallback would freeze it for
// the session and defeat reading the data at all.
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
  const contributions = fromGroups(improved, ETFI_YIELDS.FOOD, (g) => food.amountFor(g.type));

  return {
    header: foldByYield(contributions),
    rows: [],
    sections: sectionFrom(composeWithFallback("LOC_MOD_ETFI_IMPROVED", "Improved"), contributions),
    notes: [],
  };
}
