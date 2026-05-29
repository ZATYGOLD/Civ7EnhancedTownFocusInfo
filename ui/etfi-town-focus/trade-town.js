// File Path: ui/etfi-town-focus/trade-town.js
//
// Author: Zatygold
//
// Trade Outpost (PROJECT_TOWN_TRADE): +1 Happiness per Resource tile in the
// town, plus +5 Trade Route range (shown as a pill next to the focus name).

import { ETFI_YIELDS, TRADE_ROUTE_ICON, countResourceTiles } from "../../etfi-utilities.js";

const HAPPINESS_PER_RESOURCE = 1;
const TRADE_RANGE = 5;

export function buildTradeModel(city) {
  const { groups, total } = countResourceTiles(city);
  const rows = groups.map((g) => ({
    iconId: g.iconId,
    name: g.name,
    count: g.count,
    yields: [{ yieldType: ETFI_YIELDS.HAPPINESS, value: g.count * HAPPINESS_PER_RESOURCE }],
  }));
  return {
    header: [
      { yieldType: ETFI_YIELDS.HAPPINESS, value: total * HAPPINESS_PER_RESOURCE },
      { yieldType: TRADE_ROUTE_ICON, value: TRADE_RANGE },
    ],
    rows,
  };
}
