// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: ui/etfi-town-focus/farm-fish-towns.js
//
// Author: Zatygold
//
// Farming Town (PROJECT_TOWN_GRANARY) and Fishing Town (PROJECT_TOWN_FISHING):
// +1 Food on Farms, Pastures, Plantations, and Fishing Boats. Only the Improved
// (worked) tiles are listed — they are the ones that earn the Food.

import { ETFI_YIELDS, getFocusImprovements, composeWithFallback } from "../../etfi-utilities.js";
import { fromGroups, foldByYield, sectionFrom } from "./contributions.js";

const FOOD_PER = 1;
const FOOD_IMPROVEMENTS = new Set([
  "IMPROVEMENT_FARM",
  "IMPROVEMENT_PASTURE",
  "IMPROVEMENT_PLANTATION",
  "IMPROVEMENT_FISHING_BOAT",
  "IMPROVEMENT_FISHING_BOAT_RESOURCE",
]);

export function buildFoodModel(city) {
  const { improved } = getFocusImprovements(city, FOOD_IMPROVEMENTS);
  // One contribution list; the header and the rows are both folds over it.
  const contributions = fromGroups(improved, ETFI_YIELDS.FOOD, FOOD_PER);

  return {
    header: foldByYield(contributions),
    rows: [],
    sections: sectionFrom(composeWithFallback("LOC_MOD_ETFI_IMPROVED", "Improved"), contributions),
    notes: [],
  };
}
