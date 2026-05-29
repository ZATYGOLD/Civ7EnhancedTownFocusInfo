// File Path: ui/etfi-town-focus/trade-town.js
//
// Author: Zatygold
//
// Trade Outpost (PROJECT_TOWN_TRADE): +1 Happiness per Resource tile in the
// town, plus +5 Trade Route range (shown as a pill next to the focus name).
// Resource tiles use the shared Improved (worked, earn the Happiness) and
// Unimproved (no yield) categories.

import { ETFI_YIELDS, TRADE_ROUTE_ICON, countResourceTiles, improvedUnimprovedSections } from "../../etfi-utilities.js";

const HAPPINESS_PER_RESOURCE = 1;
const TRADE_RANGE = 5;

export function buildTradeModel(city) {
  const { improved, unimproved, total } = countResourceTiles(city);
  const improvedTotal = improved.reduce((s, g) => s + g.count, 0);

  return {
    header: [
      { yieldType: ETFI_YIELDS.HAPPINESS, value: improvedTotal * HAPPINESS_PER_RESOURCE },
      { yieldType: TRADE_ROUTE_ICON, value: TRADE_RANGE },
    ],
    rows: [],
    sections: improvedUnimprovedSections({
      improved,
      unimproved,
      improvedYields: (g) => [{ yieldType: ETFI_YIELDS.HAPPINESS, value: g.count * HAPPINESS_PER_RESOURCE }],
    }),
    notes: [],
  };
}
