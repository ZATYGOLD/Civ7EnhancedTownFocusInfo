// File Path: ui/etfi-town-focus/mining-town.js

// Mining / Production Town:
// +2 Production on Camps, Woodcutters, Clay Pits, Mines, and Quarries.
// Can purchase additional Production Buildings.

import {
  ETFI_YIELDS,
  getImprovementSummaryForSet,
} from "../../etfi-utilities.js";

import { renderImprovementDetailsHTML } from "./town-focus-html.js";

const PRODUCTION_PER_IMPROVEMENT = 2;

const MINING_IMPROVEMENT_DISPLAY_NAMES = Object.freeze({
  IMPROVEMENT_CAMP: "LOC_MOD_ETFI_IMPROVEMENT_CAMP",
  IMPROVEMENT_WOODCUTTER: "LOC_MOD_ETFI_IMPROVEMENT_WOODCUTTER",
  IMPROVEMENT_WOODCUTTER_RESOURCE: "LOC_MOD_ETFI_IMPROVEMENT_WOODCUTTER",
  IMPROVEMENT_CLAY_PIT: "LOC_MOD_ETFI_IMPROVEMENT_CLAY_PIT",
  IMPROVEMENT_MINE: "LOC_MOD_ETFI_IMPROVEMENT_MINE",
  IMPROVEMENT_MINE_RESOURCE: "LOC_MOD_ETFI_IMPROVEMENT_MINE",
  IMPROVEMENT_QUARRY: "LOC_MOD_ETFI_IMPROVEMENT_QUARRY",
});

const MINING_IMPROVEMENTS = new Set([
  "IMPROVEMENT_CAMP",
  "IMPROVEMENT_WOODCUTTER",
  "IMPROVEMENT_WOODCUTTER_RESOURCE",
  "IMPROVEMENT_CLAY_PIT",
  "IMPROVEMENT_MINE",
  "IMPROVEMENT_MINE_RESOURCE",
  "IMPROVEMENT_QUARRY",
]);

export default class MiningDetails {
  render(city) {
    const summary = getImprovementSummaryForSet({
      city,
      targetSet: MINING_IMPROVEMENTS,
      displayNameMap: MINING_IMPROVEMENT_DISPLAY_NAMES,
      baseMultiplier: PRODUCTION_PER_IMPROVEMENT,
    });

    if (!summary) return null;

    return renderImprovementDetailsHTML(
      summary,
      ETFI_YIELDS.PRODUCTION
    );
  }
}