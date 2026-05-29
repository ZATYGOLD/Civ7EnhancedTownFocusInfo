// File Path: ui/etfi-town-focus/temple-town.js
//
// Author: Zatygold
//
// Religious Site (PROJECT_TOWN_TEMPLE, Exploration only): +2 Happiness on all
// Buildings in the town, +2 Relic Slots on Temples, +25% Gold to purchase
// Temples.

import { ETFI_YIELDS, getCountableBuildings, composeWithFallback } from "../../etfi-utilities.js";

const HAPPINESS_PER_BUILDING = 2;
const RELIC_SLOTS_PER_TEMPLE = 2;

export function buildTempleModel(city) {
  const buildings = getCountableBuildings(city);
  const buildingCount = buildings.length;
  const templeCount = buildings.filter((b) => b.type === "BUILDING_TEMPLE").length;
  const happiness = buildingCount * HAPPINESS_PER_BUILDING;

  const rows = [];
  if (buildingCount) {
    rows.push({
      name: composeWithFallback("LOC_MOD_ETFI_TOTAL_BUILDINGS", "Buildings"),
      count: buildingCount,
      yields: [{ yieldType: ETFI_YIELDS.HAPPINESS, value: happiness }],
    });
  }

  const notes = [];
  if (templeCount) {
    notes.push(`+${RELIC_SLOTS_PER_TEMPLE * templeCount} Relic Slots (${templeCount} Temple${templeCount === 1 ? "" : "s"})`);
  }
  notes.push("+25% [icon:YIELD_GOLD] Gold towards purchasing Temples");

  return {
    header: [{ yieldType: ETFI_YIELDS.HAPPINESS, value: happiness }],
    rows,
    notes,
  };
}
