// File Path: ui/etfi-town-focus/farm-fish-towns.js
//
// Author: Zatygold
//
// Farming Town (PROJECT_TOWN_GRANARY) and Fishing Town (PROJECT_TOWN_FISHING):
// +1 Food on Farms, Pastures, Plantations, and Fishing Boats. Eligible tiles
// are split into Improved (earn the Food) and Unimproved (eligible resources,
// no yield yet). Resource tiles show the resource name/icon.

import { ETFI_YIELDS, getFocusImprovements, composeWithFallback } from "../../etfi-utilities.js";

const FOOD_PER = 1;
const FOOD_IMPROVEMENTS = new Set([
  "IMPROVEMENT_FARM",
  "IMPROVEMENT_PASTURE",
  "IMPROVEMENT_PLANTATION",
  "IMPROVEMENT_FISHING_BOAT",
  "IMPROVEMENT_FISHING_BOAT_RESOURCE",
]);

export function buildFoodModel(city) {
  const { improved, unimproved } = getFocusImprovements(city, FOOD_IMPROVEMENTS);
  const improvedTotal = improved.reduce((s, g) => s + g.count, 0);

  const sections = [];
  if (improved.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_IMPROVED", "Improved"),
      rows: improved.map((g) => ({ iconId: g.iconId, name: g.name, count: g.count, yields: [{ yieldType: ETFI_YIELDS.FOOD, value: g.count * FOOD_PER }] })),
    });
  }
  if (unimproved.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_UNIMPROVED", "Unimproved"),
      rows: unimproved.map((g) => ({ iconId: g.iconId, name: g.name, count: g.count })),
    });
  }

  return {
    header: [{ yieldType: ETFI_YIELDS.FOOD, value: improvedTotal * FOOD_PER }],
    rows: [],
    sections,
    notes: [],
  };
}
