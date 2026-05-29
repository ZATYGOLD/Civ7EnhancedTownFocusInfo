// File Path: ui/etfi-town-focus/mining-town.js
//
// Author: Zatygold
//
// Mining Town (PROJECT_TOWN_PRODUCTION): +2 Production on Camps, Woodcutters,
// Clay Pits, Mines, and Quarries (Modern also counts Oil Rigs). Builds an ETFI
// model from live town data.

import { ETFI_YIELDS, countImprovements } from "../../etfi-utilities.js";

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
  const { groups, total } = countImprovements(city, PRODUCTION_IMPROVEMENTS);
  const rows = groups.map((g) => ({
    iconId: g.iconId,
    name: g.name,
    count: g.count,
    yields: [{ yieldType: ETFI_YIELDS.PRODUCTION, value: g.count * PRODUCTION_PER }],
  }));
  return {
    header: [{ yieldType: ETFI_YIELDS.PRODUCTION, value: total * PRODUCTION_PER }],
    rows,
  };
}
