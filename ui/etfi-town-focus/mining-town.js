// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: ui/etfi-town-focus/mining-town.js
//
// Author: Zatygold
//
// Mining Town (PROJECT_TOWN_PRODUCTION): +2 Production on Camps, Woodcutters,
// Clay Pits, Mines, Quarries (Modern: Oil Rigs). Only the Improved (worked)
// tiles are listed — they are the ones that earn the Production.

import { ETFI_YIELDS, getFocusImprovements, composeWithFallback } from "../utilities/etfi-utilities.js";
import { fromGroups, foldByYield, sectionFrom } from "./contributions.js";

const PRODUCTION_PER = 2;
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

export function buildMiningModel(city) {
  const { improved } = getFocusImprovements(city, PRODUCTION_IMPROVEMENTS);
  // One contribution list; the header and the rows are both folds over it.
  const contributions = fromGroups(improved, ETFI_YIELDS.PRODUCTION, PRODUCTION_PER);

  return {
    header: foldByYield(contributions),
    rows: [],
    sections: sectionFrom(composeWithFallback("LOC_MOD_ETFI_IMPROVED", "Improved"), contributions),
    notes: [],
  };
}
