// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: ui/etfi-town-focus/mining-town.js
//
// Author: Zatygold
//
// Mining Town (PROJECT_TOWN_PRODUCTION): +2 Production on Camps, Woodcutters,
// Clay Pits, Mines, Quarries (Modern: Oil Rigs). Only the Improved (worked)
// tiles are listed — they are the ones that earn the Production.

import { ETFI_YIELDS, getFocusImprovements, warehouseAmountResolver, composeWithFallback } from "../utilities/etfi-utilities.js";
import { fromGroups, foldByYield, sectionFrom } from "./contributions.js";

// A "warehouse" focus: the amount is not an Amount argument on the modifier but
// lives on the Warehouse_YieldChanges rows the modifier points at, one row per
// improvement — so each improvement resolves its own value. Hills and vegetated
// features are granted by terrain/feature rather than by improvement and fall
// back to the focus's modal amount. See getWarehouseAmounts.
const MOD_PRODUCTION = "ATTACH_PRODUCTION_WAREHOUSE_FROM_PROJECT";
// Last-known-good (game 1.5.0), used only if the game data can't be read.
const FALLBACK_PRODUCTION = 2;

const PRODUCTION_IMPROVEMENTS = new Set([
  "IMPROVEMENT_CAMP",
  "IMPROVEMENT_WOODCUTTER",
  "IMPROVEMENT_WOODCUTTER_RESOURCE",
  "IMPROVEMENT_CLAY_PIT",
  "IMPROVEMENT_CLAY_PIT_RESOURCE",
  "IMPROVEMENT_MINE",
  "IMPROVEMENT_MINE_RESOURCE",
  "IMPROVEMENT_QUARRY",
  "IMPROVEMENT_OIL_RIG",
]);

// Cached only once the game data actually resolved (see farm-fish-towns.js).
let cachedProduction = null;
function productionAmount() {
  if (cachedProduction) return cachedProduction;
  const r = warehouseAmountResolver(MOD_PRODUCTION, ETFI_YIELDS.PRODUCTION, FALLBACK_PRODUCTION);
  if (r.resolved) cachedProduction = r;
  return r;
}

export function buildMiningModel(city) {
  const { improved } = getFocusImprovements(city, PRODUCTION_IMPROVEMENTS);
  const production = productionAmount();
  // One contribution list; the header and the rows are both folds over it.
  const contributions = fromGroups(improved, ETFI_YIELDS.PRODUCTION, (g) => production.amountFor(g.type));

  return {
    header: foldByYield(contributions),
    rows: [],
    sections: sectionFrom(composeWithFallback("LOC_MOD_ETFI_IMPROVED", "Improved"), contributions),
    notes: [],
  };
}
