// File Path: ui/etfi-town-focus/hub-town.js
//
// Author: Zatygold
//
// Hub Town (PROJECT_TOWN_INN): +1 Influence per Settlement connected to this
// Town. Split into connected Cities and Towns, with the names as sub-text.

import { ETFI_YIELDS, getConnectedSettlements, composeWithFallback } from "../../etfi-utilities.js";

const INFLUENCE_PER = 1;
const HUB_ICONS = { CITY: "CITY_URBAN", TOWN: "CITY_RURAL" };

export function buildHubModel(city) {
  const { cities, towns } = getConnectedSettlements(city);
  const total = (cities.length + towns.length) * INFLUENCE_PER;
  const rows = [];
  if (cities.length) {
    rows.push({
      iconId: HUB_ICONS.CITY,
      name: composeWithFallback("LOC_MOD_ETFI_CONNECTED_CITIES", "Cities"),
      count: cities.length,
      yields: [{ yieldType: ETFI_YIELDS.INFLUENCE, value: cities.length * INFLUENCE_PER }],
      subText: cities.join(" • "),
    });
  }
  if (towns.length) {
    rows.push({
      iconId: HUB_ICONS.TOWN,
      name: composeWithFallback("LOC_MOD_ETFI_CONNECTED_TOWNS", "Towns"),
      count: towns.length,
      yields: [{ yieldType: ETFI_YIELDS.INFLUENCE, value: towns.length * INFLUENCE_PER }],
      subText: towns.join(" • "),
    });
  }
  return {
    header: [{ yieldType: ETFI_YIELDS.INFLUENCE, value: total }],
    rows,
  };
}
