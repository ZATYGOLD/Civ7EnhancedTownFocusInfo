// File Path: ui/etfi-town-focus/factory-town.js
//
// Author: Zatygold
//
// Factory Town (PROJECT_TOWN_FACTORY, Modern): +1 Resource Slot and +5 Trade
// Route range (pills by the name), +100% Gold toward Factory/Port/Rail Station.
// Lists the town's Factory Resources, split by improved vs unimproved.

import { ETFI_YIELDS, TRADE_ROUTE_ICON, RESOURCE_ICON, getFactoryResources, composeWithFallback } from "../../etfi-utilities.js";

const TRADE_RANGE = 5;
const RESOURCE_SLOT = 1;

export function buildFactoryModel(city) {
  const { improved, unimproved } = getFactoryResources(city);

  const sections = [];
  if (improved.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_IMPROVED", "Improved"),
      rows: improved.map((r) => ({ iconId: r.iconId, name: r.name, count: r.count })),
    });
  }
  if (unimproved.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_UNIMPROVED", "Unimproved"),
      rows: unimproved.map((r) => ({ iconId: r.iconId, name: r.name, count: r.count })),
    });
  }

  return {
    header: [
      { yieldType: RESOURCE_ICON, value: RESOURCE_SLOT },
      { yieldType: TRADE_ROUTE_ICON, value: TRADE_RANGE },
    ],
    rows: [],
    sections,
    notes: ["+100% [icon:YIELD_GOLD] Gold towards purchasing a Factory, Port, or Rail Station"],
  };
}
