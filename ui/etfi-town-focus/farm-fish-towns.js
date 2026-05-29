// File Path: ui/etfi-town-focus/farm-fish-towns.js
//
// Author: Zatygold
//
// Farming Town (PROJECT_TOWN_GRANARY) and Fishing Town (PROJECT_TOWN_FISHING):
// +1 Food on Farms, Pastures, Plantations, and Fishing Boats (per the in-game
// Focus Queue description). Builds an ETFI model from live town data.

import { ETFI_YIELDS, countImprovements } from "../../etfi-utilities.js";

const FOOD_PER = 1;
const FOOD_IMPROVEMENTS = new Set([
  "IMPROVEMENT_FARM",
  "IMPROVEMENT_PASTURE",
  "IMPROVEMENT_PLANTATION",
  "IMPROVEMENT_FISHING_BOAT",
  "IMPROVEMENT_FISHING_BOAT_RESOURCE",
]);

export function buildFoodModel(city) {
  const { groups, total } = countImprovements(city, FOOD_IMPROVEMENTS);
  const rows = groups.map((g) => ({
    iconId: g.iconId,
    name: g.name,
    count: g.count,
    yields: [{ yieldType: ETFI_YIELDS.FOOD, value: g.count * FOOD_PER }],
  }));
  return {
    header: [{ yieldType: ETFI_YIELDS.FOOD, value: total * FOOD_PER }],
    rows,
  };
}
