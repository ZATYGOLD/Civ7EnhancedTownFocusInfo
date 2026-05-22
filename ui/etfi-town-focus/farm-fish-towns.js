// File Path: ui/etfi-town-focus/farm-fish-towns.js

// Food / Fishing Town:
// +1 Food on Farms, Pastures, Plantations, and Fishing Boats.
// Can purchase additional Food and Water Buildings.

import { ETFI_YIELDS, getImprovementSummaryForSet, } from "../../etfi-utilities.js";
import { renderImprovementDetailsHTML } from "./town-focus-html.js";

const FOOD_PER_IMPROVEMENT = 1;

const FOOD_IMPROVEMENT_DISPLAY_NAMES = Object.freeze({
  IMPROVEMENT_FISHING_BOAT: "LOC_MOD_ETFI_IMPROVEMENT_FISHING_BOAT",
  IMPROVEMENT_FISHING_BOAT_RESOURCE: "LOC_MOD_ETFI_IMPROVEMENT_FISHING_BOAT",
  IMPROVEMENT_FARM: "LOC_MOD_ETFI_IMPROVEMENT_FARM",
  IMPROVEMENT_PASTURE: "LOC_MOD_ETFI_IMPROVEMENT_PASTURE",
  IMPROVEMENT_PLANTATION: "LOC_MOD_ETFI_IMPROVEMENT_PLANTATION",
});

const FOOD_IMPROVEMENTS = new Set([
  "IMPROVEMENT_FARM",
  "IMPROVEMENT_PASTURE",
  "IMPROVEMENT_PLANTATION",
  "IMPROVEMENT_FISHING_BOAT",
  "IMPROVEMENT_FISHING_BOAT_RESOURCE",
]);

export default class FoodFocusDetails {
  render(city) {
    const summary = getImprovementSummaryForSet({
      city,
      targetSet: FOOD_IMPROVEMENTS,
      displayNameMap: FOOD_IMPROVEMENT_DISPLAY_NAMES,
      baseMultiplier: FOOD_PER_IMPROVEMENT,
    });

    if (!summary) return null;

    return renderImprovementDetailsHTML(summary, ETFI_YIELDS.FOOD);
  }
}