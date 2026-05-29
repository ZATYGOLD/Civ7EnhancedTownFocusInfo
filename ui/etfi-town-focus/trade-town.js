// File Path: ui/etfi-town-focus/trade-town.js
//
// Author: Zatygold
//
// Trade Outpost (PROJECT_TOWN_TRADE): +1 Happiness per Resource tile in the
// town, plus +5 Trade Route range (shown as a pill next to the focus name).
// Resource tiles are split into Improved (worked) and Unimproved categories,
// each in its own panel.

import { ETFI_YIELDS, TRADE_ROUTE_ICON, countResourceTiles, composeWithFallback } from "../../etfi-utilities.js";

const HAPPINESS_PER_RESOURCE = 1;
const TRADE_RANGE = 5;

export function buildTradeModel(city) {
  const { improved, unimproved, total } = countResourceTiles(city);

  const sections = [];
  if (improved.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_IMPROVED", "Improved"),
      rows: improved.map((g) => ({
        iconId: g.iconId,
        name: g.name,
        count: g.count,
        yields: [{ yieldType: ETFI_YIELDS.HAPPINESS, value: g.count * HAPPINESS_PER_RESOURCE }],
      })),
    });
  }
  if (unimproved.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_UNIMPROVED", "Unimproved"),
      separatePanel: "bottom",
      rows: unimproved.map((g) => ({
        iconId: g.iconId,
        name: g.name,
        count: g.count,
        yields: [{ yieldType: ETFI_YIELDS.HAPPINESS, value: g.count * HAPPINESS_PER_RESOURCE }],
      })),
    });
  }

  return {
    header: [
      { yieldType: ETFI_YIELDS.HAPPINESS, value: total * HAPPINESS_PER_RESOURCE },
      { yieldType: TRADE_ROUTE_ICON, value: TRADE_RANGE },
    ],
    rows: [],
    sections,
    notes: [],
  };
}
