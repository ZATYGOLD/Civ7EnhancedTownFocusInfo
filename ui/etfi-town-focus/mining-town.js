// File Path: ui/etfi-town-focus/mining-town.js
//
// Author: Zatygold
//
// Mining Town (PROJECT_TOWN_PRODUCTION): +2 Production on Camps, Woodcutters,
// Clay Pits, Mines, Quarries (Modern: Oil Rigs). Split into the shared Improved
// (earn the Production) and Unimproved categories.

import { ETFI_YIELDS, getFocusImprovements, improvedUnimprovedSections } from "../../etfi-utilities.js";

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
  const { improved, unimproved } = getFocusImprovements(city, PRODUCTION_IMPROVEMENTS);
  const improvedTotal = improved.reduce((s, g) => s + g.count, 0);

  return {
    header: [{ yieldType: ETFI_YIELDS.PRODUCTION, value: improvedTotal * PRODUCTION_PER }],
    rows: [],
    sections: improvedUnimprovedSections({
      improved,
      unimproved,
      improvedYields: (g) => [{ yieldType: ETFI_YIELDS.PRODUCTION, value: g.count * PRODUCTION_PER }],
    }),
    notes: [],
  };
}
